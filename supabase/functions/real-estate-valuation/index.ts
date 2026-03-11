import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { deductTokens, TOKEN_COSTS } from "../_shared/tokens.ts";
import { isAdmin } from "../_shared/roles.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an AI real estate valuation assistant. The user will provide details about a property they want to value. Your job is to give a reasoned estimate of its market value based on the information provided.

Guidelines:
- Answer in the same language the user writes in.
- Consider: location (city, neighborhood, country), property type (apartment, house, land), size (sqm, rooms), condition (new, renovated, needs work), features (garage, garden, terrace, views), comparable sales if mentioned, and any other relevant details.
- If the user provides insufficient information, ask for key missing details (e.g. location, approximate size) before giving a rough estimate.
- Give a value range (e.g. 250,000€–300,000€) rather than a single number when uncertainty is high. But range can be up to 10%. We prefer accurate ranges over rough estimates.
- Explain the main factors driving your estimate.
- Be concise but thorough; use bullet points when listing factors.
- Do not recommend specific agents or give regulated advice; frame this as an educational estimate only.
- If the property is outside your knowledge (e.g. very obscure location), say so and give general guidance on how to get a proper valuation.`;

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

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const openaiKey = Deno.env.get("OPENAI_API_KEY");

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser(token);
    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message || "Invalid JWT" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (!openaiKey) {
      return new Response(JSON.stringify({ error: "OpenAI not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as { input: string };
    const input = typeof body?.input === "string" ? body.input.trim() : "";
    if (!input) {
      return new Response(JSON.stringify({ error: "input required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = await isAdmin(supabaseAdmin, user.id);
    if (!admin) {
      const deduct = await deductTokens(
        supabaseAdmin,
        user.id,
        TOKEN_COSTS.real_estate_valuation,
        "real_estate_valuation",
        {}
      );
      if (!deduct.ok) {
        return new Response(
          JSON.stringify({
            error: deduct.message,
            code: "INSUFFICIENT_TOKENS",
          }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

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
          messages: [
            { role: "system" as const, content: SYSTEM_PROMPT },
            { role: "user" as const, content: input },
          ],
          max_tokens: 600,
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

    const response =
      openaiData.choices?.[0]?.message?.content?.trim() ?? "No response.";

    await supabaseAdmin.from("real_estate_valuation_requests").insert({
      user_id: user.id,
      input,
      response,
    });

    return new Response(JSON.stringify({ response }), {
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
