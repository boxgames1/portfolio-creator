import { useQuery } from "@tanstack/react-query";

interface FearGreedDataPoint {
  value: string;
  value_classification: string;
  timestamp: string;
}

interface FearGreedResponse {
  name: string;
  data: FearGreedDataPoint[];
  metadata: { error: string | null };
}

const FNG_URL = "https://api.alternative.me/fng/?limit=30";

export function useFearGreed() {
  return useQuery({
    queryKey: ["fear-greed"],
    queryFn: async (): Promise<FearGreedResponse> => {
      const res = await fetch(FNG_URL);
      if (!res.ok) throw new Error("Failed to fetch Fear & Greed");
      return res.json();
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}

export function getFngLabel(value: number): string {
  if (value <= 24) return "Extreme Fear";
  if (value <= 44) return "Fear";
  if (value <= 54) return "Neutral";
  if (value <= 74) return "Greed";
  return "Extreme Greed";
}

export function getFngColor(value: number): string {
  if (value <= 24) return "#dc2626"; // red
  if (value <= 44) return "#f97316"; // orange
  if (value <= 54) return "#eab308"; // yellow
  if (value <= 74) return "#22c55e"; // green
  return "#16a34a"; // dark green
}
