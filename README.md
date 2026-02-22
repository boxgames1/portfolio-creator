# Portfolio Creator

A Vite + React portfolio tracking app with Supabase (auth, DB), multiple asset types, real-time valuation via external APIs, and AI suggestions.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   - Copy `.env.example` to `.env`
   - Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` from your Supabase project
   - Add `VITE_GOOGLE_CLIENT_ID` if using Google OAuth (configure in Supabase Dashboard > Auth > Providers)

3. **Database**

   - Run the migration in Supabase SQL Editor or via Supabase CLI:
     ```bash
     supabase db push
     ```
   - Or paste `supabase/migrations/001_initial_schema.sql` into the SQL Editor

4. **Supabase Auth**

   - Disable signup: Dashboard > Authentication > User Signups > toggle off
   - Add users manually via Dashboard or enable a provider (Google, etc.)

5. **Edge Functions** (for price fetching and AI)

   ```bash
   supabase functions deploy fetch-prices --no-verify-jwt
   supabase functions deploy get-ai-suggestions
   ```

   (`fetch-prices` uses `--no-verify-jwt` to avoid 401 Invalid JWT - it only returns public market data)

   Set secrets:

   ```bash
   supabase secrets set TIINGO_API_KEY=your_key   # Stock/ETF prices (tried first)
   supabase secrets set FINNHUB_API_KEY=your_key  # Fallback for stock/ETF prices
   supabase secrets set OPENAI_API_KEY=your_key
   ```

6. **Run**
   ```bash
   npm run dev
   ```

## API Keys

- **Tiingo**: Free at [tiingo.com](https://www.tiingo.com) for stock/ETF prices (primary)
- **Finnhub**: Free at [finnhub.io](https://finnhub.io) for stock/ETF prices (fallback)
- **CoinGecko**: No key needed for free tier (~30 req/min)
- **OpenAI**: For AI suggestions and real estate estimation
