import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deductTokens, TOKEN_COSTS } from "../_shared/tokens.ts";
import { isAdmin } from "../_shared/roles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_HOURS = 24;
const CACHE_RETENTION_DAYS = 7;
const MAX_CACHE_ENTRIES_PER_USER = 50;

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      portfolio: {
        totalValue: number;
        totalCost: number;
        roi: number;
        byType: { type: string; value: number }[];
      };
      assets?: Array<{
        name: string;
        asset_type: string;
        identifier: string;
        cost: number;
        currentValue: number;
        roi: number;
      }>;
    };
    const { portfolio, assets: assetsList } = body;

    const cacheKey = `sentiment-${user.id}-${portfolio.totalValue}-${
      portfolio.totalCost
    }-${JSON.stringify(portfolio.byType)}`;

    const cacheCutoff = new Date(
      Date.now() - CACHE_HOURS * 60 * 60 * 1000
    ).toISOString();
    const { data: cached } = await supabaseAdmin
      .from("portfolio_sentiment_cache")
      .select("response")
      .eq("user_id", user.id)
      .eq("cache_key", cacheKey)
      .gt("created_at", cacheCutoff)
      .single();

    if (cached?.response) {
      return new Response(JSON.stringify(cached.response), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!openaiKey) {
      return new Response(
        JSON.stringify({
          value: 50,
          explanation: "OpenAI not configured. Sentiment cannot be calculated.",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const admin = await isAdmin(supabaseAdmin, user.id);
    if (!admin) {
      const deduct = await deductTokens(
        supabaseAdmin,
        user.id,
        TOKEN_COSTS.portfolio_sentiment,
        "portfolio_sentiment",
        {}
      );
      if (!deduct.ok) {
        return new Response(
          JSON.stringify({ error: deduct.message, code: "INSUFFICIENT_TOKENS" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const assetsContext =
      assetsList && assetsList.length > 0
        ? `\n\nHoldings:\n${assetsList
            .map(
              (a) =>
                `- ${a.name} (${a.asset_type}, ${
                  a.identifier
                }): ${a.currentValue.toLocaleString()}€, ROI ${a.roi.toFixed(
                  1
                )}%`
            )
            .join("\n")}`
        : "";

    const prompt = `You are a portfolio analyst. Analyze this portfolio's ALLOCATION and COMPOSITION across ALL asset types (stocks, ETFs, funds, crypto, real estate, commodities, fiat, etc.) to infer the investor's sentiment.

Fear & Greed scale (0 = Extreme Fear, 100 = Extreme Greed):
- 0-24 Extreme Fear: Heavy cash/fiat, very defensive, minimal risk
- 25-44 Fear: Conservative allocation, bonds/real estate, low equity
- 45-54 Neutral: Balanced, diversified across asset types
- 55-74 Greed: Aggressive, high equity/crypto, concentrated bets
- 75-100 Extreme Greed: Very concentrated, crypto-heavy, speculative

Consider: allocation by type, diversification, risk level, concentration, ROI. Base this on the PORTFOLIO's allocation and structure, not external market sentiment.

Portfolio: Total value ${portfolio.totalValue.toLocaleString()}€, Total cost ${portfolio.totalCost.toLocaleString()}€, ROI ${
      portfolio.roi?.toFixed(1) ?? 0
    }%
Allocation: ${
      portfolio.byType
        ?.map(
          (t: { type: string; value: number }) =>
            `${t.type}: ${t.value.toLocaleString()}€`
        )
        .join(", ") || "N/A"
    }${assetsContext}

Respond with JSON only: { "value": number (0-100), "explanation": string }
The explanation should be 1-2 sentences explaining why the portfolio reflects this sentiment level.`;

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
          max_tokens: 200,
        }),
      }
    );

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || "{}";
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? jsonMatch[0] : rawContent;
    let parsed: { value?: number; explanation?: string };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        value: 50,
        explanation: "Unable to parse AI response.",
      };
    }

    const value = Math.min(100, Math.max(0, parsed.value ?? 50));
    const response = {
      value,
      explanation: parsed.explanation ?? "Sentiment analysis complete.",
    };

    await supabaseAdmin.from("portfolio_sentiment_cache").insert({
      user_id: user.id,
      cache_key: cacheKey,
      response,
    });

    // Eviction: remove old entries and enforce per-user cap
    const evictionCutoff = new Date(
      Date.now() - CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    await supabaseAdmin
      .from("portfolio_sentiment_cache")
      .delete()
      .eq("user_id", user.id)
      .lt("created_at", evictionCutoff);

    // Cap: keep only the N most recent per user
    const { data: all } = await supabaseAdmin
      .from("portfolio_sentiment_cache")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (all && all.length > MAX_CACHE_ENTRIES_PER_USER) {
      const toDelete = all
        .slice(0, all.length - MAX_CACHE_ENTRIES_PER_USER)
        .map((r) => r.id);
      await supabaseAdmin
        .from("portfolio_sentiment_cache")
        .delete()
        .in("id", toDelete);
    }

    return new Response(JSON.stringify(response), {
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
