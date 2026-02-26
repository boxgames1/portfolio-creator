import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import type { Asset } from "@/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), "dd/MM/yyyy");
  } catch {
    return dateStr;
  }
}

function getAssetDetails(asset: Asset, meta: Record<string, unknown>): string {
  const parts: string[] = [];

  if (asset.notes) parts.push(`Notes: ${asset.notes}`);

  if (["stock", "etf", "fund", "commodity"].includes(asset.asset_type)) {
    if (meta?.ticker) parts.push(`Ticker: ${meta.ticker}`);
    if (meta?.isin) parts.push(`ISIN: ${meta.isin}`);
    if (meta?.exchange) parts.push(`Exchange: ${meta.exchange}`);
    if (meta?.broker) parts.push(`Broker: ${meta.broker}`);
    if (
      (asset.asset_type === "etf" || asset.asset_type === "fund") &&
      typeof meta?.annual_management_fee === "number" &&
      meta.annual_management_fee > 0
    ) {
      parts.push(`TER: ${meta.annual_management_fee}%`);
    }
  }

  if (asset.asset_type === "crypto") {
    if (meta?.symbol) parts.push(`Symbol: ${meta.symbol}`);
    if (meta?.coingecko_id) parts.push(`Coingecko: ${meta.coingecko_id}`);
    if (meta?.staking_enabled) {
      const type = meta.staking_type === "fixed" ? "Fixed" : "Flexible";
      let staking = `Staking: ${type}`;
      if (meta?.staking_apy) staking += ` · ${meta.staking_apy}% APY`;
      if (meta?.staking_end_date)
        staking += ` · until ${formatDate(meta.staking_end_date as string)}`;
      parts.push(staking);
    }
  }

  if (asset.asset_type === "real_estate") {
    if (meta?.property_type)
      parts.push(`Type: ${String(meta.property_type).replace("_", " ")}`);
    if (meta?.sqm) parts.push(`Sqm: ${meta.sqm}`);
    if (meta?.location) parts.push(`Location: ${meta.location}`);
    if (meta?.is_rented) parts.push(`Rented: ${meta.is_rented ? "Yes" : "No"}`);
    if (typeof meta?.monthly_rent === "number")
      parts.push(`Monthly rent: ${formatCurrency(meta.monthly_rent)}`);
    if (typeof meta?.annual_expenses === "number")
      parts.push(`Annual expenses: ${formatCurrency(meta.annual_expenses)}`);
    if (typeof meta?.interest_rate === "number")
      parts.push(
        `Interest: ${meta.interest_rate}% (${meta.interest_rate_type ?? "n/a"})`
      );
  }

  if (asset.asset_type === "precious_metals") {
    if (meta?.metal) parts.push(`Metal: ${meta.metal}`);
    if (meta?.form) parts.push(`Form: ${meta.form}`);
    if (meta?.weight_oz) parts.push(`Weight: ${meta.weight_oz} oz`);
    if (meta?.purity) parts.push(`Purity: ${meta.purity}`);
    if (meta?.storage_location) parts.push(`Storage: ${meta.storage_location}`);
  }

  if (asset.asset_type === "commodity" && meta?.unit)
    parts.push(`Unit: ${meta.unit}`);

  if (asset.asset_type === "fiat" && typeof meta?.interest_rate === "number")
    parts.push(`Interest: ${meta.interest_rate}% APY`);

  return parts.join(" · ") || "—";
}

interface PortfolioData {
  totalValue: number;
  totalCost: number;
  byType?: { type: string; value: number; cost: number }[];
  assetsWithPrices: {
    id: string;
    currentPrice?: number;
    currentValue?: number;
    costInEur?: number;
    roi?: number;
  }[];
}

export function exportPortfolioToPdf(
  assets: Asset[],
  portfolio: PortfolioData | null
): void {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 20;

  // Header
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Portfolio Export", margin, y);
  y += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Generated on ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
    margin,
    y
  );
  y += 14;

  // Summary
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Summary", margin, y);
  y += 8;

  const totalValue = portfolio?.totalValue ?? 0;
  const totalCost = portfolio?.totalCost ?? 0;
  const roi = totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total value: ${formatCurrency(totalValue)}`, margin, y);
  y += 6;
  doc.text(`Total cost: ${formatCurrency(totalCost)}`, margin, y);
  y += 6;
  doc.text(
    `ROI: ${roi >= 0 ? "+" : ""}${roi.toFixed(1)}% (${formatCurrency(
      totalValue - totalCost
    )})`,
    margin,
    y
  );
  y += 14;

  // Breakdown by type
  if (portfolio?.byType && portfolio.byType.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Breakdown by type", margin, y);
    y += 8;

    autoTable(doc, {
      startY: y,
      head: [["Type", "Value", "Cost", "ROI %"]],
      body: portfolio.byType.map((t) => {
        const typeRoi =
          t.cost > 0 ? (((t.value - t.cost) / t.cost) * 100).toFixed(1) : "—";
        return [
          t.type.replace("_", " "),
          formatCurrency(t.value),
          formatCurrency(t.cost),
          `${typeRoi}%`,
        ];
      }),
      margin: { left: margin, right: margin },
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });
    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
        .finalY + 14;
  }

  // Assets table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Assets (all details)", margin, y);
  y += 8;

  const tableData = assets.map((asset) => {
    const pw = portfolio?.assetsWithPrices.find((p) => p.id === asset.id);
    const cost = pw?.costInEur ?? asset.purchase_price * asset.quantity;
    const currentValue =
      pw?.currentValue ?? asset.purchase_price * asset.quantity;
    const currentPrice = pw?.currentPrice ?? asset.purchase_price;
    const roiVal = pw?.roi ?? 0;
    const meta = asset.metadata as Record<string, unknown>;
    const details = getAssetDetails(asset, meta);

    return [
      asset.name,
      asset.asset_type.replace("_", " "),
      asset.quantity.toString(),
      formatCurrency(asset.purchase_price),
      formatDate(asset.purchase_date),
      formatCurrency(cost),
      formatCurrency(currentPrice),
      formatCurrency(currentValue),
      `${roiVal >= 0 ? "+" : ""}${roiVal.toFixed(1)}%`,
      details,
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Name",
        "Type",
        "Qty",
        "Unit price",
        "Date",
        "Cost",
        "Curr. price",
        "Value",
        "ROI",
        "Details",
      ],
    ],
    body: tableData,
    margin: { left: margin, right: margin },
    theme: "striped",
    headStyles: { fillColor: [59, 130, 246], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      0: { cellWidth: 28 },
      1: { cellWidth: 16 },
      2: { cellWidth: 8 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
      8: { cellWidth: 12 },
      9: { cellWidth: 28 },
    },
    didDrawPage: (data) => {
      doc.setFontSize(8);
      doc.setTextColor(128);
      doc.text(
        `Page ${data.pageNumber}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    },
  });

  doc.save(`portfolio-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}
