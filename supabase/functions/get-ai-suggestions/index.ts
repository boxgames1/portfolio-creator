import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const CACHE_HOURS = 24;

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

    const { portfolio } = (await req.json()) as {
      portfolio: {
        totalValue: number;
        totalCost: number;
        roi: number;
        byType: { type: string; value: number }[];
      };
    };
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
          suggestions: [],
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = `You are a portfolio advisor. Analyze this portfolio and provide:
1. A rating from 1-10 (number only, first line)
2. 3-5 brief suggestions for improvement (bullet points)

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
    }

Format your response as JSON: { "rating": number, "suggestions": string[] }`;

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
          max_tokens: 500,
        }),
      }
    );

    const openaiData = await openaiRes.json();
    const content = openaiData.choices?.[0]?.message?.content || "{}";
    let parsed: { rating?: number; suggestions?: string[] };
    try {
      parsed = JSON.parse(content);
    } catch {
      parsed = { rating: 5, suggestions: ["Unable to parse AI response."] };
    }

    const response = {
      rating: parsed.rating ?? 5,
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };

    await supabaseAdmin.from("ai_suggestion_cache").insert({
      user_id: user.id,
      cache_key: cacheKey,
      response,
    });

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
