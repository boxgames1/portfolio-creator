import type { Asset } from "@/types";

const NOW = new Date().toISOString();
const DEMO_USER = "demo-user-id";

/** Fake assets for portfolio demo mode. */
export function getDemoAssets(): Asset[] {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const twoYearsAgo = new Date();
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  return [
    // ETFs
    {
      id: "demo-etf-1",
      user_id: DEMO_USER,
      asset_type: "etf",
      name: "Vanguard S&P 500 UCITS ETF",
      purchase_price: 85,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 50,
      currency: "EUR",
      metadata: { ticker: "VUSA", isin: "IE00B3XXRP09" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-etf-2",
      user_id: DEMO_USER,
      asset_type: "etf",
      name: "iShares Core MSCI World UCITS ETF",
      purchase_price: 72,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 80,
      currency: "EUR",
      metadata: { ticker: "SWDA", isin: "IE00B4L5Y983" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-etf-3",
      user_id: DEMO_USER,
      asset_type: "etf",
      name: "iShares Euro Govt Bond 1-3yr UCITS ETF",
      purchase_price: 102,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 100,
      currency: "EUR",
      metadata: { ticker: "CBU3", isin: "IE00B3F81R35" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-etf-4",
      user_id: DEMO_USER,
      asset_type: "etf",
      name: "Vanguard FTSE All-World UCITS ETF",
      purchase_price: 98,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 25,
      currency: "EUR",
      metadata: { ticker: "VWRA", isin: "IE00BK5BQT80" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Stocks
    {
      id: "demo-stock-1",
      user_id: DEMO_USER,
      asset_type: "stock",
      name: "Apple Inc.",
      purchase_price: 145,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 20,
      currency: "USD",
      metadata: { ticker: "AAPL" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-stock-2",
      user_id: DEMO_USER,
      asset_type: "stock",
      name: "Microsoft Corporation",
      purchase_price: 320,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 10,
      currency: "USD",
      metadata: { ticker: "MSFT" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-stock-3",
      user_id: DEMO_USER,
      asset_type: "stock",
      name: "NVIDIA Corporation",
      purchase_price: 220,
      purchase_date: sixMonthsAgo.toISOString().slice(0, 10),
      quantity: 15,
      currency: "USD",
      metadata: { ticker: "NVDA" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-stock-4",
      user_id: DEMO_USER,
      asset_type: "stock",
      name: "ASML Holding N.V.",
      purchase_price: 650,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 5,
      currency: "EUR",
      metadata: { ticker: "ASML", isin: "NL0010273215" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-stock-5",
      user_id: DEMO_USER,
      asset_type: "stock",
      name: "LVMH Moët Hennessy",
      purchase_price: 780,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 3,
      currency: "EUR",
      metadata: { ticker: "MC", isin: "FR0000121014" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Funds
    {
      id: "demo-fund-1",
      user_id: DEMO_USER,
      asset_type: "fund",
      name: "Fidelity Global Technology Fund",
      purchase_price: 45,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 200,
      currency: "EUR",
      metadata: { ticker: "FGT", isin: "LU1234567890" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Crypto
    {
      id: "demo-crypto-1",
      user_id: DEMO_USER,
      asset_type: "crypto",
      name: "Bitcoin",
      purchase_price: 28000,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 0.15,
      currency: "EUR",
      metadata: { symbol: "BTC", coingecko_id: "bitcoin" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-crypto-2",
      user_id: DEMO_USER,
      asset_type: "crypto",
      name: "Ethereum",
      purchase_price: 1800,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 2,
      currency: "EUR",
      metadata: { symbol: "ETH", coingecko_id: "ethereum" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-crypto-3",
      user_id: DEMO_USER,
      asset_type: "crypto",
      name: "Solana",
      purchase_price: 95,
      purchase_date: sixMonthsAgo.toISOString().slice(0, 10),
      quantity: 50,
      currency: "EUR",
      metadata: { symbol: "SOL", coingecko_id: "solana" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-crypto-4",
      user_id: DEMO_USER,
      asset_type: "crypto",
      name: "USD Coin",
      purchase_price: 1,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 5000,
      currency: "EUR",
      metadata: { symbol: "USDC", coingecko_id: "usd-coin" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Commodity
    {
      id: "demo-commodity-1",
      user_id: DEMO_USER,
      asset_type: "commodity",
      name: "WisdomTree Brent Crude Oil ETC",
      purchase_price: 18.5,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 200,
      currency: "EUR",
      metadata: { ticker: "CRUD" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Precious metals
    {
      id: "demo-gold-1",
      user_id: DEMO_USER,
      asset_type: "precious_metals",
      name: "Gold (Paxos)",
      purchase_price: 1850,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 5,
      currency: "EUR",
      metadata: { metal: "gold" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-silver-1",
      user_id: DEMO_USER,
      asset_type: "precious_metals",
      name: "Silver (Kinesis)",
      purchase_price: 22,
      purchase_date: sixMonthsAgo.toISOString().slice(0, 10),
      quantity: 500,
      currency: "EUR",
      metadata: { metal: "silver" },
      created_at: NOW,
      updated_at: NOW,
    },
    // Real estate (~30% of portfolio for a balanced demo)
    {
      id: "demo-re-1",
      user_id: DEMO_USER,
      asset_type: "real_estate",
      name: "Apartment Downtown",
      purchase_price: 67000,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 1,
      currency: "EUR",
      metadata: { property_type: "apartment", sqm: 85, location: "Barcelona" },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-re-2",
      user_id: DEMO_USER,
      asset_type: "real_estate",
      name: "Holiday let (coast)",
      purchase_price: 44000,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 1,
      currency: "EUR",
      metadata: {
        property_type: "house",
        sqm: 120,
        location: "Costa Brava",
        is_rented: true,
        monthly_rent: 1400,
      },
      created_at: NOW,
      updated_at: NOW,
    },
    // Fiat
    {
      id: "demo-fiat-1",
      user_id: DEMO_USER,
      asset_type: "fiat",
      name: "Savings account",
      purchase_price: 1,
      purchase_date: oneYearAgo.toISOString().slice(0, 10),
      quantity: 25000,
      currency: "EUR",
      metadata: { interest_rate: 2.5 },
      created_at: NOW,
      updated_at: NOW,
    },
    {
      id: "demo-fiat-2",
      user_id: DEMO_USER,
      asset_type: "fiat",
      name: "Term deposit 12M",
      purchase_price: 1,
      purchase_date: sixMonthsAgo.toISOString().slice(0, 10),
      quantity: 15000,
      currency: "EUR",
      metadata: { interest_rate: 3.2 },
      created_at: NOW,
      updated_at: NOW,
    },
    // Private equity
    {
      id: "demo-pe-1",
      user_id: DEMO_USER,
      asset_type: "private_equity",
      name: "Tech Growth Fund III",
      purchase_price: 25000,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 4,
      currency: "EUR",
      notes: "Venture capital fund, 10-year horizon",
      metadata: {},
      created_at: NOW,
      updated_at: NOW,
    },
    // Other
    {
      id: "demo-other-1",
      user_id: DEMO_USER,
      asset_type: "other",
      name: "Collectibles (art)",
      purchase_price: 8000,
      purchase_date: twoYearsAgo.toISOString().slice(0, 10),
      quantity: 1,
      currency: "EUR",
      notes: "Contemporary piece, insured",
      metadata: {},
      created_at: NOW,
      updated_at: NOW,
    },
  ];
}

/** Precomputed portfolio value for demo assets (current prices simulated). */
export function getDemoPortfolio(): {
  totalValue: number;
  totalCost: number;
  byType: { type: string; value: number; cost: number }[];
  assetsWithPrices: {
    id: string;
    currentPrice?: number;
    currentValue?: number;
    costInEur?: number;
    roi?: number;
  }[];
} {
  const assets = getDemoAssets();
  const usdToEur = 0.92;

  const assetsWithPrices = assets.map((a) => {
    const cost =
      a.currency.toUpperCase() === "USD"
        ? a.purchase_price * a.quantity * usdToEur
        : a.purchase_price * a.quantity;
    const multipliers: Record<string, number> = {
      "demo-etf-1": 1.22,
      "demo-etf-2": 1.18,
      "demo-etf-3": 1.02,
      "demo-etf-4": 1.15,
      "demo-stock-1": 1.35,
      "demo-stock-2": 1.28,
      "demo-stock-3": 1.65,
      "demo-stock-4": 1.12,
      "demo-stock-5": 1.08,
      "demo-fund-1": 1.25,
      "demo-crypto-1": 1.8,
      "demo-crypto-2": 1.5,
      "demo-crypto-3": 2.1,
      "demo-crypto-4": 1.0,
      "demo-commodity-1": 0.95,
      "demo-gold-1": 1.12,
      "demo-silver-1": 1.22,
      "demo-re-1": 1.08,
      "demo-re-2": 1.05,
      "demo-fiat-1": 1.025,
      "demo-fiat-2": 1.016,
      "demo-pe-1": 1.18,
      "demo-other-1": 1.15,
    };
    const mult = multipliers[a.id] ?? 1;
    const currentValue =
      a.asset_type === "fiat"
        ? (() => {
            const rate =
              (a.metadata as { interest_rate?: number })?.interest_rate ?? 0;
            const years = a.id === "demo-fiat-2" ? 0.5 : 1;
            return a.quantity * (1 + (rate / 100) * years);
          })()
        : cost * mult;
    const roi = cost > 0 ? ((currentValue - cost) / cost) * 100 : 0;
    return {
      id: a.id,
      currentPrice: a.asset_type === "fiat" ? 1 : cost / a.quantity,
      currentValue,
      costInEur: cost,
      roi,
    };
  });

  let totalValue = 0;
  let totalCost = 0;
  const byTypeMap = new Map<string, { value: number; cost: number }>();

  assetsWithPrices.forEach((p, i) => {
    const a = assets[i];
    totalValue += p.currentValue ?? 0;
    totalCost += p.costInEur ?? 0;
    const existing = byTypeMap.get(a.asset_type) ?? { value: 0, cost: 0 };
    byTypeMap.set(a.asset_type, {
      value: existing.value + (p.currentValue ?? 0),
      cost: existing.cost + (p.costInEur ?? 0),
    });
  });

  const byType = Array.from(byTypeMap.entries()).map(
    ([type, { value, cost }]) => ({
      type,
      value,
      cost,
    })
  );

  return {
    totalValue,
    totalCost,
    byType,
    assetsWithPrices,
  };
}

/** Fake volatility and Sharpe for demo mode (no real series fetch). */
export function getDemoHistoryResult(): {
  volatility: number;
  sharpeRatio: number;
} {
  return { volatility: 0.18, sharpeRatio: 0.72 };
}

/** Fake sentiment for demo mode (no API call). */
export function getDemoSentiment(): {
  value: number;
  explanation: string;
} {
  return {
    value: 58,
    explanation:
      "Demo portfolio shows a balanced mix of equities, crypto, real estate, and cash. Allocation suggests moderate risk tolerance with some growth bias.",
  };
}

/** Fake AI suggestion for demo mode (no API call). */
export function getDemoSuggestion(): {
  rating: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: Array<{ text: string; priority: "high" | "medium" | "low" }>;
} {
  return {
    rating: 7,
    strengths: [
      "Good diversification across asset classes.",
      "Mix of growth (crypto, stocks) and stability (real estate, cash).",
    ],
    weaknesses: [
      "Consider rebalancing if any single asset class drifts far from your target.",
    ],
    suggestions: [
      {
        text: "Review allocation if your risk tolerance has changed.",
        priority: "medium",
      },
      {
        text: "Consider adding bonds or more ETFs for smoother returns.",
        priority: "low",
      },
    ],
  };
}
