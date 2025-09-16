# Deploy Supabase Edge Functions

## Prerequisites

1. **Install Supabase CLI**:
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref vckwqetuufrcsyuxrxzy
   ```

## Deploy Functions

1. **Deploy populate-cards function**:
   ```bash
   supabase functions deploy populate-cards
   ```

2. **Deploy populate-pricing function**:
   ```bash
   supabase functions deploy populate-pricing
   ```

## Alternative: Manual Setup

If you prefer not to use the CLI, you can manually create these functions in the Supabase dashboard:

1. **Go to Supabase Dashboard** → Your Project → Edge Functions
2. **Create New Function**:
   - Name: `populate-cards`
   - Copy the code from `supabase/functions/populate-cards/index.ts`
3. **Create New Function**:
   - Name: `populate-pricing`
   - Copy the code from `supabase/functions/populate-pricing/index.ts`

## Usage

1. **Open the admin tool**: Visit `https://tcginvestorpro.com/admin-populate.html`
2. **Click "Populate Cards & Sets"** to fetch and insert card/set data
3. **Click "Populate Pricing Data"** to fetch and insert pricing information
4. **Click "Check Database Status"** to see current data counts

## API Keys Required

Make sure you have added these API keys to your `user_api_keys` table:

- **PokemonTCG.io API Key** (service: 'pokemontcg')
- **PriceCharting API Key** (service: 'pricecharting')
- **PokemonPriceTracker API Key** (service: 'pokemonpricetracker')

## Troubleshooting

- **Function not found**: Make sure the functions are deployed successfully
- **API key errors**: Verify your API keys are stored in the `user_api_keys` table
- **Rate limiting**: The functions include delays to avoid API rate limits
- **CORS issues**: The functions include proper CORS headers for web requests
