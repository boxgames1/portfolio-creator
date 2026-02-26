import { useState } from "react";
import { FileDown, Sparkles, TrendingUp } from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";
import { exportPortfolioToPdf } from "@/lib/exportPortfolioPdf";
import { toast } from "sonner";
import { GlossarySection } from "@/components/GlossaryTooltip";
import type { AISuggestionItem } from "@/types";
import {
  buildRiskAlerts,
  buildDiversificationInsights,
} from "@/lib/portfolioAnalysis";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { AllocationDonutChart } from "@/components/dashboard/AllocationDonutChart";
import { AssetPerformanceCard } from "@/components/dashboard/AssetPerformanceCard";
import { DiversificationAnalysis } from "@/components/dashboard/DiversificationAnalysis";
import { RiskAlerts } from "@/components/dashboard/RiskAlerts";
import { CategoryDistribution } from "@/components/dashboard/CategoryDistribution";
import { PerformanceInsights } from "@/components/dashboard/PerformanceInsights";
import { PortfolioChat } from "@/components/dashboard/PortfolioChat";
import { PortfolioRatiosSection } from "@/components/dashboard/PortfolioRatiosSection";
import { usePortfolioHistory } from "@/hooks/usePortfolioHistory";

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
  const { data: portfolioHistory, isLoading: historyLoading } =
    usePortfolioHistory();

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
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              assets && portfolio && exportPortfolioToPdf(assets, portfolio)
            }
            disabled={!assets || assets.length === 0}
          >
            <FileDown className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
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

      {/* Summary banner */}
      {totalWorth > 0 && (
        <div
          className={`rounded-xl p-6 ${
            roi >= 10
              ? "bg-green-50/80 dark:bg-green-950/20 border border-green-200/50 dark:border-green-900/30"
              : roi >= 0
              ? "bg-amber-50/80 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30"
              : "bg-red-50/80 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30"
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
                  roi >= 10
                    ? "bg-green-200/80 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                    : roi >= 0
                    ? "bg-amber-200/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300"
                    : "bg-red-200/80 dark:bg-red-900/40 text-red-800 dark:text-red-300"
                }`}
              >
                {roi >= 10 ? "Strong" : roi >= 0 ? "Moderate" : "Negative"}{" "}
                growth
              </span>
              <p className="text-base text-muted-foreground">
                {roi >= 10
                  ? "Your portfolio is performing well."
                  : roi >= 0
                  ? "Consider reviewing underperformers."
                  : "Review your allocation and consider rebalancing."}
              </p>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalCost)}
                </div>
                <div className="text-xs text-muted-foreground">Invested</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">
                  {formatCurrency(totalWorth)}
                </div>
                <div className="text-xs text-muted-foreground">Current</div>
              </div>
              <div className="text-center">
                <div
                  className={`text-2xl font-bold ${
                    roi >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">Returns</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Invested"
          value={formatCurrency(totalCost)}
          subtext="Principal amount"
          icon="💰"
        />
        <MetricCard
          label="Current Value"
          value={formatCurrency(totalWorth)}
          subtext={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% overall`}
          icon="📈"
          subtextClassName={roi >= 0 ? "text-green-600" : "text-red-600"}
        />
        <MetricCard
          label="ROI"
          value={`${roi >= 0 ? "+" : ""}${roi.toFixed(1)}%`}
          subtext={`${totalWorth >= totalCost ? "+" : ""}${formatCurrency(
            totalWorth - totalCost
          )}`}
          icon="🎯"
          subtextClassName={
            totalWorth >= totalCost ? "text-green-600" : "text-red-600"
          }
        />
        <MetricCard
          label="Portfolio Size"
          value={`${filteredAssets.length} ${
            filteredAssets.length === 1 ? "asset" : "assets"
          }`}
          subtext={
            filteredAssets.length >= 5
              ? "Good diversification"
              : "Add more to diversify"
          }
          icon="📊"
        />
      </div>

      {/* Performance Insights */}
      {totalWorth > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Key metrics and highlights</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceInsights
              roi={roi}
              totalCost={totalCost}
              totalValue={totalWorth}
              topPerformer={
                displayPortfolio?.assetsWithPrices && filteredAssets.length > 0
                  ? (() => {
                      const withRoi = filteredAssets
                        .map((a) => {
                          const pw = displayPortfolio.assetsWithPrices.find(
                            (p) => p.id === a.id
                          );
                          return {
                            name: a.name,
                            roi: pw?.roi ?? 0,
                          };
                        })
                        .filter((x) => x.roi > 0);
                      const top = withRoi.sort((a, b) => b.roi - a.roi)[0];
                      return top ? { name: top.name, roi: top.roi } : undefined;
                    })()
                  : undefined
              }
              assetCount={filteredAssets.length}
            />
          </CardContent>
        </Card>
      )}

      {/* Ratios y métricas de riesgo */}
      {totalWorth > 0 && displayPortfolio?.byType && (
        <PortfolioRatiosSection
          byType={displayPortfolio.byType}
          totalValue={totalWorth}
          roi={roi}
          volatility={portfolioHistory?.volatility}
          sharpeRatio={portfolioHistory?.sharpeRatio}
          historyLoading={historyLoading}
        />
      )}

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

      {/* Portfolio chat */}
      <PortfolioChat
        portfolioContext={
          displayPortfolio && totalWorth >= 0
            ? {
                totalValue: totalWorth,
                totalCost,
                roi,
                byType: displayPortfolio.byType ?? [],
                assets:
                  displayPortfolio.assetsWithPrices && assets
                    ? assets
                        .filter((a) => a.asset_type !== "fiat")
                        .map((a) => {
                          const pw = displayPortfolio!.assetsWithPrices!.find(
                            (p) => p.id === a.id
                          );
                          const cost =
                            pw?.costInEur ?? a.purchase_price * a.quantity;
                          const currentValue =
                            pw?.currentValue ?? a.purchase_price * a.quantity;
                          const roiA = pw?.roi ?? 0;
                          return {
                            name: a.name,
                            asset_type: a.asset_type,
                            cost,
                            currentValue,
                            roi: roiA,
                          };
                        })
                    : undefined,
              }
            : null
        }
        disabled={!assets?.length}
      />

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

      {/* Allocation & Category Distribution */}
      {displayPortfolio?.byType && displayPortfolio.byType.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Asset Allocation</CardTitle>
              <CardDescription>
                Distribution across asset classes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AllocationDonutChart
                byType={displayPortfolio.byType}
                totalValue={totalWorth}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Category Distribution</CardTitle>
              <CardDescription>Asset types in your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <CategoryDistribution
                byType={displayPortfolio?.byType ?? []}
                totalValue={totalWorth}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Diversification Analysis */}
      {totalWorth > 0 &&
        displayPortfolio?.byType &&
        displayPortfolio.byType.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Diversification Analysis</CardTitle>
              <CardDescription>
                Portfolio composition and risk indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DiversificationAnalysis
                insights={buildDiversificationInsights(
                  displayPortfolio.byType,
                  totalWorth,
                  filteredAssets.length
                )}
              />
            </CardContent>
          </Card>
        )}

      {/* Risk Alerts */}
      {totalWorth > 0 && displayPortfolio?.byType && (
        <RiskAlerts
          alerts={buildRiskAlerts(
            displayPortfolio.byType.map((t) => ({
              type: t.type,
              value: t.value,
            })),
            totalWorth
          )}
        />
      )}

      {/* Individual Asset Performance */}
      {filteredAssets.length > 0 &&
        displayPortfolio?.assetsWithPrices &&
        totalWorth > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Asset Performance</CardTitle>
              <CardDescription>Individual asset returns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...filteredAssets]
                  .filter((a) => a.asset_type !== "fiat")
                  .map((asset) => {
                    const pw = displayPortfolio.assetsWithPrices.find(
                      (p) => p.id === asset.id
                    );
                    return { asset, roi: pw?.roi ?? 0 };
                  })
                  .sort((a, b) => b.roi - a.roi)
                  .slice(0, 8)
                  .map(({ asset, roi }) => {
                    const pw = displayPortfolio.assetsWithPrices.find(
                      (p) => p.id === asset.id
                    );
                    const cost =
                      pw?.costInEur ?? asset.purchase_price * asset.quantity;
                    const currentValue =
                      pw?.currentValue ?? asset.purchase_price * asset.quantity;
                    return (
                      <AssetPerformanceCard
                        key={asset.id}
                        asset={asset}
                        cost={cost}
                        currentValue={currentValue}
                        roi={roi}
                      />
                    );
                  })}
              </div>
              {filteredAssets.filter((a) => a.asset_type !== "fiat").length >
                8 && (
                <p className="text-sm text-muted-foreground mt-4">
                  Showing top 8 assets. View all on the Assets page.
                </p>
              )}
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
