// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseClient = any;

export async function isAdmin(
  supabaseAdmin: SupabaseClient,
  userId: string
): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();
    return data?.role === "admin";
  } catch {
    return false;
  }
}

