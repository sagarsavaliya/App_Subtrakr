import { createAdminClient } from "./supabase/admin";

/** GoTrue's admin listUsers is paginated with no server-side filter by
 *  phone/email — a single page (however large) silently misses anyone
 *  past that page as the user base grows, which would let a duplicate
 *  signup slip past the "already registered" check undetected. This walks
 *  every page instead of assuming one page is enough. */

const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // 50,000 users — safety cap against a runaway loop, not an expected ceiling

async function anyUserMatches(
  matches: (user: { email?: string | null; phone?: string | null }) => boolean,
): Promise<boolean> {
  const db = createAdminClient();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error || !data) {
      // Fails open, like getSetting — this precheck is a UX nicety ("sign
      // in instead"), not the actual integrity guarantee. GoTrue's own
      // unique constraint on phone/email is the real backstop if this
      // says "doesn't exist" when it does.
      console.error("anyUserMatches: listUsers failed:", error?.message);
      return false;
    }
    if (data.users.some(matches)) return true;
    if (data.users.length < PAGE_SIZE) return false;
  }
  return false;
}

export async function userExistsByPhone(phoneE164: string): Promise<boolean> {
  const target = phoneE164.replace("+", "");
  return anyUserMatches((u) => u.phone === target);
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  const target = email.toLowerCase();
  return anyUserMatches((u) => u.email?.toLowerCase() === target);
}
