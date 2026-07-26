import { createAdminClient } from "./supabase/admin";

/** GoTrue's admin listUsers is paginated with no server-side filter by
 *  phone/email — a single page (however large) silently misses anyone
 *  past that page as the user base grows, which would let a duplicate
 *  signup slip past the "already registered" check undetected. This walks
 *  every page instead of assuming one page is enough. */

const PAGE_SIZE = 1000;
const MAX_PAGES = 50; // 50,000 users — safety cap against a runaway loop, not an expected ceiling

export type AdminUser = { id: string; email?: string | null; phone?: string | null };

async function findUserMatching(
  matches: (user: AdminUser) => boolean,
): Promise<AdminUser | null> {
  const db = createAdminClient();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error || !data) {
      // Fails open, like getSetting — this precheck is a UX nicety ("sign
      // in instead"), not the actual integrity guarantee. GoTrue's own
      // unique constraint on phone/email is the real backstop if this
      // says "doesn't exist" when it does.
      console.error("findUserMatching: listUsers failed:", error?.message);
      return null;
    }
    const found = data.users.find(matches);
    if (found) return found;
    if (data.users.length < PAGE_SIZE) return null;
  }
  return null;
}

export async function findUserByPhone(phoneE164: string): Promise<AdminUser | null> {
  const target = phoneE164.replace("+", "");
  return findUserMatching((u) => u.phone === target);
}

export async function findUserByEmail(email: string): Promise<AdminUser | null> {
  const target = email.toLowerCase();
  return findUserMatching((u) => u.email?.toLowerCase() === target);
}

export async function userExistsByPhone(phoneE164: string): Promise<boolean> {
  return !!(await findUserByPhone(phoneE164));
}

export async function userExistsByEmail(email: string): Promise<boolean> {
  return !!(await findUserByEmail(email));
}
