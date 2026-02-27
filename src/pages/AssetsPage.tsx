import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FileDown,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets } from "@/hooks/useAssets";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { AssetList } from "@/components/assets/AssetList";
import { AddAssetDialog } from "@/components/assets/AddAssetDialog";
import { AssetTypeFilter } from "@/components/assets/AssetTypeFilter";
import type { AssetType } from "@/types";
import { useRefreshPrices } from "@/hooks/useRefreshPrices";
import { exportPortfolioToPdf } from "@/lib/exportPortfolioPdf";
import { cn } from "@/lib/utils";
import { getDemoAssets, getDemoPortfolio } from "@/lib/demoPortfolio";

type SortOption = "investment-asc" | "investment-desc" | "roi-asc" | "roi-desc";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "investment-asc", label: "My investment (asc)" },
  { value: "investment-desc", label: "My investment (desc)" },
  { value: "roi-asc", label: "By ROI (asc)" },
  { value: "roi-desc", label: "By ROI (desc)" },
];

export function AssetsPage() {
  const [searchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");
  const [sortBy, setSortBy] = useState<SortOption>("investment-desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [demoMode, setDemoMode] = useState(() =>
    typeof localStorage !== "undefined"
      ? localStorage.getItem("portfolio-demo") === "true"
      : false
  );

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);
  const { data: assetsQueryData, isLoading: assetsLoading } = useAssets();
  const { data: portfolioQueryData, isLoading: portfolioLoadingQuery } =
    usePortfolioValue({ enabled: !demoMode });
  const refreshPrices = useRefreshPrices();

  const demoAssets = useMemo(() => getDemoAssets(), []);
  const demoPortfolio = useMemo(() => getDemoPortfolio(), []);

  const assets = demoMode ? demoAssets : assetsQueryData ?? [];
  const portfolio = demoMode ? demoPortfolio : portfolioQueryData;
  const isLoading = demoMode ? false : assetsLoading;
  const portfolioLoading = demoMode ? false : portfolioLoadingQuery;

  const filteredByType =
    assets?.filter(
      (a) => typeFilter === "all" || a.asset_type === typeFilter
    ) ?? [];

  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return filteredByType;
    const q = searchQuery.trim().toLowerCase();
    return filteredByType.filter((a) => {
      if (a.name.toLowerCase().includes(q)) return true;
      const meta = a.metadata as Record<string, unknown>;
      if (meta?.ticker && String(meta.ticker).toLowerCase().includes(q))
        return true;
      if (meta?.isin && String(meta.isin).toLowerCase().includes(q))
        return true;
      if (meta?.symbol && String(meta.symbol).toLowerCase().includes(q))
        return true;
      if (a.notes?.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [filteredByType, searchQuery]);

  const sortedAssets = useMemo(() => {
    const arr = [...filteredAssets];
    if (sortBy.startsWith("investment")) {
      const asc = sortBy === "investment-asc";
      arr.sort((a, b) => {
        const costA = a.purchase_price * a.quantity;
        const costB = b.purchase_price * b.quantity;
        return asc ? costA - costB : costB - costA;
      });
    } else {
      const asc = sortBy === "roi-asc";
      arr.sort((a, b) => {
        const roiA =
          portfolio?.assetsWithPrices.find((p) => p.id === a.id)?.roi ?? 0;
        const roiB =
          portfolio?.assetsWithPrices.find((p) => p.id === b.id)?.roi ?? 0;
        return asc ? roiA - roiB : roiB - roiA;
      });
    }
    return arr;
  }, [filteredAssets, sortBy, portfolio?.assetsWithPrices]);

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 -mx-4 flex flex-col gap-4 border-b border-border/40 bg-background/95 px-4 py-4 shadow-md backdrop-blur-md supports-[backdrop-filter]:bg-background/90 md:-mx-8 md:px-8 md:py-4 rounded-b-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Assets</h1>
            <p className="text-muted-foreground mt-1">
              Manage your portfolio assets
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="search"
                placeholder="Search by name, ticker, ISIN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <AssetTypeFilter value={typeFilter} onChange={setTypeFilter} />
            <Select
              value={sortBy}
              onValueChange={(v) => setSortBy(v as SortOption)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button
              variant="outline"
              onClick={() => assets && refreshPrices.mutate(assets)}
              disabled={
                !assets ||
                assets.length === 0 ||
                refreshPrices.isPending ||
                assets.every(
                  (a) =>
                    a.asset_type === "fiat" || a.asset_type === "private_equity"
                ) ||
                demoMode
              }
              title={
                demoMode ? "Price refresh disabled in demo mode" : undefined
              }
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${
                  refreshPrices.isPending ? "animate-spin" : ""
                }`}
              />
              Refresh prices
            </Button>
            <div
              role="group"
              aria-label="Portfolio data source"
              className="flex items-center rounded-full border border-input bg-muted/50 p-0.5"
            >
              <button
                type="button"
                onClick={() => {
                  setDemoMode(false);
                  try {
                    localStorage.setItem("portfolio-demo", "false");
                  } catch {}
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  !demoMode
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span>My portfolio</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setDemoMode(true);
                  try {
                    localStorage.setItem("portfolio-demo", "true");
                  } catch {}
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200",
                  demoMode
                    ? "bg-amber-100 text-amber-900 shadow-sm ring-1 ring-amber-200 dark:bg-amber-950/50 dark:text-amber-100 dark:ring-amber-800"
                    : "text-muted-foreground hover:text-foreground"
                )}
                title="Sample portfolio with fake data"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Demo</span>
              </button>
            </div>
            <Button onClick={() => setAddOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Asset
            </Button>
          </div>
        </div>
      </div>

      {demoMode && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          You are viewing <strong>Portfolio demo</strong> with sample data. Turn
          it off above to see your real assets.
        </div>
      )}

      {isLoading || portfolioLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <AssetList assets={sortedAssets} portfolio={portfolio} />
      )}

      <AddAssetDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
