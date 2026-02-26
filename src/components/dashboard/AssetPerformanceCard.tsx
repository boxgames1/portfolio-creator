import { formatCurrency } from "@/lib/utils";
import type { Asset } from "@/types";

interface AssetPerformanceCardProps {
  asset: Asset;
  cost: number;
  currentValue: number;
  roi: number;
}

export function AssetPerformanceCard({
  asset,
  cost,
  currentValue,
  roi,
}: AssetPerformanceCardProps) {
  const barWidth = Math.min(Math.max(Math.abs(roi) * 5, 5), 100);

  return (
    <div className="rounded-lg border bg-muted/30 p-5 transition-colors hover:bg-muted/50">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold">{asset.name}</h3>
          <p className="text-sm text-muted-foreground">
            Invested: {formatCurrency(cost, "EUR")}
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-xl font-bold ${
              roi >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {roi >= 0 ? "+" : ""}
            {roi.toFixed(2)}%
          </div>
          <p className="text-xs text-muted-foreground">
            Value: {formatCurrency(currentValue, "EUR")}
          </p>
        </div>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden bg-muted">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${barWidth}%`,
            background:
              roi >= 10
                ? "linear-gradient(to right, #22c55e, #16a34a)"
                : roi >= 0
                ? "linear-gradient(to right, #3b82f6, #2563eb)"
                : "linear-gradient(to right, #ef4444, #dc2626)",
          }}
        />
      </div>
    </div>
  );
}
