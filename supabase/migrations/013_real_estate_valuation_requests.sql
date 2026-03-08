-- Real estate valuation requests (AI-generated estimates)
-- Each request is stored for history; no caching as input varies
CREATE TABLE real_estate_valuation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input TEXT NOT NULL,
  response TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE real_estate_valuation_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own real estate valuation requests"
  ON real_estate_valuation_requests
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE done by Edge Function with service role
CREATE INDEX idx_real_estate_valuation_requests_user_created
  ON real_estate_valuation_requests(user_id, created_at DESC);

COMMENT ON TABLE real_estate_valuation_requests IS 'AI real estate valuation requests; inserted by Edge Function after processing';
