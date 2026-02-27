import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deductTokens, TOKEN_COSTS } from "../_shared/tokens.ts";
import { isAdmin } from "../_shared/roles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      messages: Array<{
        role: "user" | "assistant" | "system";
        content: string;
      }>;
      portfolioContext: {
        totalValue: number;
        totalCost: number;
        roi: number;
        byType: { type: string; value: number }[];
        assets?: Array<{
          name: string;
          asset_type: string;
          cost: number;
          currentValue: number;
          roi: number;
        }>;
      };
      mode?: "default" | "warren";
    };

    const { messages, portfolioContext, mode = "default" } = body;
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const isWarren = mode === "warren";
    if (!isWarren && !portfolioContext) {
      return new Response(
        JSON.stringify({
          error: "portfolioContext required when mode is not warren",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const ctx = portfolioContext ?? {
      totalValue: 0,
      totalCost: 0,
      roi: 0,
      byType: [] as { type: string; value: number }[],
      assets: [] as Array<{
        name: string;
        asset_type: string;
        cost: number;
        currentValue: number;
        roi: number;
      }>,
    };

    const admin = await isAdmin(supabaseAdmin, user.id);
    if (!admin) {
      const deduct = await deductTokens(
        supabaseAdmin,
        user.id,
        TOKEN_COSTS.portfolio_chat,
        "portfolio_chat",
        { mode: isWarren ? "warren" : "default" }
      );
      if (!deduct.ok) {
        return new Response(
          JSON.stringify({ error: deduct.message, code: "INSUFFICIENT_TOKENS" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const assetsBlob =
      ctx.assets && ctx.assets.length > 0
        ? `\nHoldings:\n${ctx.assets
            .map(
              (a) =>
                `- ${a.name} (${
                  a.asset_type
                }): cost ${a.cost.toLocaleString()}€, value ${a.currentValue.toLocaleString()}€, ROI ${a.roi.toFixed(
                  1
                )}%`
            )
            .join("\n")}`
        : "";

    const hasPortfolio = ctx.totalValue > 0 || ctx.assets?.length;
    const portfolioSummary = hasPortfolio
      ? `Portfolio summary:
- Total value: ${ctx.totalValue.toLocaleString()}€
- Total cost: ${ctx.totalCost.toLocaleString()}€
- ROI: ${(ctx.roi ?? 0).toFixed(1)}%
- Allocation by type: ${
          (ctx.byType ?? [])
            .map((t) => `${t.type}: ${t.value.toLocaleString()}€`)
            .join(", ") || "N/A"
        }${assetsBlob}`
      : "The user has not added any holdings yet; portfolio is empty.";

    const systemContent = isWarren
      ? `You are Warren AI, an AI-powered financial researcher and advisor. You provide clear, professional analysis and education on investing and portfolio management. You have access to the user's portfolio data when available. Use ONLY the following context for portfolio-specific questions; for general investing questions use your knowledge.

${portfolioSummary}

Guidelines:
- Answer in the same language the user writes in.
- Be concise but thorough; use bullet points when listing several points.
- For portfolio questions, base answers strictly on the data above. Do not invent figures.
- For general questions (e.g. what is Sharpe ratio, how to diversify), give accurate educational answers.
- Do not recommend specific products or give regulated financial advice; frame suggestions as educational.`
      : `You are a helpful portfolio advisor. The user can ask you questions about their portfolio. Use ONLY the following context. If the question is not about this data, say you can only answer questions about this portfolio.

${portfolioSummary}

Answer briefly and in the same language the user writes in. Do not make up data.`;

    const openaiMessages = [
      { role: "system" as const, content: systemContent },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
      })),
    ];

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
          messages: openaiMessages,
          max_tokens: 500,
        }),
      }
    );

    const openaiData = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (openaiData.error) {
      return new Response(
        JSON.stringify({
          error: openaiData.error.message ?? "OpenAI error",
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const content =
      openaiData.choices?.[0]?.message?.content?.trim() ?? "No response.";
    return new Response(
      JSON.stringify({ message: { role: "assistant" as const, content } }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
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
