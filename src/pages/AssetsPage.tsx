import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);
  const { data: assets, isLoading } = useAssets();
  const { data: portfolio, isLoading: portfolioLoading } = usePortfolioValue();
  const refreshPrices = useRefreshPrices();
  console.log("=========================");
  console.log("refreshPrices");
  console.log(refreshPrices);
  console.log("=========================");
  const filteredAssets =
    assets?.filter(
      (a) => typeFilter === "all" || a.asset_type === typeFilter
    ) ?? [];

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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your portfolio assets
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            onClick={() => assets && refreshPrices.mutate(assets)}
            disabled={
              !assets ||
              assets.length === 0 ||
              refreshPrices.isPending ||
              assets.every((a) => a.asset_type === "fiat")
            }
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                refreshPrices.isPending ? "animate-spin" : ""
              }`}
            />
            Refresh prices
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Asset
          </Button>
        </div>
      </div>

      {isLoading || portfolioLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <AssetList assets={sortedAssets} />
      )}

      <AddAssetDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
