import { CheckCircle, Info, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface PerformanceInsightsProps {
  roi: number;
  totalCost: number;
  totalValue: number;
  topPerformer?: { name: string; roi: number };
  assetCount: number;
}

export function PerformanceInsights({
  roi,
  totalCost,
  totalValue,
  topPerformer,
  assetCount,
}: PerformanceInsightsProps) {
  const returnLabel =
    roi >= 15
      ? "Strong returns. Portfolio is performing well."
      : roi >= 5
      ? "Moderate returns. There may be room for optimization."
      : roi >= 0
      ? "Modest returns. Consider reviewing allocation."
      : "Negative returns. Review underperformers.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-muted">
            <Info className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm">Return overview</h4>
            <p
              className={`text-2xl font-bold mt-1 ${
                roi >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {roi >= 0 ? "+" : ""}
              {roi.toFixed(2)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">{returnLabel}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-green-50 dark:bg-green-950/30">
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm">Portfolio value</h4>
            <p className="text-2xl font-bold mt-1">
              {formatCurrency(totalValue, "EUR")}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(totalValue - totalCost, "EUR")} gain vs{" "}
              {formatCurrency(totalCost, "EUR")} invested
            </p>
          </div>
        </div>
      </div>

      {topPerformer && topPerformer.roi > 0 && (
        <div className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-green-50 dark:bg-green-950/30">
              <CheckCircle className="h-4 w-4 text-green-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-sm">Top performer</h4>
              <p className="font-medium mt-1 text-green-600">
                {topPerformer.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Best performing asset with {topPerformer.roi >= 0 ? "+" : ""}
                {topPerformer.roi.toFixed(2)}% returns
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-lg border bg-muted/30 p-4 transition-colors hover:bg-muted/50">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 rounded-lg p-2 bg-green-50 dark:bg-green-950/30">
            <CheckCircle className="h-4 w-4 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-semibold text-sm">Portfolio size</h4>
            <p className="text-2xl font-bold mt-1">
              {assetCount} {assetCount === 1 ? "asset" : "assets"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {assetCount >= 5
                ? "Well-sized portfolio with good diversification potential."
                : "Consider adding more positions to spread risk."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
