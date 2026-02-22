export type AssetType =
  | "stock"
  | "etf"
  | "fund"
  | "crypto"
  | "commodity"
  | "mineral"
  | "precious_metals"
  | "real_estate"
  | "fiat"
  | "other";

export interface StockMetadata {
  ticker?: string;
  isin?: string;
  exchange?: string;
}

export type StakingType = "flex" | "fixed";

export interface CryptoMetadata {
  symbol?: string;
  coingecko_id?: string;
  staking_enabled?: boolean;
  staking_type?: StakingType;
  staking_apy?: number;
  staking_end_date?: string;
}

export type InterestRateType = "fixed" | "variable" | "mixed";

export interface RealEstateMetadata {
  sqm?: number;
  property_type?: "apartment" | "house" | "land" | "commercial";
  is_rented?: boolean;
  monthly_rent?: number;
  annual_expenses?: number;
  interest_rate?: number;
  interest_rate_type?: InterestRateType;
  location?: string;
}

export interface CommodityMetadata {
  ticker?: string;
  unit?: string;
  storage_location?: string;
}

export type PreciousMetal = "gold" | "silver";
export type PreciousMetalForm = "bar" | "coin";

export interface PreciousMetalsMetadata {
  metal?: PreciousMetal;
  form?: PreciousMetalForm;
  weight_oz?: number;
  purity?: string;
  storage_location?: string;
}

export interface FiatMetadata {
  interest_rate?: number;
}

export type AssetMetadata =
  | StockMetadata
  | CryptoMetadata
  | RealEstateMetadata
  | CommodityMetadata
  | PreciousMetalsMetadata
  | FiatMetadata
  | Record<string, unknown>;

export interface Asset {
  id: string;
  user_id: string;
  asset_type: AssetType;
  name: string;
  purchase_price: number;
  purchase_date: string;
  quantity: number;
  currency: string;
  notes?: string;
  metadata: AssetMetadata;
  created_at: string;
  updated_at: string;
}

export interface AssetWithPrice extends Asset {
  current_price?: number;
  current_value?: number;
  roi?: number;
}
