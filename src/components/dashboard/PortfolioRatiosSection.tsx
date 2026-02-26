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
    riskLevel === "high" ? "Alto" : riskLevel === "medium" ? "Medio" : "Bajo";
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
          Ratios y métricas de riesgo
        </CardTitle>
        <CardDescription>
          Indicadores de rendimiento y riesgo (las que requieren historial de
          precios aparecen como N/A)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <RatioRow
            title="Ratio de Sharpe"
            value={
              historyLoading ? (
                <span className="text-muted-foreground text-base font-normal">
                  Cargando…
                </span>
              ) : typeof sharpe === "number" && !Number.isNaN(sharpe) ? (
                sharpe.toFixed(2)
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )
            }
            explanation="Mide el rendimiento ajustado al riesgo: cuánto exceso de rentabilidad obtienes por cada unidad de volatilidad. Se calcula como (rentabilidad media − tipo libre de riesgo) / volatilidad. Requiere series históricas de rendimientos para calcular la volatilidad."
            shortDescription="Rentabilidad ajustada al riesgo. Requiere historial de precios."
            icon={TrendingUp}
          />
          <RatioRow
            title="Volatilidad"
            value={
              historyLoading ? (
                <span className="text-muted-foreground text-base font-normal">
                  Cargando…
                </span>
              ) : typeof volatility === "number" &&
                !Number.isNaN(volatility) ? (
                `${(volatility * 100).toFixed(2)}%`
              ) : (
                <span className="text-muted-foreground">N/A</span>
              )
            }
            explanation="La volatilidad es la desviación típica de los rendimientos en el tiempo; indica cuánto puede variar el valor del portfolio. Una volatilidad alta implica más incertidumbre. Requiere precios históricos para su cálculo."
            shortDescription="Variabilidad de los rendimientos. Requiere precios históricos."
            icon={BarChart3}
          />
          <RatioRow
            title="Riesgo (perfil estimado)"
            value={<span className={riskColor}>{riskLabel}</span>}
            explanation="Estimación a partir de tu asignación por tipo de activo: más peso en crypto o acciones suele implicar mayor riesgo; más peso en efectivo o metales preciosos, menor. No sustituye al análisis con datos históricos."
            shortDescription="Estimado por la mezcla de activos (crypto/acciones = más riesgo)."
            icon={BarChart3}
          />
          <RatioRow
            title="Concentración"
            value={
              totalValue > 0 && topType ? (
                <>
                  {concentrationPct.toFixed(0)}%{" "}
                  <span className="text-sm font-normal text-muted-foreground">
                    (máx. {topType.type.replace("_", " ")})
                  </span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )
            }
            explanation="Porcentaje del portfolio en la clase de activo con mayor peso. Una concentración muy alta (p. ej. >70%) reduce los beneficios de la diversificación."
            shortDescription="Peso de la clase de activo con mayor valor. Más del 70% implica poca diversificación."
            icon={Layers}
          />
          <RatioRow
            title="Retorno (ROI)"
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
            explanation="Return on Investment: ganancia o pérdida porcentual respecto al coste total invertido. ROI = (valor actual − coste) / coste × 100."
            shortDescription="Ganancia o pérdida % sobre el coste total invertido."
            icon={TrendingUp}
          />
        </div>
      </CardContent>
    </Card>
  );
}
