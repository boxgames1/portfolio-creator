import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useTokenBalance() {
  return useQuery({
    queryKey: ["token-balance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_token_balance")
        .select("balance")
        .maybeSingle();
      if (error) throw error;
      return data?.balance ?? 0;
    },
  });
}

export function useTokenTransactions(limit = 30) {
  return useQuery({
    queryKey: ["token-transactions", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_transactions")
        .select(
          "id, amount, balance_after, kind, reference, metadata, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

const REFERENCE_LABELS: Record<string, string> = {
  portfolio_chat: "Portfolio / Warren AI chat",
  ai_suggestions: "AI rating & suggestions",
  portfolio_sentiment: "Sentiment analysis",
  real_estate_estimate: "Real estate estimate",
};

export function getReferenceLabel(reference: string): string {
  return REFERENCE_LABELS[reference] ?? reference.replace(/_/g, " ");
}

export function useTokenSpendingBreakdown() {
  return useQuery({
    queryKey: ["token-spending-breakdown"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("token_transactions")
        .select("amount, reference")
        .eq("kind", "usage");
      if (error) throw error;
      const byRef: Record<string, number> = {};
      for (const row of data ?? []) {
        const ref = row.reference ?? "other";
        byRef[ref] = (byRef[ref] ?? 0) + Math.abs(row.amount);
      }
      return Object.entries(byRef)
        .map(([reference, tokens]) => ({
          reference,
          label: getReferenceLabel(reference),
          tokens,
        }))
        .filter((x) => x.tokens > 0)
        .sort((a, b) => b.tokens - a.tokens);
    },
  });
}
