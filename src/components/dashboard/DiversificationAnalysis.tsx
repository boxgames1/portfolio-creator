import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import type { DiversificationInsight } from "@/lib/portfolioAnalysis";

function getSentimentIcon(sentiment: DiversificationInsight["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    case "warning":
      return <AlertTriangle className="h-4 w-4 text-amber-600" />;
    default:
      return <Info className="h-4 w-4 text-muted-foreground" />;
  }
}

function getSentimentColor(sentiment: DiversificationInsight["sentiment"]) {
  switch (sentiment) {
    case "positive":
      return "text-green-600";
    case "warning":
      return "text-amber-600";
    default:
      return "text-muted-foreground";
  }
}

interface DiversificationAnalysisProps {
  insights: DiversificationInsight[];
}

export function DiversificationAnalysis({
  insights,
}: DiversificationAnalysisProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, index) => (
        <div
          key={index}
          className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 shrink-0 rounded-lg p-2 ${
                insight.sentiment === "positive"
                  ? "bg-green-50 dark:bg-green-950/30"
                  : insight.sentiment === "warning"
                  ? "bg-amber-50 dark:bg-amber-950/30"
                  : "bg-muted"
              }`}
            >
              {getSentimentIcon(insight.sentiment)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="font-semibold text-sm">{insight.title}</h4>
                <span
                  className={`font-bold text-sm shrink-0 ${getSentimentColor(
                    insight.sentiment
                  )}`}
                >
                  {insight.value}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {insight.description}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
