import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pack: "100" | "500" | "1000") => {
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();
      if (refreshError)
        throw new Error("Session expired. Please sign in again.");
      if (!session?.access_token) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke<{
        url?: string;
        error?: string;
      }>("create-checkout-session", { body: { pack } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.url) throw new Error("No checkout URL returned");
      return data.url;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["token-balance"] });
    },
  });
}
