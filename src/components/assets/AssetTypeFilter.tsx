import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssetType } from "@/types";

export const ASSET_TYPE_OPTIONS: { value: AssetType | "all"; label: string }[] =
  [
    { value: "all", label: "All types" },
    { value: "stock", label: "Stock" },
    { value: "etf", label: "ETF" },
    { value: "fund", label: "Fund" },
    { value: "crypto", label: "Crypto" },
    { value: "fiat", label: "Fiat" },
    { value: "commodity", label: "Commodity" },
    { value: "mineral", label: "Mineral" },
    { value: "precious_metals", label: "Gold & Silver" },
    { value: "real_estate", label: "Real Estate" },
    { value: "private_equity", label: "Private Equity" },
    { value: "other", label: "Other" },
  ];

interface AssetTypeFilterProps {
  value: AssetType | "all";
  onChange: (value: AssetType | "all") => void;
  className?: string;
}

export function AssetTypeFilter({
  value,
  onChange,
  className,
}: AssetTypeFilterProps) {
  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as AssetType | "all")}
    >
      <SelectTrigger className={`w-[180px] ${className ?? ""}`}>
        <SelectValue placeholder="Filter by type" />
      </SelectTrigger>
      <SelectContent>
        {ASSET_TYPE_OPTIONS.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
