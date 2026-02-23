import { useQuery } from "@tanstack/react-query";
import { useAssets } from "./useAssets";
import { supabase } from "@/lib/supabase";

interface PriceResponse {
  [key: string]: { price: number; source: string };
}

function priceKey(identifier: string, currency: string, assetType?: string) {
  const curr = (currency || "eur").toLowerCase();
  // Crypto and precious_metals keys are normalized to lowercase to match fetch-prices
  const id =
    assetType === "crypto" || assetType === "precious_metals"
      ? identifier.trim().toLowerCase()
      : identifier;
  return `${id}-${curr}`;
}

interface PortfolioValue {
  totalValue: number;
  totalCost: number;
  byType: { type: string; value: number; cost: number }[];
        assetsWithPrices: {
          id: string;
          currentPrice?: number;
          currentValue?: number;
          costInEur?: number;
          roi?: number;
        }[];
}

export function usePortfolioValue() {
  const { data: assets } = useAssets();

  return useQuery({
    queryKey: [
      "portfolio",
      assets?.map((a) => `${a.id}-${a.quantity}`).join(","),
    ],
    queryFn: async (): Promise<PortfolioValue> => {
      if (!assets || assets.length === 0) {
        return {
          totalValue: 0,
          totalCost: 0,
          byType: [],
          assetsWithPrices: [],
        };
      }

      const priceRequests = assets
        .filter((a) => a.asset_type !== "fiat")
        .map((a) => {
          const meta = a.metadata as Record<string, unknown>;
          let identifier = "";
          if (["stock", "etf", "fund", "commodity"].includes(a.asset_type)) {
            // Prioritize ISIN for stocks, ETFs, funds (more reliable for price lookup)
            identifier =
              (meta?.isin as string) || (meta?.ticker as string) || a.name;
          } else if (a.asset_type === "crypto") {
            identifier =
              (meta?.coingecko_id as string) ||
              (meta?.symbol as string) ||
              a.name;
          } else if (a.asset_type === "real_estate") {
            identifier = `re-${a.id}`;
          } else if (a.asset_type === "precious_metals") {
            identifier =
              (meta?.metal as string) || a.name.toLowerCase() || "gold";
          } else {
            identifier = a.name;
          }
          return {
            identifier,
            asset_type: a.asset_type,
            currency: "eur", // Always fetch prices in EUR
          };
        });

      // Fetch USD→EUR rate if any assets are in USD (for cost conversion to EUR)
      let usdToEur = 0.92;
      const hasUsdAssets = assets.some(
        (a) => (a.currency || "eur").toLowerCase() === "usd"
      );
      if (hasUsdAssets) {
        try {
          const res = await fetch(
            "https://api.exchangerate-api.com/v4/latest/USD"
          );
          const data = (await res.json()) as { rates?: { EUR?: number } };
          usdToEur = data.rates?.EUR ?? 0.92;
        } catch {
          /* use default */
        }
      }

      let prices: PriceResponse = {};
      try {
        const { data, error } = await supabase.functions.invoke<PriceResponse>(
          "fetch-prices",
          {
            body: { requests: priceRequests },
          }
        );
        if (!error && data) {
          prices = data;
        }
      } catch {
        // Fallback: use purchase price if fetch fails
      }

      let totalValue = 0;
      let totalCost = 0;
      const byTypeMap = new Map<string, { value: number; cost: number }>();
      const assetsWithPrices: PortfolioValue["assetsWithPrices"] = [];

      const now = new Date();

      for (const asset of assets) {
        let cost = asset.purchase_price * asset.quantity;
        const assetCurrency = (asset.currency || "eur").toLowerCase();
        if (assetCurrency === "usd") {
          cost = cost * usdToEur;
        }
        totalCost += cost;

        let currentPrice: number;
        let currentValue: number;

        if (asset.asset_type === "fiat") {
          const interestRate = (asset.metadata as Record<string, unknown>)
            ?.interest_rate as number | undefined;
          const purchaseDate = new Date(asset.purchase_date);
          const yearsHeld =
            (now.getTime() - purchaseDate.getTime()) /
            (365.25 * 24 * 60 * 60 * 1000);
          const growthFactor =
            interestRate != null && interestRate > 0
              ? 1 + (interestRate / 100) * Math.max(0, yearsHeld)
              : 1;
          currentPrice = growthFactor;
          currentValue = asset.quantity * growthFactor;
          if (assetCurrency === "usd") {
            currentValue = currentValue * usdToEur;
          }
        } else {
          const meta = asset.metadata as Record<string, unknown>;
          let identifier = "";
          if (
            ["stock", "etf", "fund", "commodity"].includes(asset.asset_type)
          ) {
            // Prioritize ISIN for stocks, ETFs, funds (more reliable for price lookup)
            identifier =
              (meta?.isin as string) || (meta?.ticker as string) || asset.name;
          } else if (asset.asset_type === "crypto") {
            identifier =
              (meta?.coingecko_id as string) ||
              (meta?.symbol as string) ||
              asset.name;
          } else if (asset.asset_type === "real_estate") {
            identifier = `re-${asset.id}`;
          } else if (asset.asset_type === "precious_metals") {
            identifier =
              (meta?.metal as string) || asset.name.toLowerCase() || "gold";
          } else {
            identifier = asset.name;
          }

          const priceData =
            prices[priceKey(identifier, "eur", asset.asset_type)];
          currentPrice = priceData?.price ?? asset.purchase_price;
          currentValue = currentPrice * asset.quantity;
        }

        totalValue += currentValue;

        const roi = cost > 0 ? ((currentValue - cost) / cost) * 100 : 0;

        const typeKey = asset.asset_type;
        const existing = byTypeMap.get(typeKey) ?? { value: 0, cost: 0 };
        byTypeMap.set(typeKey, {
          value: existing.value + currentValue,
          cost: existing.cost + cost,
        });

        assetsWithPrices.push({
          id: asset.id,
          currentPrice,
          currentValue,
          costInEur: cost,
          roi,
        });
      }

      const byType = Array.from(byTypeMap.entries()).map(
        ([type, { value, cost }]) => ({
          type,
          value,
          cost,
        })
      );

      return {
        totalValue,
        totalCost,
        byType,
        assetsWithPrices,
      };
    },
    enabled: !!assets && assets.length > 0,
  });
}
