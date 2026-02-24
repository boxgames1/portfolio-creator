-- Portfolio sentiment cache (AI-calculated fear & greed from allocation)
CREATE TABLE portfolio_sentiment_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE portfolio_sentiment_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sentiment cache" ON portfolio_sentiment_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_portfolio_sentiment_user_created
  ON portfolio_sentiment_cache (user_id, created_at DESC);
