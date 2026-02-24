import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface PortfolioSentimentResponse {
  value: number;
  explanation: string;
}

export function getSentimentLabel(value: number): string {
  if (value <= 24) return "Extreme Fear";
  if (value <= 44) return "Fear";
  if (value <= 54) return "Neutral";
  if (value <= 74) return "Greed";
  return "Extreme Greed";
}

export function getSentimentColor(value: number): string {
  if (value <= 24) return "#dc2626";
  if (value <= 44) return "#f97316";
  if (value <= 54) return "#eab308";
  if (value <= 74) return "#22c55e";
  return "#16a34a";
}

export function usePortfolioSentiment(input: {
  portfolio: {
    totalValue: number;
    totalCost: number;
    roi: number;
    byType: { type: string; value: number }[];
  };
  assets?: Array<{
    name: string;
    asset_type: string;
    identifier: string;
    cost: number;
    currentValue: number;
    roi: number;
  }>;
}) {
  return useQuery({
    queryKey: [
      "portfolio-sentiment",
      input.portfolio.totalValue,
      input.portfolio.totalCost,
      JSON.stringify(input.portfolio.byType),
    ],
    queryFn: async (): Promise<PortfolioSentimentResponse> => {
      const { data, error } =
        await supabase.functions.invoke<PortfolioSentimentResponse>(
          "get-portfolio-sentiment",
          { body: input }
        );
      if (error) throw error;
      if (!data) throw new Error("No sentiment response");
      return data;
    },
    enabled:
      input.portfolio.totalValue > 0 &&
      (input.portfolio.byType?.length ?? 0) > 0,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
