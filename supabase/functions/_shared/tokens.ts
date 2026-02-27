/**
 * Token costs per AI operation (with large margin over OpenAI cost).
 * 1 token ≈ 1 cent USD. Used for portfolio chat, suggestions, sentiment, real estate estimate.
 */
export const TOKEN_COSTS = {
  portfolio_chat: 15,
  ai_suggestions: 20,
  portfolio_sentiment: 10,
  real_estate_estimate: 5,
} as const;

export type TokenReference = keyof typeof TOKEN_COSTS;

export interface DeductResult {
  ok: true;
  balanceAfter: number;
}

export interface DeductError {
  ok: false;
  status: 402;
  message: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

/**
 * Deduct tokens for the given user. Uses service-role client.
 * Returns 402 if insufficient balance.
 */
export async function deductTokens(
  supabaseAdmin: SupabaseClient,
  userId: string,
  cost: number,
  reference: TokenReference | string,
  metadata: Record<string, unknown> = {}
): Promise<DeductResult | DeductError> {
  if (cost <= 0) return { ok: true, balanceAfter: 0 };

  const { data: row } = await supabaseAdmin
    .from("user_token_balance")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const current = row?.balance ?? 0;
  if (current < cost) {
    return {
      ok: false,
      status: 402,
      message: "Insufficient tokens. Please buy more in Account.",
    };
  }

  const balanceAfter = current - cost;

  const { error: updateError } = await supabaseAdmin
    .from("user_token_balance")
    .upsert(
      {
        user_id: userId,
        balance: balanceAfter,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (updateError) {
    console.error("Token deduct update error:", updateError);
    return {
      ok: false,
      status: 402,
      message: "Could not deduct tokens. Try again.",
    };
  }

  await supabaseAdmin.from("token_transactions").insert({
    user_id: userId,
    amount: -cost,
    balance_after: balanceAfter,
    kind: "usage",
    reference,
    metadata,
  });

  return { ok: true, balanceAfter };
}

/**
 * Credit tokens (e.g. after Stripe purchase). Creates balance row if missing.
 */
export async function creditTokens(
  supabaseAdmin: SupabaseClient,
  userId: string,
  amount: number,
  reference: string,
  metadata: Record<string, unknown> = {}
): Promise<{ balanceAfter: number }> {
  const { data: row } = await supabaseAdmin
    .from("user_token_balance")
    .select("balance")
    .eq("user_id", userId)
    .single();

  const current = row?.balance ?? 0;
  const balanceAfter = current + amount;

  await supabaseAdmin.from("user_token_balance").upsert(
    {
      user_id: userId,
      balance: balanceAfter,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  await supabaseAdmin.from("token_transactions").insert({
    user_id: userId,
    amount,
    balance_after: balanceAfter,
    kind: "purchase",
    reference,
    metadata,
  });

  return { balanceAfter };
}
