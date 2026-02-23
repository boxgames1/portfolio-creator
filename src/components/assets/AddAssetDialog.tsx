import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAssets, useCreateAsset, useUpdateAsset } from "@/hooks/useAssets";
import type { AssetType } from "@/types";
import { toast } from "sonner";

const assetTypes: { value: AssetType; label: string }[] = [
  { value: "stock", label: "Stock" },
  { value: "etf", label: "ETF" },
  { value: "fund", label: "Fund" },
  { value: "crypto", label: "Crypto" },
  { value: "fiat", label: "Fiat" },
  { value: "commodity", label: "Commodity" },
  { value: "mineral", label: "Mineral" },
  { value: "precious_metals", label: "Gold & Silver" },
  { value: "real_estate", label: "Real Estate" },
  { value: "other", label: "Other" },
];

const propertyTypes = [
  { value: "apartment", label: "Apartment" },
  { value: "house", label: "House" },
  { value: "land", label: "Land" },
  { value: "commercial", label: "Commercial" },
];

const schema = z.object({
  asset_type: z.enum([
    "stock",
    "etf",
    "fund",
    "crypto",
    "fiat",
    "commodity",
    "mineral",
    "precious_metals",
    "real_estate",
    "other",
  ]),
  name: z.string().min(1, "Name is required"),
  purchase_price: z.coerce.number().positive("Must be positive"),
  purchase_date: z.string().min(1, "Date is required"),
  quantity: z.coerce.number().positive("Must be positive"),
  currency: z.string().default("EUR"),
  notes: z.string().optional(),
  ticker: z.string().optional(),
  isin: z.string().optional(),
  exchange: z.string().optional(),
  symbol: z.string().optional(),
  coingecko_id: z.string().optional(),
  staking_enabled: z.boolean().optional(),
  staking_type: z.enum(["flex", "fixed"]).optional(),
  staking_apy: z.coerce.number().optional(),
  staking_end_date: z.string().optional(),
  sqm: z.coerce.number().optional(),
  property_type: z
    .enum(["apartment", "house", "land", "commercial"])
    .optional(),
  is_rented: z.boolean().optional(),
  monthly_rent: z.coerce.number().optional(),
  annual_expenses: z.coerce.number().optional(),
  interest_rate: z.coerce.number().optional(),
  interest_rate_type: z.enum(["fixed", "variable", "mixed"]).optional(),
  location: z.string().optional(),
  unit: z.string().optional(),
  storage_location: z.string().optional(),
  broker: z.string().optional(),
  fiat_interest_rate: z.coerce.number().optional(),
  metal: z.enum(["gold", "silver"]).optional(),
  precious_metal_form: z.enum(["bar", "coin"]).optional(),
  weight_oz: z.coerce.number().optional(),
  purity: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface AddAssetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAssetId?: string | null;
}

export function AddAssetDialog({
  open,
  onOpenChange,
  editAssetId,
}: AddAssetDialogProps) {
  const { data: assets } = useAssets();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();

  const editAsset = editAssetId
    ? assets?.find((a) => a.id === editAssetId)
    : null;

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      asset_type: "stock",
      name: "",
      purchase_price: 0,
      purchase_date: new Date().toISOString().split("T")[0],
      quantity: 1,
      currency: "EUR",
    },
  });

  const assetType = form.watch("asset_type");

  useEffect(() => {
    if (assetType === "fiat" && form.getValues("purchase_price") === 0) {
      form.setValue("purchase_price", 1);
    }
  }, [assetType, form]);

  useEffect(() => {
    if (editAsset) {
      const meta = editAsset.metadata as Record<string, unknown>;
      form.reset({
        asset_type: editAsset.asset_type,
        name: editAsset.name,
        purchase_price: editAsset.purchase_price,
        purchase_date: editAsset.purchase_date,
        quantity: editAsset.quantity,
        currency: editAsset.currency,
        notes: editAsset.notes ?? "",
        ticker: (meta?.ticker as string) ?? "",
        isin: (meta?.isin as string) ?? "",
        exchange: (meta?.exchange as string) ?? "",
        symbol: (meta?.symbol as string) ?? "",
        coingecko_id: (meta?.coingecko_id as string) ?? "",
        staking_enabled: (meta?.staking_enabled as boolean) ?? false,
        staking_type: (meta?.staking_type as "flex" | "fixed") ?? "flex",
        staking_apy: (meta?.staking_apy as number) ?? 0,
        staking_end_date: (meta?.staking_end_date as string) ?? "",
        sqm: (meta?.sqm as number) ?? 0,
        property_type:
          (meta?.property_type as
            | "apartment"
            | "house"
            | "land"
            | "commercial") ?? undefined,
        is_rented: (meta?.is_rented as boolean) ?? false,
        monthly_rent: (meta?.monthly_rent as number) ?? 0,
        annual_expenses: (meta?.annual_expenses as number) ?? 0,
        interest_rate: (meta?.interest_rate as number) ?? 0,
        interest_rate_type:
          (meta?.interest_rate_type as "fixed" | "variable" | "mixed") ??
          undefined,
        location: (meta?.location as string) ?? "",
        unit: (meta?.unit as string) ?? "",
        storage_location: (meta?.storage_location as string) ?? "",
        broker: (meta?.broker as string) ?? "",
        fiat_interest_rate: (meta?.interest_rate as number) ?? 0,
        metal: (meta?.metal as "gold" | "silver") ?? undefined,
        precious_metal_form: (meta?.form as "bar" | "coin") ?? undefined,
        weight_oz: (meta?.weight_oz as number) ?? undefined,
        purity: (meta?.purity as string) ?? undefined,
      });
    } else if (!open) {
      form.reset({
        asset_type: "stock",
        name: "",
        purchase_price: 0,
        purchase_date: new Date().toISOString().split("T")[0],
        quantity: 1,
        currency: "EUR",
      });
    }
  }, [editAsset, open, form]);

  const buildMetadata = (data: FormData): Record<string, unknown> => {
    const meta: Record<string, unknown> = {};
    if (data.broker) meta.broker = data.broker;
    if (["stock", "etf", "fund"].includes(data.asset_type)) {
      if (data.ticker) meta.ticker = data.ticker;
      if (data.isin) meta.isin = data.isin;
      if (data.exchange) meta.exchange = data.exchange;
    } else if (data.asset_type === "crypto") {
      if (data.symbol) meta.symbol = data.symbol;
      if (data.coingecko_id) meta.coingecko_id = data.coingecko_id;
      meta.staking_enabled = data.staking_enabled ?? false;
      if (data.staking_type) meta.staking_type = data.staking_type;
      if (data.staking_apy) meta.staking_apy = data.staking_apy;
      if (data.staking_end_date) meta.staking_end_date = data.staking_end_date;
    } else if (data.asset_type === "real_estate") {
      if (data.sqm) meta.sqm = data.sqm;
      if (data.property_type) meta.property_type = data.property_type;
      meta.is_rented = data.is_rented ?? false;
      if (data.monthly_rent) meta.monthly_rent = data.monthly_rent;
      if (data.annual_expenses) meta.annual_expenses = data.annual_expenses;
      if (data.interest_rate) meta.interest_rate = data.interest_rate;
      if (data.interest_rate_type)
        meta.interest_rate_type = data.interest_rate_type;
      if (data.location) meta.location = data.location;
    } else if (data.asset_type === "fiat") {
      if (data.fiat_interest_rate != null)
        meta.interest_rate = data.fiat_interest_rate;
    } else if (["commodity", "mineral"].includes(data.asset_type)) {
      if (data.ticker) meta.ticker = data.ticker;
      if (data.unit) meta.unit = data.unit;
      if (data.storage_location) meta.storage_location = data.storage_location;
    } else if (data.asset_type === "precious_metals") {
      if (data.metal) meta.metal = data.metal;
      if (data.precious_metal_form) meta.form = data.precious_metal_form;
      if (data.weight_oz != null) meta.weight_oz = data.weight_oz;
      if (data.purity) meta.purity = data.purity;
      if (data.storage_location) meta.storage_location = data.storage_location;
    }
    return meta;
  };

  const onSubmit = async (data: FormData) => {
    const metadata = buildMetadata(data);
    const payload = {
      asset_type: data.asset_type,
      name: data.name,
      purchase_price: data.purchase_price,
      purchase_date: data.purchase_date,
      quantity: data.quantity,
      currency: data.currency,
      notes: data.notes || undefined,
      metadata,
    };

    try {
      if (editAssetId) {
        await updateAsset.mutateAsync({ id: editAssetId, ...payload });
        toast.success("Asset updated");
      } else {
        await createAsset.mutateAsync(payload);
        toast.success("Asset added");
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save asset");
    }
  };

  const isSubmitting = createAsset.isPending || updateAsset.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAssetId ? "Edit Asset" : "Add Asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Asset Type</Label>
            <Select
              value={assetType}
              onValueChange={(v) => form.setValue("asset_type", v as AssetType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {assetTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input {...form.register("name")} placeholder="e.g. Apple Inc." />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Input {...form.register("currency")} placeholder="EUR" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                step="0.00000001"
                {...form.register("purchase_price")}
              />
              {form.formState.errors.purchase_price && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.purchase_price.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                step="0.00000001"
                {...form.register("quantity")}
              />
              {form.formState.errors.quantity && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.quantity.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Purchase Date</Label>
            <Input type="date" {...form.register("purchase_date")} />
            {form.formState.errors.purchase_date && (
              <p className="text-sm text-destructive">
                {form.formState.errors.purchase_date.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Broker / site</Label>
            <Input
              {...form.register("broker")}
              placeholder="e.g. Interactive Brokers, Binance, Coinbase"
            />
          </div>

          {["stock", "etf", "fund", "commodity"].includes(assetType) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ticker / Symbol</Label>
                <Input {...form.register("ticker")} placeholder="e.g. AAPL" />
              </div>
              {["stock", "etf", "fund"].includes(assetType) && (
                <>
                  <div className="space-y-2">
                    <Label>ISIN (optional)</Label>
                    <Input
                      {...form.register("isin")}
                      placeholder="US0378331005"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Exchange (optional)</Label>
                    <Input
                      {...form.register("exchange")}
                      placeholder="NASDAQ"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {assetType === "crypto" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Symbol</Label>
                <Input {...form.register("symbol")} placeholder="BTC" />
              </div>
              <div className="space-y-2">
                <Label>CoinGecko ID (for price fetch)</Label>
                <Input
                  {...form.register("coingecko_id")}
                  placeholder="bitcoin"
                />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="staking"
                    {...form.register("staking_enabled")}
                  />
                  <Label htmlFor="staking">Staking enabled</Label>
                </div>
                {form.watch("staking_enabled") && (
                  <div className="space-y-4 pl-6 border-l-2 border-muted">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={form.watch("staking_type") ?? "flex"}
                          onValueChange={(v) =>
                            form.setValue("staking_type", v as "flex" | "fixed")
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="flex">Flexible</SelectItem>
                            <SelectItem value="fixed">
                              Fixed / Locked
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Rate (APY %)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 5"
                          {...form.register("staking_apy")}
                        />
                      </div>
                    </div>
                    {form.watch("staking_type") === "fixed" && (
                      <div className="space-y-2">
                        <Label>End date</Label>
                        <Input
                          type="date"
                          {...form.register("staking_end_date")}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {assetType === "fiat" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Use quantity = amount (e.g. 1000) and purchase price = 1 for
                currency units.
              </p>
              <div className="space-y-2">
                <Label>Interest rate (APY %)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 4.5"
                  {...form.register("fiat_interest_rate")}
                />
              </div>
            </div>
          )}

          {assetType === "real_estate" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Square meters</Label>
                  <Input type="number" step="0.01" {...form.register("sqm")} />
                </div>
                <div className="space-y-2">
                  <Label>Property Type</Label>
                  <Select
                    value={form.watch("property_type") ?? ""}
                    onValueChange={(v) =>
                      form.setValue(
                        "property_type",
                        v as "apartment" | "house" | "land" | "commercial"
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {propertyTypes.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input
                  {...form.register("location")}
                  placeholder="City, Country"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rented"
                  {...form.register("is_rented")}
                />
                <Label htmlFor="rented">Currently rented</Label>
              </div>
              {form.watch("is_rented") && (
                <div className="space-y-2">
                  <Label>Monthly Rent</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("monthly_rent")}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Annual Expenses</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("annual_expenses")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interest Rate %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("interest_rate")}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Interest Rate Type</Label>
                <Select
                  value={form.watch("interest_rate_type") ?? ""}
                  onValueChange={(v) =>
                    form.setValue(
                      "interest_rate_type",
                      v ? (v as "fixed" | "variable" | "mixed") : undefined
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {assetType === "precious_metals" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Metal</Label>
                  <Select
                    value={form.watch("metal") ?? ""}
                    onValueChange={(v) =>
                      form.setValue(
                        "metal",
                        v ? (v as "gold" | "silver") : undefined
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="silver">Silver</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Form</Label>
                  <Select
                    value={form.watch("precious_metal_form") ?? ""}
                    onValueChange={(v) =>
                      form.setValue(
                        "precious_metal_form",
                        v ? (v as "bar" | "coin") : undefined
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bar">Bar</SelectItem>
                      <SelectItem value="coin">Coin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weight (troy oz)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...form.register("weight_oz")}
                    placeholder="e.g. 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Purity (optional)</Label>
                  <Input
                    {...form.register("purity")}
                    placeholder="e.g. 999, 24k"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Storage Location</Label>
                <Input {...form.register("storage_location")} />
              </div>
              <p className="text-xs text-muted-foreground">
                Quantity = number of units (e.g. 2 bars). Price fetched from
                spot market (PAX Gold / Kinesis Silver).
              </p>
            </div>
          )}

          {["commodity", "mineral"].includes(assetType) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ticker / Unit</Label>
                <Input {...form.register("ticker")} placeholder="e.g. GOLD" />
              </div>
              <div className="space-y-2">
                <Label>Storage Location</Label>
                <Input {...form.register("storage_location")} />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Input {...form.register("notes")} placeholder="Additional notes" />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Saving..."
                : editAssetId
                ? "Update"
                : "Add Asset"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
