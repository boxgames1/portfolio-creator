import { useState } from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { AssetTypeFilter } from "@/components/assets/AssetTypeFilter";
import type { AssetType } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAssets } from "@/hooks/useAssets";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useFearGreed, getFngLabel, getFngColor } from "@/hooks/useFearGreed";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];

export function DashboardPage() {
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [excludeRealEstate, setExcludeRealEstate] = useState(false);
  const { data: assets, isLoading } = useAssets();
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioValue();
  const aiSuggestions = useAISuggestions();
  const { data: fearGreed, isLoading: fearGreedLoading } = useFearGreed();

  const filteredAssets =
    assets?.filter((a) => {
      if (excludeRealEstate && a.asset_type === "real_estate") return false;
      return typeFilter === "all" || a.asset_type === typeFilter;
    }) ?? [];

  const filteredPortfolio =
    portfolio && (typeFilter !== "all" || excludeRealEstate)
      ? (() => {
          const filteredIds = new Set(filteredAssets.map((a) => a.id));
          const filteredWithPrices = portfolio.assetsWithPrices.filter((p) =>
            filteredIds.has(p.id)
          );
          const totalValue = filteredWithPrices.reduce(
            (sum, p) => sum + (p.currentValue ?? 0),
            0
          );
          const filteredAssetsData = filteredAssets;
          const totalCost = filteredAssetsData.reduce(
            (sum, a) => sum + a.purchase_price * a.quantity,
            0
          );
          const byTypeMap = new Map<string, { value: number; cost: number }>();
          for (const p of filteredWithPrices) {
            const asset = filteredAssetsData.find((a) => a.id === p.id);
            if (!asset) continue;
            const value =
              p.currentValue ?? asset.purchase_price * asset.quantity;
            const cost = asset.purchase_price * asset.quantity;
            const existing = byTypeMap.get(asset.asset_type) ?? {
              value: 0,
              cost: 0,
            };
            byTypeMap.set(asset.asset_type, {
              value: existing.value + value,
              cost: existing.cost + cost,
            });
          }
          const byType = Array.from(byTypeMap.entries()).map(
            ([type, { value, cost }]) => ({ type, value, cost })
          );
          return {
            totalValue,
            totalCost,
            byType,
            assetsWithPrices: filteredWithPrices,
          };
        })()
      : portfolio;

  if (isLoading || portfolioLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const displayPortfolio = filteredPortfolio ?? portfolio;
  const totalWorth = displayPortfolio?.totalValue ?? 0;
  const totalCost = displayPortfolio?.totalCost ?? 0;
  const roi = totalCost > 0 ? ((totalWorth - totalCost) / totalCost) * 100 : 0;

  const handleGetAIRating = () => {
    aiSuggestions.mutate(
      {
        totalValue: totalWorth,
        totalCost,
        roi,
        byType:
          displayPortfolio?.byType?.map((t) => ({
            type: t.type,
            value: t.value,
          })) ?? [],
      },
      {
        onSuccess: () => setAiModalOpen(true),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to get AI rating"
          ),
      }
    );
  };

  const chartData =
    displayPortfolio?.byType?.map((item, i) => ({
      name: item.type,
      value: item.value,
      color: COLORS[i % COLORS.length],
    })) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your portfolio
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <AssetTypeFilter value={typeFilter} onChange={setTypeFilter} />
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={excludeRealEstate}
              onChange={(e) => setExcludeRealEstate(e.target.checked)}
              className="rounded border-input"
            />
            Without real estate
          </label>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Portfolio Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalWorth)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{formatCurrency(totalCost)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ROI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-3xl font-bold ${
                roi >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {roi >= 0 ? "+" : ""}
              {roi.toFixed(1)}%
            </p>
            <p
              className={`mt-1 text-sm ${
                totalWorth >= totalCost ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalWorth >= totalCost ? "+" : ""}
              {formatCurrency(totalWorth - totalCost)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={handleGetAIRating}
          disabled={aiSuggestions.isPending || totalWorth === 0}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          {aiSuggestions.isPending
            ? "Analyzing..."
            : "Get AI Rating & Suggestions"}
        </Button>
      </div>

      {!fearGreedLoading &&
        fearGreed?.data &&
        fearGreed.data.length > 0 &&
        (() => {
          const fg = fearGreed;
          const current = fg.data[0];
          const chartData = [...fg.data].reverse().map((d) => ({
            value: Number(d.value),
            date: new Date(Number(d.timestamp) * 1000).toLocaleDateString(
              "en-US",
              { month: "short", day: "numeric" }
            ),
          }));
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Market Sentiment
                </CardTitle>
                <CardDescription>
                  Fear & Greed Index – crypto market sentiment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4 md:flex-row md:items-start">
                  <div className="flex shrink-0 items-center gap-4">
                    <div
                      className="flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                      style={{
                        backgroundColor: `${getFngColor(
                          Number(current.value)
                        )}20`,
                        color: getFngColor(Number(current.value)),
                      }}
                    >
                      {current.value}
                    </div>
                    <div>
                      <p className="font-medium">
                        {getFngLabel(Number(current.value))}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        0 = Extreme Fear, 100 = Extreme Greed
                      </p>
                    </div>
                  </div>
                  <div className="h-32 flex-1 min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient
                            id="fngGradient"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor={getFngColor(Number(current.value))}
                              stopOpacity={0.3}
                            />
                            <stop
                              offset="95%"
                              stopColor={getFngColor(Number(current.value))}
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value} – ${getFngLabel(value)}`,
                            "Index",
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke="#888"
                          strokeWidth={1}
                          fill="url(#fngGradient)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })()}

      {chartData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Asset Allocation</CardTitle>
            <CardDescription>Distribution by asset type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {(!filteredAssets || filteredAssets.length === 0) && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground mb-4">
              No assets yet. Add your first asset to get started.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>AI Portfolio Rating</DialogTitle>
          </DialogHeader>
          {aiSuggestions.data && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-4xl font-bold">
                  {aiSuggestions.data.rating}/10
                </span>
                <span className="text-muted-foreground">rating</span>
              </div>
              <div>
                <h4 className="font-medium mb-2">Suggestions</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {aiSuggestions.data.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
