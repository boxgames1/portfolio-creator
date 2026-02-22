-- Add currency to price_cache unique constraint to support multi-currency caching (crypto)
ALTER TABLE price_cache DROP CONSTRAINT IF EXISTS price_cache_identifier_asset_type_key;
ALTER TABLE price_cache ADD CONSTRAINT price_cache_identifier_asset_type_currency_key
  UNIQUE (identifier, asset_type, currency);
