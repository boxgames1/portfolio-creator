/** Error thrown when the backend returns 402 Insufficient Tokens */
export const INSUFFICIENT_TOKENS = "INSUFFICIENT_TOKENS";

export function isInsufficientTokensError(err: unknown): boolean {
  if (err instanceof Error && err.message === INSUFFICIENT_TOKENS) return true;
  if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: string }).code === "INSUFFICIENT_TOKENS"
  )
    return true;
  return false;
}

/**
 * After supabase.functions.invoke, check if the response indicates insufficient tokens (402).
 * Call this before throwing on generic error so the UI can show a specific message and link to Account.
 */
export function throwIfInsufficientTokens(
  data: { code?: string } | null,
  error: unknown = null
): void {
  if (data && typeof data === "object" && "code" in data && data.code === "INSUFFICIENT_TOKENS") {
    const e = new Error(INSUFFICIENT_TOKENS) as Error & { code: string };
    e.code = "INSUFFICIENT_TOKENS";
    throw e;
  }
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: string }).code === "INSUFFICIENT_TOKENS"
  ) {
    const e = new Error(INSUFFICIENT_TOKENS) as Error & { code: string };
    e.code = "INSUFFICIENT_TOKENS";
    throw e;
  }
}
