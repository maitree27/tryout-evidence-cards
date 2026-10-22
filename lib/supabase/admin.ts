import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client with full database rights (bypasses row-level security). Never import this in
 * client components. Used only to save AI scores for athletes, who must not be able to write scores themselves.
 * Always check the user's access with their own client BEFORE calling this.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set (see .env.example)");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
