import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const STOCK_CACHE_MINUTES = 5;
const CRYPTO_CACHE_MINUTES = 1;
const RE_CACHE_HOURS = 24;
const RE_ESTIMATION_CACHE_RETENTION_DAYS = 7;

// CoinGecko uses coin IDs (e.g. "ripple") not symbols (e.g. "xrp")
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  btc: "bitcoin",
  eth: "ethereum",
  xrp: "ripple",
  usdc: "usd-coin",
  usdt: "tether",
  bnb: "binancecoin",
  ada: "cardano",
  sol: "solana",
  doge: "dogecoin",
  dot: "polkadot",
  matic: "matic-network",
  shib: "shiba-inu",
  ltc: "litecoin",
  avax: "avalanche-2",
  link: "chainlink",
  uni: "uniswap",
  atom: "cosmos",
  xlm: "stellar",
  algo: "algorand",
  vet: "vechain",
  fil: "filecoin",
  trx: "tron",
  near: "near",
  apt: "aptos",
  arb: "arbitrum",
  op: "optimism",
  inj: "injective-protocol",
  sui: "sui",
  sei: "sei-network",
  pepe: "pepe",
  wif: "dogwifcoin",
  bch: "bitcoin-cash",
  etc: "ethereum-classic",
};

// Physical gold/silver – use tokenized metals as spot proxies (per oz)
const METAL_TO_COINGECKO_ID: Record<string, string> = {
  gold: "pax-gold",
  silver: "kinesis-silver",
};

interface PriceRequest {
  identifier: string;
  asset_type: string;
  currency?: string;
}

interface PriceResult {
  price: number;
  source: string;
}

function looksLikeIsin(s: string): boolean {
  const cleaned = s.trim().toUpperCase();
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(cleaned);
}

async function fetchUsdToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = (await res.json()) as { rates?: { EUR?: number } };
    return data.rates?.EUR ?? 0.92;
  } catch {
    return 0.92;
  }
}

async function fetchGbpToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/GBP");
    const data = (await res.json()) as { rates?: { EUR?: number } };
    return data.rates?.EUR ?? 1.17;
  } catch {
    return 1.17;
  }
}

async function fetchChfToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/CHF");
    const data = (await res.json()) as { rates?: { EUR?: number } };
    return data.rates?.EUR ?? 1.05;
  } catch {
    return 1.05;
  }
}

async function fetchCadToEurRate(): Promise<number> {
  try {
    const res = await fetch("https://api.exchangerate-api.com/v4/latest/CAD");
    const data = (await res.json()) as { rates?: { EUR?: number } };
    return data.rates?.EUR ?? 0.68;
  } catch {
    return 0.68;
  }
}

/** Infer quote currency from Alpha Vantage symbol suffix (GLOBAL_QUOTE doesn't return currency) */
function inferCurrencyFromSymbol(symbol: string): string {
  const s = symbol.toUpperCase();
  if (/\.(TRT|TRV|TO|V|TSXV)$/.test(s)) return "CAD";
  if (/\.(SW)$/.test(s)) return "CHF";
  if (/\.(DEX|DE|F|PA|AS|MI)$/.test(s)) return "EUR";
  if (/\.LON$/.test(s)) return "GBP";
  if (/\.(L)$/.test(s)) return "USD"; // .L = LSE, often USD-denominated ETFs/stocks
  return "USD";
}

