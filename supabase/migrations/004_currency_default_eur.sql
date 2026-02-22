-- Set default currency to EUR for assets and price_cache
ALTER TABLE assets ALTER COLUMN currency SET DEFAULT 'EUR';
ALTER TABLE price_cache ALTER COLUMN currency SET DEFAULT 'EUR';
