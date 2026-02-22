-- Add fiat asset type for currency in interest-bearing accounts
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'fiat';
