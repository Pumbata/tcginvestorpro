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

    // Get PokemonTCG.io API key from user_api_keys table
    const { data: apiKeys, error: apiKeyError } = await supabaseClient
      .from('user_api_keys')
      .select('api_key')
      .eq('service', 'pokemontcg')
      .eq('is_active', true)
      .single()

    if (apiKeyError || !apiKeys) {
      return new Response(
        JSON.stringify({ error: 'PokemonTCG.io API key not found' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const pokemonApiKey = apiKeys.api_key

    // Fetch sets from PokemonTCG.io
    console.log('Fetching sets from PokemonTCG.io...')
    const setsResponse = await fetch('https://api.pokemontcg.io/v2/sets', {
      headers: {
        'X-Api-Key': pokemonApiKey
      }
    })

    if (!setsResponse.ok) {
      throw new Error(`Failed to fetch sets: ${setsResponse.statusText}`)
    }

    const setsData = await setsResponse.json()
    console.log(`Found ${setsData.data.length} sets`)

    // Insert sets into database
    const setsToInsert = setsData.data.map((set: any) => ({
      id: set.id,
      name: set.name,
      series: set.series,
      total: set.total,
      release_date: set.releaseDate,
      legal_standard: set.legalities?.standard || 'unknown',
      symbol_url: set.images?.symbol,
      logo_url: set.images?.logo,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: setsError } = await supabaseClient
      .from('sets')
      .upsert(setsToInsert, { onConflict: 'id' })

    if (setsError) {
      console.error('Error inserting sets:', setsError)
      throw setsError
    }

    console.log(`Successfully inserted ${setsToInsert.length} sets`)

    // Fetch cards from PokemonTCG.io (limit to first 100 for initial population)
    console.log('Fetching cards from PokemonTCG.io...')
    const cardsResponse = await fetch('https://api.pokemontcg.io/v2/cards?pageSize=100', {
      headers: {
        'X-Api-Key': pokemonApiKey
      }
    })

    if (!cardsResponse.ok) {
      throw new Error(`Failed to fetch cards: ${cardsResponse.statusText}`)
    }

    const cardsData = await cardsResponse.json()
    console.log(`Found ${cardsData.data.length} cards`)

    // Insert cards into database
    const cardsToInsert = cardsData.data.map((card: any) => ({
      id: card.id,
      name: card.name,
      set_id: card.set.id,
      number: card.number,
      rarity: card.rarity,
      images: card.images,
      tcgplayer_id: card.tcgplayer?.id || null,
      cardmarket_id: card.cardmarket?.id || null,
      legal_standard: card.legalities?.standard || 'unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    const { error: cardsError } = await supabaseClient
      .from('cards')
      .upsert(cardsToInsert, { onConflict: 'id' })

    if (cardsError) {
      console.error('Error inserting cards:', cardsError)
      throw cardsError
    }

    console.log(`Successfully inserted ${cardsToInsert.length} cards`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        sets_inserted: setsToInsert.length,
        cards_inserted: cardsToInsert.length,
        message: 'Database populated successfully' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error populating database:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
