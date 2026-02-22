import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssets } from "@/hooks/useAssets";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { AssetList } from "@/components/assets/AssetList";
import { AddAssetDialog } from "@/components/assets/AddAssetDialog";
import { AssetTypeFilter } from "@/components/assets/AssetTypeFilter";
import type { AssetType } from "@/types";

export function AssetsPage() {
  const [searchParams] = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<AssetType | "all">("all");

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      setAddOpen(true);
    }
  }, [searchParams]);
  const { data: assets, isLoading } = useAssets();
  const { isLoading: portfolioLoading } = usePortfolioValue();

  const filteredAssets =
    assets?.filter(
      (a) => typeFilter === "all" || a.asset_type === typeFilter
    ) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Assets</h1>
          <p className="text-muted-foreground mt-1">
            Manage your portfolio assets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AssetTypeFilter value={typeFilter} onChange={setTypeFilter} />
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
        <AssetList assets={filteredAssets} />
      )}

      <AddAssetDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
