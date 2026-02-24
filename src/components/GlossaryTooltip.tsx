import { Info } from "lucide-react";

const GLOSSARY: Record<
  string,
  { title: string; description: string; link?: string }
> = {
  REITs: {
    title: "REITs (Real Estate Investment Trusts)",
    description:
      "Companies that own or finance income-producing real estate. They trade like stocks, pay dividends, and offer exposure to property markets without buying physical real estate. Examples: VNQ (US), SRET (global), VNQI (international).",
    link: "https://www.investopedia.com/terms/r/reit.asp",
  },
  ETF: {
    title: "ETF (Exchange-Traded Fund)",
    description:
      "A fund that tracks an index, sector, or asset class and trades on exchanges like a stock. Typically has lower fees than mutual funds.",
  },
  ROI: {
    title: "ROI (Return on Investment)",
    description:
      "Percentage gain or loss on an investment relative to its cost. ROI = (current value - cost) / cost × 100.",
  },
};

interface GlossaryTooltipProps {
  term: string;
  children?: React.ReactNode;
}

export function GlossaryTooltip({ term, children }: GlossaryTooltipProps) {
  const entry = GLOSSARY[term];
  if (!entry) return <>{children ?? term}</>;

  return (
    <span className="inline-flex items-center gap-1">
      {children ?? term}
      <span
        className="inline-flex cursor-help align-middle text-muted-foreground hover:text-foreground"
        title={`${entry.title}: ${entry.description}${
          entry.link ? ` Learn more: ${entry.link}` : ""
        }`}
      >
        <Info className="h-3.5 w-3.5" />
      </span>
    </span>
  );
}

export function GlossarySection({
  terms,
  suggestions,
}: {
  terms: string[];
  suggestions?: (string | { text: string })[];
}) {
  const text = (suggestions ?? [])
    .map((s) => (typeof s === "string" ? s : s.text))
    .join(" ")
    .toLowerCase();
  const relevantTerms = terms.filter((t) => {
    const key = t.toLowerCase();
    if (key === "reits") return text.includes("reit");
    return text.includes(key);
  });
  const entries = relevantTerms
    .map((t) => GLOSSARY[t])
    .filter(Boolean) as Array<{
    title: string;
    description: string;
    link?: string;
  }>;

  if (entries.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
      <h5 className="mb-2 font-medium text-muted-foreground">Learn more</h5>
      <dl className="space-y-2">
        {entries.map((e) => (
          <div key={e.title}>
            <dt className="font-medium">{e.title}</dt>
            <dd className="text-muted-foreground">{e.description}</dd>
            {e.link && (
              <a
                href={e.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-primary underline"
              >
                Read more →
              </a>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}
