import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NormalizedAISuggestionResponse, AISuggestionItem } from "@/types";

export const LATEST_AI_SUGGESTION_QUERY_KEY = ["latestAISuggestion"] as const;

function normalizeSuggestions(raw: unknown): AISuggestionItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) =>
    typeof s === "string"
      ? { text: s, priority: "medium" as const }
      : {
          text: (s as { text?: string }).text ?? String(s),
          priority: ((s as { priority?: string }).priority === "high" ||
          (s as { priority?: string }).priority === "low"
            ? (s as { priority: "high" | "low" }).priority
            : "medium") as "high" | "medium" | "low",
        }
  );
}

export function useLatestAISuggestion() {
  return useQuery({
    queryKey: LATEST_AI_SUGGESTION_QUERY_KEY,
    queryFn: async (): Promise<NormalizedAISuggestionResponse | null> => {
      const { data, error } = await supabase
        .from("ai_suggestion_cache")
        .select("response, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data?.response) return null;

      const r = data.response as Record<string, unknown>;
      const suggestions = normalizeSuggestions(r.suggestions);
      if (
        suggestions.length === 1 &&
        suggestions[0].text === "Unable to parse AI response."
      ) {
        return null;
      }
      return {
        rating: (r.rating as number) ?? 0,
        strengths: Array.isArray(r.strengths) ? r.strengths : [],
        weaknesses: Array.isArray(r.weaknesses) ? r.weaknesses : [],
        suggestions,
      };
    },
  });
}
