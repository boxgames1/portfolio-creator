import { BarChart3, Info, Layers, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  getConcentrationTopPct,
  getEstimatedRiskLevel,
} from "@/lib/portfolioAnalysis";

interface ByTypeItem {
  type: string;
  value: number;
}

interface PortfolioRatiosSectionProps {
  byType: ByTypeItem[];
  totalValue: number;
  roi: number;
  /** From historical series (optional). If null/NaN, show N/A. */
  volatility?: number | null;
  /** From historical series (optional). If null/NaN, show N/A. */
  sharpeRatio?: number | null;
  /** True while history is loading and we might get vol/Sharpe. */
  historyLoading?: boolean;
}

function RatioRow({
  title,
  value,
  explanation,
  shortDescription,
  icon: Icon,
}: {
  title: string;
  value: React.ReactNode;
  explanation: string;
  shortDescription: string;
  icon: React.ElementType;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <Icon className="h-4 w-4" />
          {title}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-help text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p className="text-sm">{explanation}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="text-xl font-bold">{value}</div>
      <p className="text-xs text-muted-foreground">{shortDescription}</p>
    </div>
  );
}

export function PortfolioRatiosSection({
  byType,
  totalValue,
  roi,
  volatility = null,
  sharpeRatio: sharpe = null,
  historyLoading = false,
}: PortfolioRatiosSectionProps) {
  const concentrationPct = getConcentrationTopPct(byType, totalValue);
  const riskLevel = getEstimatedRiskLevel(byType, totalValue);
  const topType = byType.length
    ? [...byType].sort((a, b) => b.value - a.value)[0]
    : null;

  const riskLabel =
    riskLevel === "high" ? "High" : riskLevel === "medium" ? "Medium" : "Low";
  const riskColor =
    riskLevel === "high"
      ? "text-amber-600 dark:text-amber-400"
      : riskLevel === "medium"
      ? "text-blue-600 dark:text-blue-400"
      : "text-green-600 dark:text-green-400";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-4 w-4" />
          Ratios and risk metrics
        </CardTitle>
        <CardDescription>
          Performance and risk indicators (those requiring price history appear as N/A)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RatioRow
            title="Sharpe Ratio"
            value={
              historyLoading ? (
                <span className="text-muted-foreground text-base font-normal">
                  Loading…
                </span>
              ) : typeof sharpe === "number" && !Number.isNaN(sharpe) ? (
                sharpe.toFixed(2)
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )
            }
            explanation="Measures risk-adjusted return: how much excess return you get per unit of volatility. Formula: (average return − risk-free rate) / volatility. Requires historical return series to compute."
            shortDescription="Risk-adjusted return. Requires price history."
            icon={TrendingUp}
          />
          <RatioRow
            title="Volatility"
            value={
              historyLoading ? (
                <span className="text-muted-foreground text-base font-normal">
                  Loading…
                </span>
              ) : typeof volatility === "number" &&
                !Number.isNaN(volatility) ? (
                `${(volatility * 100).toFixed(2)}%`
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )
            }
            explanation="Volatility is the standard deviation of returns over time; it indicates how much your portfolio value may fluctuate. Higher volatility means more uncertainty. Requires historical prices to compute."
            shortDescription="Variability of returns. Requires historical prices."
            icon={BarChart3}
          />
          <RatioRow
            title="Risk (estimated profile)"
            value={<span className={riskColor}>{riskLabel}</span>}
            explanation="Estimated from your allocation by asset type: more weight in crypto or equities usually means higher risk; more in cash or precious metals, lower. Does not replace analysis with historical data."
            shortDescription="Estimated from asset mix (crypto/stocks = higher risk)."
            icon={BarChart3}
          />
          <RatioRow
            title="Concentration"
            value={
              totalValue > 0 && topType ? (
                <>
                  {concentrationPct.toFixed(0)}%{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (max. {topType.type.replace("_", " ")})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
            explanation="Share of your portfolio in the single largest asset class. Very high concentration (e.g. >70%) reduces diversification benefits."
            shortDescription="Weight of the largest asset class. Over 70% implies low diversification."
            icon={Layers}
          />
          <RatioRow
            title="Return (ROI)"
            value={
              <span
                className={
                  roi >= 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              >
                {roi >= 0 ? "+" : ""}
                {roi.toFixed(2)}%
              </span>
            }
            explanation="Return on Investment: percentage gain or loss relative to total cost invested. ROI = (current value − cost) / cost × 100."
            shortDescription="Gain or loss % on total amount invested."
            icon={TrendingUp}
          />
        </div>
      </CardContent>
    </Card>
  );
}
