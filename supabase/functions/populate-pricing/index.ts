import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get API keys from user_api_keys table
    const { data: priceChartingKey, error: priceChartingError } = await supabaseClient
      .from('user_api_keys')
      .select('api_key')
      .eq('service', 'pricecharting')
      .eq('is_active', true)
      .single()

    const { data: pokemonPriceTrackerKey, error: pokemonPriceTrackerError } = await supabaseClient
      .from('user_api_keys')
      .select('api_key')
      .eq('service', 'pokemonpricetracker')
      .eq('is_active', true)
      .single()

    if (priceChartingError || !priceChartingKey) {
      return new Response(
        JSON.stringify({ error: 'PriceCharting API key not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get cards that need pricing data
    const { data: cards, error: cardsError } = await supabaseClient
      .from('cards')
      .select('id, name, tcgplayer_id, cardmarket_id')
      .limit(50) // Process 50 cards at a time

    if (cardsError) {
      throw cardsError
    }

    console.log(`Processing pricing for ${cards.length} cards`)

    const pricingDataToInsert = []

    for (const card of cards) {
      try {
        // Fetch pricing from PriceCharting.com
        if (card.tcgplayer_id) {
          const priceChartingResponse = await fetch(
            `https://www.pricecharting.com/api/product?t=${priceChartingKey.api_key}&id=${card.tcgplayer_id}`,
            {
              headers: {
                'User-Agent': 'TCG Investor Pro/1.0'
              }
            }
          )

          if (priceChartingResponse.ok) {
            const priceData = await priceChartingResponse.json()
            
            pricingDataToInsert.push({
              card_id: card.id,
              source: 'pricecharting',
              ungraded_price: priceData.price || null,
              psa_10_price: priceData.psa10 || null,
              psa_9_price: priceData.psa9 || null,
              psa_8_price: priceData.psa8 || null,
              last_updated: new Date().toISOString()
            })
          }
        }

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        console.error(`Error fetching pricing for card ${card.id}:`, error)
        continue
      }
    }

    // Insert pricing data
    if (pricingDataToInsert.length > 0) {
      const { error: pricingError } = await supabaseClient
        .from('pricing_data')
        .upsert(pricingDataToInsert, { onConflict: 'card_id,source' })

      if (pricingError) {
        console.error('Error inserting pricing data:', pricingError)
        throw pricingError
      }
    }

    console.log(`Successfully inserted pricing for ${pricingDataToInsert.length} cards`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        cards_processed: cards.length,
        pricing_inserted: pricingDataToInsert.length,
        message: 'Pricing data populated successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error populating pricing data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
