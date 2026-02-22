-- Add precious_metals asset type for physical gold & silver bars & coins
ALTER TYPE asset_type ADD VALUE IF NOT EXISTS 'precious_metals';
