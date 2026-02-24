import { useState } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortfolioValue } from "@/hooks/usePortfolioValue";
import { useDeleteAsset } from "@/hooks/useAssets";
import { formatCurrency } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import type { Asset } from "@/types";
import { AddAssetDialog } from "./AddAssetDialog";
import { toast } from "sonner";

interface AssetListProps {
  assets: Asset[];
}

export function AssetList({ assets }: AssetListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const { data: portfolio } = usePortfolioValue();
  const deleteAsset = useDeleteAsset();

  const getAssetPriceInfo = (asset: Asset) => {
    const info = portfolio?.assetsWithPrices.find((p) => p.id === asset.id);
    return info;
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAsset.mutateAsync(id);
      toast.success("Asset deleted");
    } catch {
      toast.error("Failed to delete asset");
    }
  };

  if (assets.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground">
            No assets yet. Add your first asset to get started.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {assets.map((asset) => {
        const priceInfo = getAssetPriceInfo(asset);
        const currentPrice = priceInfo?.currentPrice ?? asset.purchase_price;
        const currentValue =
          priceInfo?.currentValue ?? asset.purchase_price * asset.quantity;
        const cost =
          priceInfo?.costInEur ?? asset.purchase_price * asset.quantity;
        const roi = priceInfo?.roi ?? 0;

        const meta = asset.metadata as Record<string, unknown>;
        const stakingEnabled = Boolean(
          asset.asset_type === "crypto" && meta?.staking_enabled
        );
        const stakingType =
          typeof meta?.staking_type === "string" ? meta.staking_type : "flex";
        const stakingApy = (meta?.staking_apy as number) || 0;
        const estStakingYield =
          stakingEnabled && stakingApy > 0
            ? currentValue * (stakingApy / 100)
            : 0;
        const projected1YValue =
          stakingEnabled && stakingApy > 0
            ? currentValue * (1 + stakingApy / 100)
            : currentValue;
        const projected1YRoi =
          cost > 0 ? ((projected1YValue - cost) / cost) * 100 : 0;

        return (
          <Card key={asset.id}>
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{asset.name}</p>
                  {["stock", "etf", "fund", "commodity"].includes(
                    asset.asset_type
                  ) &&
                    ((meta?.ticker as string) || (meta?.isin as string)) && (
                      <span className="text-xs text-muted-foreground">
                        ·{" "}
                        {[meta?.ticker as string, meta?.isin as string]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    )}
                  <span className="text-xs text-muted-foreground capitalize">
                    {asset.asset_type.replace("_", " ")}
                    {asset.asset_type === "precious_metals" &&
                      (meta?.metal as string) && (
                        <>
                          {" "}
                          ·{" "}
                          {(meta.metal as string).charAt(0).toUpperCase() +
                            (meta.metal as string).slice(1)}
                        </>
                      )}
                  </span>
                  {meta?.broker &&
                  asset.asset_type !== "real_estate" &&
                  asset.asset_type !== "precious_metals" ? (
                    <span className="text-xs text-muted-foreground">
                      · {String(meta.broker)}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {asset.quantity} ×{" "}
                  {formatCurrency(cost / asset.quantity, "EUR")} ={" "}
                  {formatCurrency(cost, "EUR")} (cost)
                </div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  Current: {formatCurrency(currentPrice, "EUR")}/unit
                </div>
                {asset.asset_type === "real_estate" &&
                  typeof meta?.interest_rate === "number" &&
                  meta.interest_rate > 0 && (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      Interest: {meta.interest_rate as number}%
                      {(() => {
                        const type = meta.interest_rate_type as
                          | string
                          | undefined;
                        if (
                          !type ||
                          !["fixed", "variable", "mixed"].includes(type)
                        )
                          return null;
                        return (
                          <> ({type.charAt(0).toUpperCase() + type.slice(1)})</>
                        );
                      })()}
                    </div>
                  )}
                {asset.asset_type === "fiat" &&
                  typeof (asset.metadata as Record<string, unknown>)
                    ?.interest_rate === "number" &&
                  (
                    asset.metadata as Record<string, unknown> & {
                      interest_rate: number;
                    }
                  ).interest_rate > 0 && (
                    <div className="mt-0.5 text-sm text-muted-foreground">
                      Interest:{" "}
                      {
                        (
                          asset.metadata as Record<string, unknown> & {
                            interest_rate: number;
                          }
                        ).interest_rate
                      }
                      % APY
                    </div>
                  )}
                {stakingEnabled ? (
                  <div className="mt-2 space-y-0.5">
                    <div className="text-sm font-medium">
                      Staking:{" "}
                      {String(stakingType) === "fixed" ? "Fixed" : "Flexible"}
                      {stakingApy > 0 ? ` · ${stakingApy}% APY` : ""}
                      {String(stakingType) === "fixed" &&
                        typeof meta?.staking_end_date === "string" &&
                        meta.staking_end_date && (
                          <>
                            {" "}
                            · until{" "}
                            {format(
                              parseISO(meta.staking_end_date),
                              "MMM d, yyyy"
                            )}
                          </>
                        )}
                    </div>
                    {stakingApy > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground">
                          Est. yield: +{formatCurrency(estStakingYield, "EUR")}
                          /yr
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Projected 1Y:{" "}
                          {formatCurrency(projected1YValue, "EUR")} (
                          <span
                            className={
                              projected1YRoi >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }
                          >
                            {projected1YRoi >= 0 ? "+" : ""}
                            {projected1YRoi.toFixed(1)}% ROI
                          </span>
                          )
                        </div>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-semibold">
                  {formatCurrency(currentValue, "EUR")}
                </p>
                <p
                  className={`text-sm ${
                    roi >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {roi >= 0 ? "+" : ""}
                  {roi.toFixed(1)}% {stakingEnabled ? "base " : ""}ROI
                  <span className="ml-1 text-muted-foreground">
                    ({currentValue >= cost ? "+" : ""}
                    {formatCurrency(currentValue - cost, "EUR")})
                  </span>
                </p>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingId(asset.id)}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(asset.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {editingId && (
        <AddAssetDialog
          open={!!editingId}
          onOpenChange={(open) => !open && setEditingId(null)}
          editAssetId={editingId}
        />
      )}
    </div>
  );
}
