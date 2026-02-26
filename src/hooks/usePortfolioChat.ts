import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PortfolioChatContext {
  totalValue: number;
  totalCost: number;
  roi: number;
  byType: { type: string; value: number }[];
  assets?: Array<{
    name: string;
    asset_type: string;
    cost: number;
    currentValue: number;
    roi: number;
  }>;
}

interface PortfolioChatResponse {
  message: { role: "assistant"; content: string };
}

export function usePortfolioChat(
  portfolioContext: PortfolioChatContext | null,
  options?: { mode?: "default" | "warren" }
) {
  const mode = options?.mode ?? "default";
  return useMutation({
    mutationFn: async (messages: ChatMessage[]) => {
      const ctx =
        portfolioContext ??
        (mode === "warren"
          ? {
              totalValue: 0,
              totalCost: 0,
              roi: 0,
              byType: [] as { type: string; value: number }[],
              assets: [] as Array<{
                name: string;
                asset_type: string;
                cost: number;
                currentValue: number;
                roi: number;
              }>,
            }
          : null);
      if (!ctx) throw new Error("No portfolio context");
      const { data, error } =
        await supabase.functions.invoke<PortfolioChatResponse>(
          "portfolio-chat",
          {
            body: {
              messages,
              portfolioContext: ctx,
              ...(mode === "warren" ? { mode: "warren" as const } : {}),
            },
          }
        );
      if (error) throw error;
      if (!data?.message) throw new Error("Invalid response");
      return data.message;
    },
  });
}
