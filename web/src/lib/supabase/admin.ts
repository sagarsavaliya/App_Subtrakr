import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/** service_role client — bypasses RLS. Server-side ONLY: never import from
 *  a client component. Used for admin_users / app_settings / admin views. */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
