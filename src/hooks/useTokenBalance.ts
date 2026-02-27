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
        .select("id, amount, balance_after, kind, reference, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}
