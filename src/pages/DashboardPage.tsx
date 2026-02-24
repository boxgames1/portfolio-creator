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
import { useLatestAISuggestion } from "@/hooks/useLatestAISuggestion";
import {
  usePortfolioSentiment,
  getSentimentLabel,
  getSentimentColor,
} from "@/hooks/usePortfolioSentiment";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/utils";
import { toast } from "sonner";
import { GlossarySection } from "@/components/GlossaryTooltip";
import type { AISuggestionItem } from "@/types";

function normalizeAIData(
  data: {
    rating?: number;
    strengths?: string[];
    weaknesses?: string[];
    suggestions?: string[] | AISuggestionItem[];
  } | null
) {
  if (!data) return null;
  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.map((s) =>
        typeof s === "string" ? { text: s, priority: "medium" as const } : s
      )
    : [];
  return {
    rating: data.rating ?? 0,
    strengths: data.strengths ?? [],
    weaknesses: data.weaknesses ?? [],
    suggestions,
  };
}

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
  const { data: latestSuggestion, isLoading: latestSuggestionLoading } =
    useLatestAISuggestion();
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

  const displayPortfolio = filteredPortfolio ?? portfolio;
  const totalWorth = displayPortfolio?.totalValue ?? 0;
  const totalCost = displayPortfolio?.totalCost ?? 0;
  const roi = totalCost > 0 ? ((totalWorth - totalCost) / totalCost) * 100 : 0;

  const sentimentInput = displayPortfolio
    ? {
        portfolio: {
          totalValue: totalWorth,
          totalCost,
          roi,
          byType:
            displayPortfolio.byType?.map((t) => ({
              type: t.type,
              value: t.value,
            })) ?? [],
        },
        assets:
          displayPortfolio.assetsWithPrices && filteredAssets
            ? filteredAssets
                .map((a) => {
                  const pw = displayPortfolio!.assetsWithPrices!.find(
                    (p) => p.id === a.id
                  );
                  if (!pw) return null;
                  const meta = a.metadata as Record<string, unknown>;
                  let identifier = "";
                  if (
                    ["stock", "etf", "fund", "commodity"].includes(a.asset_type)
                  ) {
                    identifier =
                      (meta?.isin as string) ||
                      (meta?.ticker as string) ||
                      a.name;
                  } else if (a.asset_type === "crypto") {
                    identifier =
                      (meta?.coingecko_id as string) ||
                      (meta?.symbol as string) ||
                      a.name;
                  } else {
                    identifier = a.name;
                  }
                  return {
                    name: a.name,
                    asset_type: a.asset_type,
                    identifier,
                    cost: pw.costInEur ?? a.purchase_price * a.quantity,
                    currentValue:
                      pw.currentValue ?? a.purchase_price * a.quantity,
                    roi: pw.roi ?? 0,
                  };
                })
                .filter((x): x is NonNullable<typeof x> => x !== null)
            : undefined,
      }
    : null;

  const { data: portfolioSentiment, isLoading: sentimentLoading } =
    usePortfolioSentiment(
      sentimentInput ?? {
        portfolio: { totalValue: 0, totalCost: 0, roi: 0, byType: [] },
      }
    );

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

  const handleGetAIRating = () => {
    const assetsForAI =
      displayPortfolio?.assetsWithPrices && filteredAssets
        ? filteredAssets
            .map((a) => {
              const pw = displayPortfolio.assetsWithPrices.find(
                (p) => p.id === a.id
              );
              if (!pw) return null;
              const meta = a.metadata as Record<string, unknown>;
              let identifier = "";
              if (
                ["stock", "etf", "fund", "commodity"].includes(a.asset_type)
              ) {
                identifier =
                  (meta?.isin as string) || (meta?.ticker as string) || a.name;
              } else if (a.asset_type === "crypto") {
                identifier =
                  (meta?.coingecko_id as string) ||
                  (meta?.symbol as string) ||
                  a.name;
              } else {
                identifier = a.name;
              }
              return {
                name: a.name,
                asset_type: a.asset_type,
                identifier,
                cost: pw.costInEur ?? a.purchase_price * a.quantity,
                currentValue: pw.currentValue ?? a.purchase_price * a.quantity,
                roi: pw.roi ?? 0,
              };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
        : undefined;

    aiSuggestions.mutate(
      {
        portfolio: {
          totalValue: totalWorth,
          totalCost,
          roi,
          byType:
            displayPortfolio?.byType?.map((t) => ({
              type: t.type,
              value: t.value,
            })) ?? [],
        },
        assets: assetsForAI,
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

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4" />
              AI Portfolio Rating
            </CardTitle>
            <CardDescription>
              {latestSuggestion
                ? "Your most recent portfolio analysis"
                : "Get AI-powered insights and suggestions"}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetAIRating}
            disabled={aiSuggestions.isPending || totalWorth === 0}
            className="shrink-0"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {aiSuggestions.isPending
              ? "Analyzing..."
              : latestSuggestion
              ? "Refresh AI Portfolio Rating"
              : "Get AI Rating & Suggestions"}
          </Button>
        </CardHeader>
        {latestSuggestionLoading ? (
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        ) : latestSuggestion ? (
          <CardContent
            className="cursor-pointer pt-0 transition-colors hover:bg-muted/30  rounded-b-lg px-6 pb-6"
            onClick={() => setAiModalOpen(true)}
          >
            <div className="space-y-4">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {latestSuggestion.rating}/10
                </span>
                <span className="text-sm text-muted-foreground">rating</span>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {latestSuggestion.suggestions.slice(0, 2).map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 mt-1.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                    <span>{s.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Click to view full analysis
            </p>
          </CardContent>
        ) : (
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Analyze your portfolio allocation, get a rating, and receive
              personalized suggestions.
            </p>
          </CardContent>
        )}
      </Card>

      {!sentimentLoading && portfolioSentiment && totalWorth > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Portfolio Sentiment
            </CardTitle>
            <CardDescription>
              Fear & Greed – inferred from your allocation across all assets (0
              = Extreme Fear, 100 = Extreme Greed)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <details className="mb-4 group">
              <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                What drives this?
              </summary>
              <p className="mt-2 text-xs text-muted-foreground">
                AI analyzes your portfolio composition: allocation by asset type
                (stocks, ETFs, crypto, real estate, cash), diversification, risk
                level, and concentration. Heavy cash/fiat suggests fear;
                aggressive equity/crypto suggests greed. Based on your actual
                holdings, not external market data.
              </p>
            </details>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-bold"
                style={{
                  backgroundColor: `${getSentimentColor(
                    portfolioSentiment.value
                  )}20`,
                  color: getSentimentColor(portfolioSentiment.value),
                }}
              >
                {portfolioSentiment.value}
              </div>
              <div className="flex-1">
                <p className="font-medium">
                  {getSentimentLabel(portfolioSentiment.value)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {portfolioSentiment.explanation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>AI Portfolio Rating</DialogTitle>
          </DialogHeader>
          {(() => {
            const data = normalizeAIData(
              aiSuggestions.data ?? latestSuggestion ?? null
            );
            if (!data) return null;
            const sortedSuggestions = [...data.suggestions].sort((a, b) => {
              const order = { high: 0, medium: 1, low: 2 };
              return order[a.priority] - order[b.priority];
            });
            return (
              <div className="space-y-6">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold">{data.rating}/10</span>
                  <span className="text-muted-foreground">rating</span>
                </div>
                {data.strengths.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-green-700 dark:text-green-400">
                      Strengths
                    </h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {data.strengths.map((s, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-green-600 dark:text-green-500">
                            ✓
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.weaknesses.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2 text-amber-700 dark:text-amber-400">
                      Weaknesses
                    </h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {data.weaknesses.map((w, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-amber-600 dark:text-amber-500">
                            !
                          </span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <h4 className="font-medium mb-2">Suggestions</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {sortedSuggestions.map((s, i) => (
                      <li key={i} className="flex gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                            s.priority === "high"
                              ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                              : s.priority === "low"
                              ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}
                        >
                          {s.priority}
                        </span>
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <GlossarySection
                  terms={["REITs", "ETF", "ROI"]}
                  suggestions={data.suggestions}
                />
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
