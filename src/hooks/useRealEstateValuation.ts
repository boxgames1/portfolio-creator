import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { throwIfInsufficientTokens } from "@/lib/tokenErrors";

interface RealEstateValuationResponse {
  response: string;
}

export function useRealEstateValuation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: string) => {
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();
      if (refreshError)
        throw new Error("Session expired. Please sign in again.");
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke<
        RealEstateValuationResponse & { code?: string }
      >("real-estate-valuation", {
        body: { input: input.trim() },
      });
      throwIfInsufficientTokens(data, error);
      if (error) throw error;
      if (!data?.response) throw new Error("Invalid response");
      return data.response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });
      queryClient.invalidateQueries({ queryKey: ["token-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["token-spending-breakdown"] });
    },
  });
}
