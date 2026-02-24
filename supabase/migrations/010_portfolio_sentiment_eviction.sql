-- Eviction functions for AI caches (run on insert or via pg_cron if available)

CREATE OR REPLACE FUNCTION evict_old_portfolio_sentiment()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM portfolio_sentiment_cache
  WHERE created_at < now() - interval '7 days';
$$;

CREATE OR REPLACE FUNCTION evict_old_ai_suggestions()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM ai_suggestion_cache
  WHERE created_at < now() - interval '7 days';
$$;

CREATE OR REPLACE FUNCTION evict_old_real_estate_estimations()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM price_cache
  WHERE asset_type = 'real_estate'
    AND fetched_at < now() - interval '7 days';
$$;

-- Optional: if pg_cron is enabled (Supabase Pro), uncomment to run daily:
-- SELECT cron.schedule('evict-caches', '0 3 * * *', $$
--   SELECT evict_old_portfolio_sentiment();
--   SELECT evict_old_ai_suggestions();
--   SELECT evict_old_real_estate_estimations();
-- $$);
