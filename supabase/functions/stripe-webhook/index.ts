import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { creditTokens } from "../_shared/tokens.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
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

  const useTestMode =
    Deno.env.get("STRIPE_TEST_MODE")?.toLowerCase() === "true" ||
    Deno.env.get("STRIPE_TEST_MODE") === "1";
  const sanitize = (k: string | undefined) =>
    k?.replace(/%+$/, "").replace(/\s+$/, "").trim() || undefined;
  const stripeSecretKey = sanitize(
    useTestMode
      ? Deno.env.get("STRIPE_SECRET_KEY_TEST")
      : Deno.env.get("STRIPE_SECRET_KEY")
  );
  const webhookSecret = sanitize(
    useTestMode
      ? Deno.env.get("STRIPE_WEBHOOK_SECRET_TEST")
      : Deno.env.get("STRIPE_WEBHOOK_SECRET")
  );

  if (!stripeSecretKey || !webhookSecret) {
    console.error(
      `Stripe not configured for ${useTestMode ? "test" : "live"} mode`
    );
    return new Response(JSON.stringify({ error: "Stripe not configured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: "2023-10-16",
    httpClient: Stripe.createFetchHttpClient(),
  });

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response(JSON.stringify({ error: "Missing stripe-signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    const cryptoProvider = Stripe.createSubtleCryptoProvider();
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      webhookSecret,
      undefined,
      cryptoProvider
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(JSON.stringify({ error: "Invalid signature" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.type !== "checkout.session.completed") {
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const userId = session.metadata?.user_id;
  const tokensStr = session.metadata?.tokens;
  const tokenPack = session.metadata?.token_pack ?? "unknown";

  if (!userId || !tokensStr) {
    console.error(
      "Webhook missing user_id or tokens in metadata",
      session.metadata
    );
    return new Response(JSON.stringify({ error: "Missing metadata" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tokens = parseInt(tokensStr, 10);
  if (isNaN(tokens) || tokens <= 0) {
    console.error("Invalid tokens in metadata", tokensStr);
    return new Response(JSON.stringify({ error: "Invalid tokens" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    await creditTokens(supabaseAdmin, userId, tokens, `stripe_${tokenPack}`, {
      session_id: session.id,
    });
  } catch (err) {
    console.error("Credit tokens failed:", err);
    return new Response(JSON.stringify({ error: "Failed to credit tokens" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
