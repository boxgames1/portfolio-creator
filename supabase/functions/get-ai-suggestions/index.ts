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
    const cacheKey = `ai-${user.id}-${portfolio.totalValue}-${
      portfolio.totalCost
    }-${JSON.stringify(portfolio.byType)}`;

    const cacheCutoff = new Date(
      Date.now() - CACHE_HOURS * 60 * 60 * 1000
    ).toISOString();
    const { data: cached } = await supabaseAdmin
      .from("ai_suggestion_cache")
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
          error: "OpenAI not configured",
          rating: 0,
          strengths: [],
          weaknesses: [],
          suggestions: [],
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
        TOKEN_COSTS.ai_suggestions,
        "ai_suggestions",
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
        ? `\n\nHoldings (for identifying underperformers/high-fee assets):\n${assetsList
            .map(
              (a) =>
                `- ${a.name} (${a.asset_type}, ${
                  a.identifier
                }): cost ${a.cost.toLocaleString()}€, value ${a.currentValue.toLocaleString()}€, ROI ${a.roi.toFixed(
                  1
                )}%`
            )
            .join("\n")}`
        : "";

    const prompt = `You are a portfolio advisor. Analyze this portfolio and provide:

1. A rating from 1-10
2. strengths: 2-4 brief strengths of the portfolio (what's working well)
3. weaknesses: 2-4 brief weaknesses or areas of concern
4. suggestions: 3-5 specific, actionable suggestions. Each must have:
   - text: the suggestion
   - priority: "high" | "medium" | "low" based on urgency and criticality
     * high: urgent/critical (e.g. high fees, concentrated risk, underperformers)
     * medium: important but not urgent
     * low: nice-to-have improvements

RULES:
- When suggesting ETFs, stocks, or crypto: ALWAYS include the specific ticker/ISIN (e.g. "VWCE.DE", "IE00B4L5Y983", "BTC"). Add a brief reason and estimated value range if relevant.
- If there are high-fee assets or underperformers in the holdings, NAME them explicitly (use the identifier) and explain why. Mark these as high priority.
- When suggesting REITs (Real Estate Investment Trusts), mention specific examples with tickers (e.g. VNQ, SRET) and a one-line rationale.
- Keep each item concise but specific.

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

Format your response as JSON:
{
  "rating": number,
  "strengths": string[],
  "weaknesses": string[],
  "suggestions": [{"text": string, "priority": "high"|"medium"|"low"}]
}`;

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
          max_tokens: 1000,
        }),
      }
    );

    const openaiData = await openaiRes.json();
    const rawContent = openaiData.choices?.[0]?.message?.content || "{}";
    // Extract JSON: LLMs often wrap in ```json ... ``` or add extra text
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    const content = jsonMatch ? jsonMatch[0] : rawContent;
    let parsed: {
      rating?: number;
      strengths?: string[];
      weaknesses?: string[];
      suggestions?: string[] | Array<{ text: string; priority?: string }>;
    };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = {
        rating: 5,
        strengths: [],
        weaknesses: [],
        suggestions: [
          { text: "Unable to parse AI response.", priority: "medium" },
        ],
      };
    }

    const rawSuggestions = parsed.suggestions;
    const suggestions = Array.isArray(rawSuggestions)
      ? rawSuggestions.map((s) =>
          typeof s === "string"
            ? { text: s, priority: "medium" as const }
            : {
                text: s.text ?? String(s),
                priority: (s.priority === "high" || s.priority === "low"
                  ? s.priority
                  : "medium") as "high" | "medium" | "low",
              }
        )
      : [];

    const response = {
      rating: parsed.rating ?? 5,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : [],
      suggestions,
    };

    await supabaseAdmin.from("ai_suggestion_cache").insert({
      user_id: user.id,
      cache_key: cacheKey,
      response,
    });

    // Eviction: remove old entries and enforce per-user cap
    const evictionCutoff = new Date(
      Date.now() - CACHE_RETENTION_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();
    await supabaseAdmin
      .from("ai_suggestion_cache")
      .delete()
      .eq("user_id", user.id)
      .lt("created_at", evictionCutoff);

    const { data: all } = await supabaseAdmin
      .from("ai_suggestion_cache")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (all && all.length > MAX_CACHE_ENTRIES_PER_USER) {
      const toDelete = all
        .slice(0, all.length - MAX_CACHE_ENTRIES_PER_USER)
        .map((r) => r.id);
      await supabaseAdmin
        .from("ai_suggestion_cache")
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
