import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TOKEN_PACKS: Record<string, { tokens: number; unitAmountCents: number }> =
  {
    "100": { tokens: 100, unitAmountCents: 199 },
    "500": { tokens: 500, unitAmountCents: 899 },
    "1000": { tokens: 1000, unitAmountCents: 1499 },
  };

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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
    const appUrl = Deno.env.get("APP_URL") || "http://localhost:5173";

    const body = (await req.json()) as { pack?: string };
    const useTestMode =
      Deno.env.get("STRIPE_TEST_MODE")?.toLowerCase() === "true" ||
      Deno.env.get("STRIPE_TEST_MODE") === "1";

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

    const rawTestKey = Deno.env.get("STRIPE_SECRET_KEY_TEST");
    const rawLiveKey = Deno.env.get("STRIPE_SECRET_KEY");
    const sanitize = (k: string | undefined) =>
      k?.replace(/%+$/, "").replace(/\s+$/, "").trim() || undefined;
    const stripeSecretKeyResolved = useTestMode
      ? sanitize(rawTestKey) || sanitize(rawLiveKey)
      : sanitize(rawLiveKey);

    if (!stripeSecretKeyResolved) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const packKey = body.pack ?? "100";
    const pack = TOKEN_PACKS[packKey];
    if (!pack) {
      return new Response(
        JSON.stringify({ error: "Invalid pack. Use 100, 500, or 1000" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const stripe = new Stripe(stripeSecretKeyResolved, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            product_data: {
              name: `${pack.tokens} AI Tokens`,
              description: `Use tokens for portfolio chat, AI suggestions, sentiment, and real estate estimates. 1 token ≈ 1 cent.`,
              images: [],
            },
            unit_amount: pack.unitAmountCents,
          },
        },
      ],
      success_url: `${appUrl.replace(/\/$/, "")}/account?purchased=1`,
      cancel_url: `${appUrl.replace(/\/$/, "")}/account?canceled=1`,
      metadata: {
        user_id: user.id,
        token_pack: packKey,
        tokens: String(pack.tokens),
      },
      customer_email: user.email ?? undefined,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error:", err);
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
