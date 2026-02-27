import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type CreateCheckoutOptions = {
  pack: "100" | "500" | "1000";
  testMode?: boolean;
};

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      options: CreateCheckoutOptions | "100" | "500" | "1000"
    ) => {
      const pack = typeof options === "string" ? options : options.pack;
      const explicitTestMode =
        typeof options === "string" ? undefined : options.testMode;
      const {
        data: { session },
        error: refreshError,
      } = await supabase.auth.refreshSession();
      if (refreshError)
        throw new Error("Session expired. Please sign in again.");
      if (!session?.access_token) throw new Error("Not authenticated");

      const envTestMode =
        import.meta.env.VITE_STRIPE_TEST_MODE === "true" ||
        import.meta.env.VITE_STRIPE_TEST_MODE === "1";
      const testMode = explicitTestMode ?? envTestMode;
      const { data, error } = await supabase.functions.invoke<{
        url?: string;
        error?: string;
      }>("create-checkout-session", { body: { pack, testMode } });
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
