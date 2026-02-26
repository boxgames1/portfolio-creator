import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (compatible; PortfolioApp/1.0; +https://github.com)";
const MAX_ASSETS = 15;
const DAYS = 365;

const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  xrp: "ripple",
  sol: "solana",
  bnb: "binancecoin",
  ada: "cardano",
  doge: "dogecoin",
  matic: "matic-network",
  dot: "polkadot",
  ltc: "litecoin",
  avax: "avalanche-2",
  link: "chainlink",
  uni: "uniswap",
  atom: "cosmos",
  gold: "pax-gold",
  silver: "kinesis-silver",
};

interface HistoryAsset {
  identifier: string;
  asset_type: string;
  quantity: number;
  currency?: string;
  /** For real_estate, fiat, private_equity: constant value in EUR for every day */
  constantValue?: number;
}

/** Yahoo Finance chart: 1 year daily. Returns (timestamp_sec[], close[]) in asset currency. */
async function fetchYahooHistory(
  symbol: string
): Promise<{
  timestamps: number[];
  closes: number[];
  currency: string;
} | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=1d&range=1y`,
      { headers: { "User-Agent": YAHOO_USER_AGENT } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { currency?: string };
          timestamp?: number[];
          indicators?: {
            quote?: Array<{ close?: (number | null)[] }>;
          };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const timestamps = result?.timestamp;
    const closes = result?.indicators?.quote?.[0]?.close;
    const currency = (result?.meta?.currency ?? "USD").toUpperCase();
    if (
      !Array.isArray(timestamps) ||
      !Array.isArray(closes) ||
      timestamps.length !== closes.length
    )
      return null;
    const valid: { t: number; c: number }[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const c = closes[i];
      if (typeof c === "number" && c > 0) valid.push({ t: timestamps[i], c });
    }
    if (valid.length < 2) return null;
    return {
      timestamps: valid.map((x) => x.t),
      closes: valid.map((x) => x.c),
      currency,
    };
  } catch {
    return null;
  }
}

/** CoinGecko market_chart: prices in EUR */
async function fetchCoingeckoHistory(
  coingeckoId: string,
  currency: string
): Promise<{ timestamps: number[]; prices: number[] } | null> {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(
        coingeckoId
      )}/market_chart?vs_currency=${encodeURIComponent(currency)}&days=${DAYS}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      prices?: [number, number][];
    };
    const prices = data.prices;
    if (!Array.isArray(prices) || prices.length < 2) return null;
    prices.sort((a, b) => a[0] - b[0]);
    return {
      timestamps: prices.map((p) => Math.floor(p[0] / 1000)),
      prices: prices.map((p) => p[1]),
    };
  } catch {
    return null;
  }
}

function toDailyPoints(
  timestamps: number[],
  values: number[]
): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < timestamps.length; i++) {
    const d = new Date(timestamps[i] * 1000);
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getUTCDate()).padStart(2, "0")}`;
    map.set(key, values[i]);
  }
  return map;
}

/** All calendar days in the last DAYS days */
function dateRange(): string[] {
  const out: string[] = [];
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - DAYS);
  const d = new Date(start);
  while (d <= end) {
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getUTCDate()).padStart(2, "0")}`
    );
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Forward-fill a series to all dates and return value per date */
function fillSeries(
  dates: string[],
  pointMap: Map<string, number>
): Map<string, number> {
  const result = new Map<string, number>();
  let last = 0;
  for (const d of dates) {
    if (pointMap.has(d)) last = pointMap.get(d)!;
    if (last > 0) result.set(d, last);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { assets: HistoryAsset[] };
    const { assets } = body;
    if (
      !Array.isArray(assets) ||
      assets.length === 0 ||
      assets.length > MAX_ASSETS
    ) {
      return new Response(
        JSON.stringify({
          error: `assets required (1-${MAX_ASSETS} items)`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let usdToEur = 0.92;
    try {
      const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
      const data = (await res.json()) as { rates?: { EUR?: number } };
      usdToEur = data.rates?.EUR ?? 0.92;
    } catch {
      /* use default */
    }
    const gbpToEur = 1.17;
    const chfToEur = 1.05;
    const cadToEur = 0.68;

    const dates = dateRange();
    const seriesByAsset: Map<string, number>[] = [];

    for (const a of assets) {
      const qty = Math.max(0, Number(a.quantity)) || 1;
      const currency = (a.currency || "eur").toLowerCase();

      if (typeof a.constantValue === "number" && a.constantValue >= 0) {
        const constant = a.constantValue;
        const m = new Map<string, number>();
        for (const d of dates) m.set(d, constant);
        seriesByAsset.push(m);
        continue;
      }

      const isYahoo = ["stock", "etf", "fund", "commodity"].includes(
        a.asset_type
      );
      const isCrypto = a.asset_type === "crypto";
      const isMetal = a.asset_type === "precious_metals";

      if (isYahoo) {
        const sym = a.identifier.trim();
        const y = await fetchYahooHistory(sym);
        if (!y) continue;
        const pointMap = toDailyPoints(y.timestamps, y.closes);
        let fx = 1;
        if (currency === "eur") {
          if (y.currency === "USD") fx = usdToEur;
          else if (y.currency === "GBP") fx = gbpToEur;
          else if (y.currency === "CHF") fx = chfToEur;
          else if (y.currency === "CAD") fx = cadToEur;
        }
        const filled = fillSeries(dates, pointMap);
        const valued = new Map<string, number>();
        filled.forEach((v, d) => valued.set(d, v * qty * fx));
        seriesByAsset.push(valued);
      } else if (isCrypto || isMetal) {
        const rawId = a.identifier.trim().toLowerCase().replace(/\s+/g, "-");
        const cgId = SYMBOL_TO_COINGECKO_ID[rawId] ?? rawId;
        const c = await fetchCoingeckoHistory(cgId, currency);
        if (!c) continue;
        const pointMap = toDailyPoints(c.timestamps, c.prices);
        const filled = fillSeries(dates, pointMap);
        const valued = new Map<string, number>();
        filled.forEach((v, d) => valued.set(d, v * qty));
        seriesByAsset.push(valued);
      }
    }

    const aggregated: { date: string; value: number }[] = [];
    for (const d of dates) {
      let sum = 0;
      for (const m of seriesByAsset) {
        const v = m.get(d);
        if (typeof v === "number") sum += v;
      }
      if (sum > 0 || aggregated.length > 0)
        aggregated.push({ date: d, value: Math.round(sum * 100) / 100 });
    }

    return new Response(JSON.stringify({ series: aggregated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
