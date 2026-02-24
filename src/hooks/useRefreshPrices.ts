import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import type { Asset } from "@/types";

function buildPriceRequests(assets: Asset[]) {
  return assets
    .filter((a) => a.asset_type !== "fiat")
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
      if (requests.length === 0) return;
      const { error } = await supabase.functions.invoke("fetch-prices", {
        body: { requests, forceRefresh: true },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      toast.success("Prices refreshed");
    },
    onError: () => {
      toast.error("Failed to refresh prices");
    },
  });
}
