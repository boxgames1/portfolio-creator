/**
 * Portfolio analysis utilities for diversification and risk alerts.
 * Inspired by Portfolens insight/risk logic.
 */

export interface RiskAlert {
  title: string;
  description: string;
  recommendation?: string;
  severity: "high" | "medium" | "low";
}

export interface DiversificationInsight {
  title: string;
  value: string;
  description: string;
  sentiment: "positive" | "warning" | "info";
}

const CONCENTRATION_HIGH = 70;
const CONCENTRATION_MEDIUM = 50;

export function buildRiskAlerts(
  byType: { type: string; value: number }[],
  totalValue: number
): RiskAlert[] {
  const alerts: RiskAlert[] = [];

  if (totalValue <= 0) return alerts;

  const sorted = [...byType].sort((a, b) => b.value - a.value);
  const topType = sorted[0];
  const topPct = (topType.value / totalValue) * 100;
  const typeLabel = topType.type.replace("_", " ");

  if (topPct >= CONCENTRATION_HIGH) {
    alerts.push({
      title: `High ${typeLabel} concentration`,
      description: `${topPct.toFixed(
        0
      )}% of your portfolio is in ${typeLabel}. This reduces diversification benefits.`,
      recommendation:
        typeLabel.toLowerCase().includes("equity") ||
        typeLabel.toLowerCase().includes("stock") ||
        typeLabel.toLowerCase().includes("crypto")
          ? "Consider adding bonds, gold, or cash to balance risk."
          : "Consider diversifying across other asset classes.",
      severity: "high",
    });
  } else if (topPct >= CONCENTRATION_MEDIUM) {
    alerts.push({
      title: `Moderate ${typeLabel} concentration`,
      description: `${topPct.toFixed(
        0
      )}% of your portfolio is in ${typeLabel}.`,
      recommendation: "Monitor allocation and consider rebalancing over time.",
      severity: "medium",
    });
  }

  if (byType.length === 1 && totalValue > 0) {
    alerts.push({
      title: "Single asset class",
      description: "Your portfolio holds only one asset type.",
      recommendation:
        "Consider diversifying across stocks, bonds, crypto, or real estate.",
      severity: "medium",
    });
  }

  return alerts;
}

export function buildDiversificationInsights(
  byType: { type: string; value: number }[],
  totalValue: number,
  assetCount: number
): DiversificationInsight[] {
  const insights: DiversificationInsight[] = [];

  const categoryCount = byType.length;
  if (categoryCount >= 5) {
    insights.push({
      title: "Category diversity",
      value: `${categoryCount} categories`,
      description: "Good category diversity across your portfolio.",
      sentiment: "positive",
    });
  } else if (categoryCount >= 3) {
    insights.push({
      title: "Category diversity",
      value: `${categoryCount} categories`,
      description: "Moderate diversity. Consider adding more asset types.",
      sentiment: "info",
    });
  } else {
    insights.push({
      title: "Category diversity",
      value: `${categoryCount} categories`,
      description: "Limited diversity. Diversification can help manage risk.",
      sentiment: "warning",
    });
  }

  if (assetCount >= 5) {
    insights.push({
      title: "Portfolio size",
      value: `${assetCount} assets`,
      description: "Well-sized portfolio with good diversification potential.",
      sentiment: "positive",
    });
  } else if (assetCount >= 2) {
    insights.push({
      title: "Portfolio size",
      value: `${assetCount} assets`,
      description: "Consider adding more positions to spread risk.",
      sentiment: "info",
    });
  }

  const sorted = [...byType].sort((a, b) => b.value - a.value);
  const topType = sorted[0];
  const topPct = totalValue > 0 ? (topType.value / totalValue) * 100 : 0;

  insights.push({
    title: "Asset allocation",
    value: `${topPct.toFixed(0)}% ${topType.type.replace("_", " ")}`,
    description: `Primary allocation: ${sorted
      .slice(0, 3)
      .map(
        (t) =>
          `${t.type.replace("_", " ")} (${(
            (t.value / totalValue) *
            100
          ).toFixed(0)}%)`
      )
      .join(", ")}.`,
    sentiment: topPct >= CONCENTRATION_HIGH ? "warning" : "info",
  });

  return insights;
}

/** Percentage of portfolio in the single largest asset type (by value). */
export function getConcentrationTopPct(
  byType: { type: string; value: number }[],
  totalValue: number
): number {
  if (!byType.length || totalValue <= 0) return 0;
  const sorted = [...byType].sort((a, b) => b.value - a.value);
  return (sorted[0].value / totalValue) * 100;
}

/** Rough risk level of asset types for allocation-based estimate. */
const RISK_WEIGHT: Record<string, number> = {
  crypto: 1.5,
  stock: 1,
  etf: 0.9,
  fund: 0.85,
  commodity: 0.8,
  mineral: 0.75,
  real_estate: 0.6,
  private_equity: 0.7,
  precious_metals: 0.5,
  other: 0.5,
  fiat: 0.1,
};

/**
 * Estimated risk profile from allocation (no historical data).
 * Weighted average of risk by type; then bucketed into low/medium/high.
 */
export function getEstimatedRiskLevel(
  byType: { type: string; value: number }[],
  totalValue: number
): "low" | "medium" | "high" {
  if (!byType.length || totalValue <= 0) return "low";
  let weighted = 0;
  for (const { type, value } of byType) {
    const w = RISK_WEIGHT[type] ?? 0.5;
    weighted += (value / totalValue) * w;
  }
  if (weighted >= 0.85) return "high";
  if (weighted >= 0.5) return "medium";
  return "low";
}
