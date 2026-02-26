import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Asset } from "@/types";

type PriceResponse = {
  [key: string]: { price: number; source: string };
};

type PortfolioValue = {
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
};

function buildPriceRequests(assets: Asset[]) {
  return assets
    .filter((a) => a.asset_type !== "fiat" && a.asset_type !== "private_equity")
    .map((a) => {
      const meta = a.metadata as Record<string, unknown>;
      let identifier = "";
      if (["stock", "etf", "fund", "commodity"].includes(a.asset_type)) {
        identifier =
          (meta?.isin as string) || (meta?.ticker as string) || a.name;
      } else if (a.asset_type === "crypto") {
        identifier =
          (meta?.coingecko_id as string) || (meta?.symbol as string) || a.name;
      } else if (a.asset_type === "real_estate") {
        identifier = `re-${a.id}`;
      } else if (a.asset_type === "precious_metals") {
        identifier = (meta?.metal as string) || a.name.toLowerCase() || "gold";
      } else {
        identifier = a.name;
      }
      return {
        identifier,
        asset_type: a.asset_type,
        currency: "eur",
      };
    });
}

export function useRefreshPrices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assets: Asset[]) => {
      const requests = buildPriceRequests(assets);
      if (requests.length === 0) return null;
      const { data, error } = await supabase.functions.invoke<PriceResponse>(
        "fetch-prices",
        {
          body: { requests, forceRefresh: true },
        }
      );
      if (error) throw error;
      return { data: data ?? null, assets };
    },
    onSuccess: (result) => {
      if (!result) return;
      const { data, assets } = result;

      // If we updated multiple assets at once, fall back to full refetch
      if (!data || !assets || assets.length !== 1) {
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        toast.success("Prices refreshed");
        return;
      }

      const asset = assets[0];
      const firstKey = Object.keys(data)[0];
      const priceEntry = data[firstKey];
      if (!priceEntry || typeof priceEntry.price !== "number") {
        queryClient.invalidateQueries({ queryKey: ["portfolio"] });
        toast.success("Prices refreshed");
        return;
      }

      // Update any active portfolio queries in-place so we don't call fetch-prices again
      const queries = queryClient.getQueriesData<PortfolioValue>({
        queryKey: ["portfolio"],
      });

      queries.forEach(([key, prev]) => {
        if (!prev) return;
        const entry = prev.assetsWithPrices.find((p) => p.id === asset.id);
        if (!entry || entry.costInEur == null) return;

        const oldValue = entry.currentValue ?? entry.costInEur;
        const newPrice = priceEntry.price;
        const newValue = newPrice * asset.quantity;
        const delta = newValue - oldValue;

        const newTotalValue = prev.totalValue + delta;
        const newRoi =
          entry.costInEur > 0
            ? ((newValue - entry.costInEur) / entry.costInEur) * 100
            : 0;

        const newAssetsWithPrices = prev.assetsWithPrices.map((p) =>
          p.id === asset.id
            ? {
                ...p,
                currentPrice: newPrice,
                currentValue: newValue,
                roi: newRoi,
              }
            : p
        );

        const newByType = prev.byType.map((t) => {
          if (t.type !== asset.asset_type) return t;
          return {
            ...t,
            value: t.value + delta,
          };
        });

        queryClient.setQueryData<PortfolioValue>(key, {
          ...prev,
          totalValue: newTotalValue,
          byType: newByType,
          assetsWithPrices: newAssetsWithPrices,
        });
      });
    },
    onError: () => {
      toast.error("Failed to refresh prices");
    },
  });
}
