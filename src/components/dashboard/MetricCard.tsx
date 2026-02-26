interface MetricCardProps {
  label: string;
  value: string;
  subtext: string;
  icon: string;
  subtextClassName?: string;
}

export function MetricCard({
  label,
  value,
  subtext,
  icon,
  subtextClassName = "text-muted-foreground",
}: MetricCardProps) {
  return (
    <div className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl bg-muted">
          {icon}
        </div>
      </div>
      <div className="text-2xl md:text-3xl font-bold">{value}</div>
      <div className={`text-sm mt-1 ${subtextClassName}`}>{subtext}</div>
    </div>
  );
}
