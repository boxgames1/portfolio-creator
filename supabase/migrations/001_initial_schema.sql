-- Asset type enum
CREATE TYPE asset_type AS ENUM (
  'stock', 'etf', 'fund', 'crypto', 'commodity',
  'mineral', 'real_estate', 'other'
);

-- Main assets table (polymorphic with metadata for type-specific fields)
CREATE TABLE assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  asset_type asset_type NOT NULL,
  name TEXT NOT NULL,
  purchase_price DECIMAL(20, 4) NOT NULL,
  purchase_date DATE NOT NULL,
  quantity DECIMAL(20, 8) NOT NULL DEFAULT 1,
  currency TEXT NOT NULL DEFAULT 'USD',
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Price cache (reduces API rate limits)
CREATE TABLE price_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  asset_type asset_type NOT NULL,
  price DECIMAL(20, 8) NOT NULL,
  currency TEXT DEFAULT 'USD',
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(identifier, asset_type)
);

-- AI suggestion cache
CREATE TABLE ai_suggestion_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cache_key TEXT NOT NULL,
  response JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_suggestion_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own assets" ON assets
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Price cache readable by authenticated" ON price_cache
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can read own AI cache" ON ai_suggestion_cache
  FOR SELECT USING (auth.uid() = user_id);

CREATE INDEX idx_assets_user_type ON assets(user_id, asset_type);
CREATE INDEX idx_price_cache_identifier ON price_cache(identifier, asset_type);
CREATE INDEX idx_price_cache_fetched ON price_cache(fetched_at);
