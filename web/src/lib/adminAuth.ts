import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";

export type AdminIdentity = {
  userId: string;
  email: string;
  role: string;
};

/** Returns the admin identity for the current session, or null. The
 *  membership check runs with service_role — admin_users has no RLS
 *  policies on purpose, so it is invisible to normal clients. */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const db = createAdminClient();
  const { data } = await db
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return null;

  return { userId: user.id, email: user.email ?? "", role: data.role };
}
