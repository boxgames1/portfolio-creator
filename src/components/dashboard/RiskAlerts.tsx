import { AlertTriangle, Lightbulb } from "lucide-react";
import type { RiskAlert } from "@/lib/portfolioAnalysis";

interface RiskAlertsProps {
  alerts: RiskAlert[];
}

export function RiskAlerts({ alerts }: RiskAlertsProps) {
  if (alerts.length === 0) return null;

  return (
    <div className="rounded-xl p-6 bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/30">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-700 dark:text-red-400">
        <AlertTriangle className="h-5 w-5" />
        Risk Alerts
      </h2>
      <div className="space-y-3">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className="rounded-lg border bg-background p-4 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold">{alert.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  {alert.description}
                </p>
                {alert.recommendation && (
                  <p className="text-sm text-violet-600 dark:text-violet-400 mt-2 font-medium flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 shrink-0" />
                    {alert.recommendation}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 px-2 py-1 rounded text-xs font-semibold ${
                  alert.severity === "high"
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : alert.severity === "medium"
                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                {alert.severity}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
