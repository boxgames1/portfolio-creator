import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AISuggestionResponse } from "@/types";
import { LATEST_AI_SUGGESTION_QUERY_KEY } from "./useLatestAISuggestion";

export function useAISuggestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
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
    }): Promise<AISuggestionResponse> => {
      const { data, error } =
        await supabase.functions.invoke<AISuggestionResponse>(
          "get-ai-suggestions",
          { body: input }
        );
      if (error) throw error;
      if (!data) throw new Error("No response from AI");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: LATEST_AI_SUGGESTION_QUERY_KEY,
      });
    },
  });
}