async function fetchAlphaVantageQuote(
  symbol: string,
  apiKey: string
): Promise<{ price: number; currency: string } | null> {
  if (
    !["OM.TO", "AGX.V", "SCOT.V", "GRSL.V", "GGD.TO", "GSVR.V"].includes(symbol)
  ) {
    return null;
  }
  try {
    const res = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
        symbol
      )}&apikey=${apiKey}`
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      "Global Quote"?: { "05. price"?: string };
    };
    const quote = data["Global Quote"];
    const priceStr = quote?.["05. price"];
    if (!priceStr) return null;
    const price = parseFloat(priceStr);
    if (isNaN(price) || price <= 0) return null;
    const currency = inferCurrencyFromSymbol(symbol);
    return { price, currency };
  } catch {
    return null;
  }
}

const YAHOO_USER_AGENT =
  "Mozilla/5.0 (compatible; PortfolioApp/1.0; +https://github.com)";

async function fetchYahooQuote(symbol: string): Promise<{
  price: number;
  currency: string;
} | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?interval=1d&range=1d`,
      { headers: { "User-Agent": YAHOO_USER_AGENT } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: { regularMarketPrice?: number; currency?: string };
        }>;
      };
    };
    const result = data.chart?.result?.[0];
    const price = result?.meta?.regularMarketPrice;
    const currency = (result?.meta?.currency ?? "USD").toUpperCase();
    if (typeof price === "number" && price > 0) {
      return { price, currency };
    }
    return null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const finnhubKey = Deno.env.get("FINNHUB_API_KEY");
    const tiingoKey = Deno.env.get("TIINGO_API_KEY");
    const alphaVantageKey = Deno.env.get("ALPHA_VANTAGE_API_KEY");
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = (await req.json()) as {
      requests: PriceRequest[];
      forceRefresh?: boolean;
    };
    const { requests, forceRefresh } = body;
    const results: Record<string, PriceResult> = {};
    let didUpsertRealEstate = false;

    // Fetch FX rates once at the start for EUR conversion
    const [usdToEurRate, gbpToEurRate, chfToEurRate, cadToEurRate] =
      await Promise.all([
        fetchUsdToEurRate(),
        fetchGbpToEurRate(),
        fetchChfToEurRate(),
        fetchCadToEurRate(),
      ]);

    const pendingCrypto: {
      r: PriceRequest;
      cacheKey: string;
      cacheIdentifier: string;
      coingeckoId: string;
      currency: string;
      assetType: string;
    }[] = [];

    for (const r of requests) {
      const isStock = ["stock", "commodity"].includes(r.asset_type);
      const isEtfOrFund = ["etf", "fund"].includes(r.asset_type);
      const isCrypto = r.asset_type === "crypto";
      const isPreciousMetals = r.asset_type === "precious_metals";
      const isRealEstate = r.asset_type === "real_estate";
      const currency =
        isCrypto || isPreciousMetals
          ? (r.currency || "eur").toLowerCase()
          : "eur";
      const cacheKey =
        isCrypto || isPreciousMetals
          ? `${r.identifier.trim().toLowerCase()}-${currency}`
          : `${r.identifier}-${currency}`;

      const cacheMinutes =
        isStock || isEtfOrFund
          ? STOCK_CACHE_MINUTES
          : isCrypto || isPreciousMetals
          ? CRYPTO_CACHE_MINUTES
          : RE_CACHE_HOURS * 60;
      const cacheCutoff = new Date(
        Date.now() - cacheMinutes * 60 * 1000
      ).toISOString();

      const cacheIdentifier =
        isCrypto || isPreciousMetals
          ? r.identifier.trim().toLowerCase()
          : r.identifier;
      let cached: { price: number; source: string | null } | null = null;
      if (!forceRefresh) {
        const { data } = await supabase
          .from("price_cache")
          .select("price, source")
          .eq("identifier", cacheIdentifier)
          .eq("asset_type", r.asset_type)
          .eq("currency", currency)
          .gt("fetched_at", cacheCutoff)
          .single();
        cached = data;
      }

      if (cached) {
        const cachedSource = cached.source || "cache";
        // Don't use cached purchase_price for real estate - retry OpenAI
        if (isRealEstate && cachedSource === "purchase_price") {
          /* fall through to fetch */
        } else {
          results[cacheKey] = {
            price: Number(cached.price),
            source: cachedSource,
          };
          continue;
        }
      }

      let price: number | null = null;
      let source = "";

      // ETF/Fund: Alpha Vantage first (EUR-friendly), then Finnhub, Yahoo
      if (isEtfOrFund && (alphaVantageKey || finnhubKey)) {
        let symbol: string | null = null;
        if (looksLikeIsin(r.identifier) && finnhubKey) {
          try {
            const searchRes = await fetch(
              `https://finnhub.io/api/v1/search?q=${encodeURIComponent(
                r.identifier.trim().toUpperCase()
              )}&token=${finnhubKey}`
            );
            const searchData = (await searchRes.json()) as {
              result?: Array<{ symbol?: string; type?: string }>;
            };
            const etfMatch = searchData.result?.find(
              (x) =>
                x.type === "ETP" ||
                x.type === "ETF" ||
                (x.symbol && /\.(DE|PA|AS|SW|MI|L|F)$/i.test(x.symbol))
            );
            const first = etfMatch ?? searchData.result?.[0];
            symbol = first?.symbol ?? null;
          } catch {
            /* fall through */
          }
        } else {
          symbol = r.identifier.trim() || null;
        }
        if (symbol && alphaVantageKey) {
          const av = await fetchAlphaVantageQuote(symbol, alphaVantageKey);
          if (av && av.price > 0) {
            price = av.price;
            source = "alphavantage";
            if (currency === "eur" && av.currency !== "EUR") {
              if (av.currency === "USD") price = price * usdToEurRate;
              else if (av.currency === "GBP") price = price * gbpToEurRate;
              else if (av.currency === "CHF") price = price * chfToEurRate;
              else if (av.currency === "CAD") price = price * cadToEurRate;
            }
          }
        }
        if (!price && symbol && finnhubKey) {
          try {
            const quoteRes = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
                symbol
              )}&token=${finnhubKey}`
            );
            const quoteData = (await quoteRes.json()) as {
              c?: number;
              error?: string;
            };
            if (
              !quoteData.error &&
              quoteData.c &&
              typeof quoteData.c === "number" &&
              quoteData.c > 0
            ) {
              price = quoteData.c;
              source = "finnhub";
            }
          } catch {
            /* fall through */
          }
        }
        // Finnhub free tier only supports US markets; LSE/European symbols return
        // "You don't have access to this resource". Fall back to Yahoo Finance.
        if (!price && symbol) {
          const yahoo = await fetchYahooQuote(symbol);
          if (yahoo) {
            price = yahoo.price;
            source = "yahoo";
            if (currency === "eur") {
              if (yahoo.currency === "GBP") price = price * gbpToEurRate;
              else if (yahoo.currency === "USD") price = price * usdToEurRate;
            }
          }
        }
        if (price !== null && source === "finnhub" && currency === "eur") {
          price = price * usdToEurRate;
        }
      }

      // Stock/Commodity: Alpha Vantage first (EUR-friendly), then Tiingo, Finnhub, Yahoo
      if (isStock && (alphaVantageKey || tiingoKey || finnhubKey)) {
        let stockSymbol: string = r.identifier.trim();
        if (looksLikeIsin(stockSymbol) && finnhubKey) {
          try {
            const searchRes = await fetch(
              `https://finnhub.io/api/v1/search?q=${encodeURIComponent(
                stockSymbol.toUpperCase()
              )}&token=${finnhubKey}`
            );
            const searchData = (await searchRes.json()) as {
              result?: Array<{ symbol?: string; type?: string }>;
            };
            const first = searchData.result?.[0];
            if (first?.symbol) {
              stockSymbol = first.symbol;
            }
          } catch {
            /* fall through with original identifier */
          }
        }
        if (alphaVantageKey) {
          const av = await fetchAlphaVantageQuote(stockSymbol, alphaVantageKey);
          if (av && av.price > 0) {
            price = av.price;
            source = "alphavantage";
            if (currency === "eur" && av.currency !== "EUR") {
              if (av.currency === "USD") price = price * usdToEurRate;
              else if (av.currency === "GBP") price = price * gbpToEurRate;
              else if (av.currency === "CHF") price = price * chfToEurRate;
              else if (av.currency === "CAD") price = price * cadToEurRate;
            }
          }
        }

        if (!price && tiingoKey) {
          try {
            // Tiingo expects base ticker only (e.g. PAAS, not PAAS.TO)
            const tiingoSymbol = stockSymbol.replace(/\.[A-Za-z]+$/, "");
            const res = await fetch(
              `https://api.tiingo.com/iex/${encodeURIComponent(
                tiingoSymbol
              )}?token=${tiingoKey}`
            );
            if (res.ok) {
              const data = await res.json();
              const p = data.tngoLast ?? data.last ?? data.prevClose;
              if (typeof p === "number" && p > 0) {
                price = p;
                source = "tiingo";
              }
            }
          } catch {
            /* fall through */
          }
        }
        if (!price && finnhubKey) {
          try {
            const res = await fetch(
              `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
                stockSymbol
              )}&token=${finnhubKey}`
            );
            const data = (await res.json()) as {
              c?: number;
              error?: string;
            };
            if (
              !data.error &&
              data.c &&
              typeof data.c === "number" &&
              data.c > 0
            ) {
              price = data.c;
              source = "finnhub";
            }
          } catch {
            /* fall through */
          }
        }
        if (!price) {
          const yahoo = await fetchYahooQuote(stockSymbol);
          if (yahoo) {
            price = yahoo.price;
            source = "yahoo";
            if (currency === "eur") {
              if (yahoo.currency === "GBP") price = price * gbpToEurRate;
              else if (yahoo.currency === "USD") price = price * usdToEurRate;
            }
          }
        }
        if (
          price !== null &&
          currency === "eur" &&
          (source === "finnhub" || source === "tiingo")
        ) {
          price = price * usdToEurRate;
        }
      }

      if (isCrypto) {
        const cleaned = r.identifier
          .trim()
          .replace(/\s*\([^)]*\)\s*/g, "")
          .trim();
        const rawId = cleaned.toLowerCase().replace(/\s+/g, "-");
        const coingeckoId = SYMBOL_TO_COINGECKO_ID[rawId] ?? rawId;
        pendingCrypto.push({
          r,
          cacheKey,
          cacheIdentifier,
          coingeckoId,
          currency,
          assetType: "crypto",
        });
        continue;
      }

      if (isPreciousMetals) {
        const metalId = r.identifier.trim().toLowerCase();
        const coingeckoId = METAL_TO_COINGECKO_ID[metalId] ?? metalId;
        if (METAL_TO_COINGECKO_ID[metalId]) {
          pendingCrypto.push({
            r,
            cacheKey,
            cacheIdentifier,
            coingeckoId,
            currency,
            assetType: "precious_metals",
          });
        }
        continue;
      }

      if (isRealEstate) {
        const assetId = r.identifier.replace("re-", "");
        const { data: asset, error: assetError } = await supabase
          .from("assets")
          .select("metadata, purchase_price")
          .eq("id", assetId)
          .single();

        if (assetError) {
          console.error("Real estate asset fetch:", assetError);
        }

        if (asset?.purchase_price != null && asset.purchase_price > 0) {
          if (openaiKey) {
            try {
              const meta = (asset.metadata ?? {}) as Record<string, unknown>;
              const prompt = `Estimate the current market value in EUR of a property with: ${JSON.stringify(
                meta
              )}. Purchase price was ${
                asset.purchase_price
              }. Reply with ONLY a number, no explanation.`;
              const openaiRes = await fetch(
                "https://api.openai.com/v1/chat/completions",
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${openaiKey}`,
                  },
                  body: JSON.stringify({
                    model: "gpt-4o-mini",
                    messages: [{ role: "user", content: prompt }],
                    max_tokens: 50,
                  }),
                }
              );
              const openaiData = (await openaiRes.json()) as {
                choices?: Array<{ message?: { content?: string } }>;
                error?: { message?: string };
              };
              if (!openaiRes.ok) {
                console.error(
                  "OpenAI error:",
                  openaiData.error?.message ?? openaiRes.status
                );
              } else {
                const content = openaiData.choices?.[0]?.message?.content;
                const parsed = parseFloat(
                  String(content ?? "").replace(/[^0-9.]/g, "")
                );
                if (!isNaN(parsed) && parsed > 0) {
                  price = parsed;
                  source = "openai";
                }
              }
            } catch (err) {
              console.error("Real estate OpenAI:", err);
            }
          }
          if (price === null) {
            price = Number(asset.purchase_price);
            source = "purchase_price";
          }
        }
      }

      if (price !== null && price > 0) {
        // Don't cache purchase_price fallback so we retry OpenAI next time
        const shouldCache = source !== "purchase_price";
        if (shouldCache) {
          await supabase.from("price_cache").upsert(
            {
              identifier: cacheIdentifier,
              asset_type: r.asset_type,
              price,
              currency,
              source,
              fetched_at: new Date().toISOString(),
            },
            { onConflict: "identifier,asset_type,currency" }
          );
          if (isRealEstate && source === "openai") {
            didUpsertRealEstate = true;
          }
        }
        results[cacheKey] = { price, source };
      }
    }

    // Evict old real estate AI estimations
    if (didUpsertRealEstate) {
      const evictionCutoff = new Date(
        Date.now() - RE_ESTIMATION_CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ).toISOString();
      await supabase
        .from("price_cache")
        .delete()
        .eq("asset_type", "real_estate")
        .lt("fetched_at", evictionCutoff);
    }

    // Batch fetch all crypto in a single CoinGecko API call per currency (avoids rate limiting)
    if (pendingCrypto.length > 0) {
      const byCurrency = new Map<string, typeof pendingCrypto>();
      for (const p of pendingCrypto) {
        const list = byCurrency.get(p.currency) ?? [];
        list.push(p);
        byCurrency.set(p.currency, list);
      }
      for (const [currency, items] of byCurrency) {
        const ids = [...new Set(items.map((p) => p.coingeckoId))];
        try {
          const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${ids
              .map((id) => encodeURIComponent(id))
              .join(",")}&vs_currencies=${encodeURIComponent(currency)}`
          );
          const data = (await res.json()) as Record<
            string,
            Record<string, number>
          >;
          for (const p of items) {
            const val = data[p.coingeckoId]?.[p.currency];
            if (typeof val === "number" && val > 0) {
              await supabase.from("price_cache").upsert(
                {
                  identifier: p.cacheIdentifier,
                  asset_type: p.assetType,
                  price: val,
                  currency: p.currency,
                  source: "coingecko",
                  fetched_at: new Date().toISOString(),
                },
                { onConflict: "identifier,asset_type,currency" }
              );
              results[p.cacheKey] = { price: val, source: "coingecko" };
            }
          }
        } catch {
          /* fall through */
        }
      }
    }

    return new Response(JSON.stringify(results), {
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
