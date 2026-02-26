import { useQuery } from "@tanstack/react-query";
import { useAssets } from "./useAssets";
import { usePortfolioValue } from "./usePortfolioValue";
import { supabase } from "@/lib/supabase";
import {
  dailyReturns,
  annualizedVolatility,
  sharpeRatio,
} from "@/lib/portfolioHistory";

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

export interface PortfolioHistoryResult {
  series: PortfolioHistoryPoint[];
  /** Annualized volatility (e.g. 0.15 = 15%). NaN if not enough data. */
  volatility: number;
  /** Sharpe ratio (annualized, rf 2.5%). NaN if not enough data. */
  sharpeRatio: number;
}

const MIN_POINTS = 21;

function buildHistoryAssets(
  assets: NonNullable<ReturnType<typeof useAssets>["data"]>,
  portfolio:
    | NonNullable<ReturnType<typeof usePortfolioValue>["data"]>
    | undefined
): {
  identifier: string;
  asset_type: string;
  quantity: number;
  currency: string;
  constantValue?: number;
}[] {
  if (!assets.length) return [];
  return assets.map((a) => {
    const meta = a.metadata as Record<string, unknown>;
    let identifier = "";
    if (["stock", "etf", "fund", "commodity"].includes(a.asset_type)) {
      identifier = (meta?.ticker as string) || (meta?.isin as string) || a.name;
    } else if (a.asset_type === "crypto") {
      identifier =
        (meta?.coingecko_id as string) || (meta?.symbol as string) || a.name;
    } else if (a.asset_type === "real_estate") {
      identifier = `re-${a.id}`;
    } else if (a.asset_type === "precious_metals") {
      identifier = (meta?.metal as string) || "gold";
    } else if (
      a.asset_type === "fiat" ||
      a.asset_type === "private_equity" ||
      a.asset_type === "other" ||
      a.asset_type === "mineral"
    ) {
      identifier = a.name;
    } else {
      identifier = a.name;
    }
    const currency = (a.currency || "eur").toLowerCase();
    const quantity = a.quantity;
    let constantValue: number | undefined;
    if (
      ["real_estate", "fiat", "private_equity"].includes(a.asset_type) &&
      portfolio
    ) {
      const pw = portfolio.assetsWithPrices.find((p) => p.id === a.id);
      constantValue = pw?.currentValue ?? a.purchase_price * a.quantity;
    }
    return {
      identifier,
      asset_type: a.asset_type,
      quantity,
      currency,
      ...(constantValue !== undefined && constantValue >= 0
        ? { constantValue }
        : {}),
    };
  });
}

export function usePortfolioHistory(): {
  data: PortfolioHistoryResult | null;
  isLoading: boolean;
  isError: boolean;
} {
  const { data: assets } = useAssets();
  const { data: portfolio } = usePortfolioValue();

  const historyAssets =
    assets && assets.length > 0 && assets.length <= 15
      ? buildHistoryAssets(assets, portfolio)
      : [];
  const hasFetchable = historyAssets.some(
    (a) =>
      !["real_estate", "fiat", "private_equity"].includes(a.asset_type) ||
      a.constantValue !== undefined
  );

  const query = useQuery({
    queryKey: ["portfolio-history", JSON.stringify(historyAssets)],
    queryFn: async (): Promise<PortfolioHistoryResult> => {
      const { data, error } = await supabase.functions.invoke<{
        series: PortfolioHistoryPoint[];
      }>("fetch-portfolio-history", {
        body: { assets: historyAssets },
      });
      if (error) throw error;
      const series = data?.series ?? [];
      const values = series
        .map((p) => p.value)
        .filter((v) => typeof v === "number" && v > 0);
      if (values.length < MIN_POINTS) {
        return {
          series,
          volatility: NaN,
          sharpeRatio: NaN,
        };
      }
      const returns = dailyReturns(values);
      const vol = annualizedVolatility(returns);
      const sharpe = sharpeRatio(returns);
      return {
        series,
        volatility: vol,
        sharpeRatio: sharpe,
      };
    },
    enabled: hasFetchable,
    staleTime: 1000 * 60 * 60, // 1h
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
