import React, { useEffect, useMemo, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface AllocationItem {
  type: string;
  value: number;
}

interface AllocationDonutChartProps {
  byType: AllocationItem[];
  totalValue: number;
  size?: number;
  strokeWidth?: number;
}

interface Segment {
  key: string;
  label: string;
  value: number; // percentage 0-100
  primary: string;
  gradient: string;
  glow: string;
  startPercent: number;
  endPercent: number;
  amount: number | null;
}

const COLOR_CONFIGS: Record<
  string,
  { primary: string; gradient: string; glow: string }
> = {
  stock: {
    primary: "#6366F1",
    gradient: "#818CF8",
    glow: "rgba(99, 102, 241, 0.3)",
  },
  etf: {
    primary: "#3B82F6",
    gradient: "#60A5FA",
    glow: "rgba(59, 130, 246, 0.3)",
  },
  fund: {
    primary: "#8B5CF6",
    gradient: "#A78BFA",
    glow: "rgba(139, 92, 246, 0.3)",
  },
  crypto: {
    primary: "#10B981",
    gradient: "#34D399",
    glow: "rgba(16, 185, 129, 0.3)",
  },
  real_estate: {
    primary: "#F59E0B",
    gradient: "#FBBF24",
    glow: "rgba(245, 158, 11, 0.3)",
  },
  precious_metals: {
    primary: "#FACC15",
    gradient: "#FDE047",
    glow: "rgba(250, 204, 21, 0.3)",
  },
  fiat: {
    primary: "#9CA3AF",
    gradient: "#D1D5DB",
    glow: "rgba(156, 163, 175, 0.3)",
  },
  private_equity: {
    primary: "#7C3AED",
    gradient: "#A78BFA",
    glow: "rgba(124, 58, 237, 0.3)",
  },
  other: {
    primary: "#9CA3AF",
    gradient: "#D1D5DB",
    glow: "rgba(156, 163, 175, 0.3)",
  },
};

export function AllocationDonutChart({
  byType,
  totalValue,
  size = 280,
  strokeWidth = 36,
}: AllocationDonutChartProps) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 80);
    return () => clearTimeout(timer);
  }, []);

  const chartData: Segment[] | null = useMemo(() => {
    if (!byType || byType.length === 0 || totalValue <= 0) return null;

    let cumulativePercent = 0;
    return byType
      .filter((item) => item.value > 0)
      .map((item) => {
        const pct = (item.value / totalValue) * 100;
        const startPercent = cumulativePercent;
        cumulativePercent += pct;
        const key = item.type;
        const normalized = item.type as keyof typeof COLOR_CONFIGS;
        const colors = COLOR_CONFIGS[normalized] ?? COLOR_CONFIGS.other;
        return {
          key,
          label: item.type.replace("_", " "),
          value: pct,
          ...colors,
          startPercent,
          endPercent: cumulativePercent,
          amount: item.value,
        };
      });
  }, [byType, totalValue]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className="h-56 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/40">
        <div className="text-center">
          <span className="text-3xl">🥧</span>
          <p className="mt-2 text-sm text-muted-foreground">
            No allocation data
          </p>
        </div>
      </div>
    );
  }

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const totalPercent = chartData.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <div className="flex flex-col items-center relative">
      <div
        className="relative"
        style={{
          width: size,
          height: size,
          transform: isAnimated ? "scale(1)" : "scale(0.85)",
          opacity: isAnimated ? 1 : 0,
          transition:
            "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease-out",
        }}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          <defs>
            {chartData.map((segment) => (
              <React.Fragment key={`gradients-${segment.key}`}>
                <linearGradient
                  id={`gradient-${segment.key}`}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={segment.gradient} />
                  <stop offset="100%" stopColor={segment.primary} />
                </linearGradient>
                <radialGradient
                  id={`radial-${segment.key}`}
                  cx="30%"
                  cy="30%"
                  r="70%"
                >
                  <stop offset="0%" stopColor={segment.gradient} />
                  <stop offset="50%" stopColor={segment.primary} />
                  <stop
                    offset="100%"
                    stopColor={segment.primary}
                    stopOpacity={0.85}
                  />
                </radialGradient>
              </React.Fragment>
            ))}
            <filter id="allocGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* background ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--border-subtle)"
            strokeWidth={strokeWidth}
            opacity={0.25}
          />

          {chartData.map((segment, index) => {
            const dashLength = (segment.value / 100) * circumference;
            const dashOffset =
              circumference - (segment.startPercent / 100) * circumference;
            const single = chartData.length === 1;
            const isHovered = hoveredKey === segment.key;
            const strokeGradient = single
              ? `url(#radial-${segment.key})`
              : `url(#gradient-${segment.key})`;

            return (
              <circle
                key={segment.key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={strokeGradient}
                strokeWidth={isHovered ? strokeWidth + 6 : strokeWidth}
                strokeDasharray={
                  isAnimated
                    ? `${dashLength} ${circumference - dashLength}`
                    : `0 ${circumference}`
                }
                strokeDashoffset={dashOffset}
                strokeLinecap="round"
                filter={isHovered ? "url(#allocGlow)" : undefined}
                style={{
                  cursor: "pointer",
                  transition:
                    "stroke-dasharray 0.8s cubic-bezier(0.4, 0, 0.2, 1), stroke-width 0.2s ease",
                  transitionDelay: isAnimated ? `${index * 0.08}s` : "0s",
                }}
                onMouseEnter={() => setHoveredKey(segment.key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            );
          })}
        </svg>

        {/* center label */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-2"
          style={{
            transform: isAnimated ? "scale(1)" : "scale(0)",
            transition:
              "transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.25s",
          }}
        >
          <span
            className={`font-bold tabular-nums ${
              totalValue >= 1_000_000
                ? "text-lg"
                : totalValue >= 100_000
                  ? "text-xl"
                  : "text-2xl"
            }`}
          >
            {totalValue >= 1_000_000
              ? `${(totalValue / 1_000_000).toLocaleString("es-ES", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })} M €`
              : totalValue >= 100_000
                ? `${(totalValue / 1_000).toLocaleString("es-ES", {
                    maximumFractionDigits: 0,
                  })}k €`
                : formatCurrency(totalValue, "EUR")}
          </span>
          <span className="text-xs font-medium text-muted-foreground mt-0.5">
            Total value
          </span>
          <span className="mt-1 text-[11px] text-muted-foreground/80">
            {totalPercent.toFixed(0)}% allocated
          </span>
        </div>

        {/* hover tooltip in center */}
        {hoveredKey && (
          <div className="absolute z-20 left-1/2 top-[8%] -translate-x-1/2 rounded-xl border bg-slate-900/95 px-4 py-3 text-xs text-slate-50 shadow-xl backdrop-blur">
            {chartData
              .filter((s) => s.key === hoveredKey)
              .map((segment) => (
                <div key={segment.key} className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: segment.primary,
                        boxShadow: `0 0 8px ${segment.primary}`,
                      }}
                    />
                    <span className="text-sm font-semibold capitalize">
                      {segment.label}
                    </span>
                  </div>
                  <div className="text-lg font-bold">
                    {segment.value.toFixed(1)}%
                  </div>
                  {segment.amount !== null && (
                    <div className="text-[11px] text-slate-300">
                      {formatCurrency(segment.amount, "EUR")} value
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* legend */}
      <div
        className="mt-4 grid w-full grid-cols-2 gap-3"
        style={{
          opacity: isAnimated ? 1 : 0,
          transform: isAnimated ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 0.4s ease 0.3s, transform 0.4s ease 0.3s",
        }}
      >
        {chartData.map((segment) => {
          const isHovered = hoveredKey === segment.key;
          return (
            <button
              key={segment.key}
              type="button"
              className="flex flex-col rounded-lg border bg-muted/40 p-3 text-left text-xs transition-all hover:bg-muted"
              style={{
                borderColor: isHovered ? segment.primary : "transparent",
                boxShadow: isHovered
                  ? `0 0 0 1px ${segment.primary}33`
                  : "none",
              }}
              onMouseEnter={() => setHoveredKey(segment.key)}
              onMouseLeave={() => setHoveredKey(null)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{
                      background: `linear-gradient(135deg, ${segment.gradient}, ${segment.primary})`,
                      boxShadow: isHovered ? `0 0 8px ${segment.glow}` : "none",
                    }}
                  />
                  <span className="text-[13px] font-medium capitalize">
                    {segment.label}
                  </span>
                </div>
                <span
                  className="text-[13px] font-semibold"
                  style={{
                    color: isHovered ? segment.primary : "var(--foreground)",
                  }}
                >
                  {segment.value.toFixed(1)}%
                </span>
              </div>
              {segment.amount !== null && (
                <span className="mt-1 pl-5 text-[11px] text-muted-foreground">
                  {formatCurrency(segment.amount, "EUR")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
