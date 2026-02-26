import { formatCurrency } from "@/lib/utils";

interface CategoryItem {
  type: string;
  value: number;
  cost: number;
}

interface CategoryDistributionProps {
  byType: CategoryItem[];
  totalValue: number;
}

const COLORS = [
  "linear-gradient(to right, #6366f1, #818cf8)",
  "linear-gradient(to right, #3b82f6, #60a5fa)",
  "linear-gradient(to right, #10b981, #34d399)",
  "linear-gradient(to right, #f59e0b, #fbbf24)",
  "linear-gradient(to right, #ec4899, #f472b6)",
  "linear-gradient(to right, #8b5cf6, #a78bfa)",
];

export function CategoryDistribution({
  byType,
  totalValue,
}: CategoryDistributionProps) {
  if (byType.length === 0) return null;

  return (
    <div className="space-y-4">
      {byType.map((item, index) => {
        const pct = totalValue > 0 ? (item.value / totalValue) * 100 : 0;
        return (
          <div key={item.type} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium capitalize">
                  {item.type.replace("_", " ")}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div className="h-2.5 rounded-full overflow-hidden bg-muted">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    background: COLORS[index % COLORS.length],
                  }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatCurrency(item.value, "EUR")}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
