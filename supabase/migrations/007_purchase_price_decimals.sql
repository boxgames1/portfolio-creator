-- Allow more than 2 decimals on purchase_price (e.g. for crypto, precious metals)
ALTER TABLE assets
  ALTER COLUMN purchase_price TYPE DECIMAL(20, 8);
