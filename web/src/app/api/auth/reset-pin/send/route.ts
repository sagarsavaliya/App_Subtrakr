import { detectIdentifierType, normalizePhone } from "@/lib/identifier";
import { findUserByPhone, findUserByEmail } from "@/lib/userLookup";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhoneOtp } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

export async function OPTIONS() {
  return corsPreflight();
}

/** Never reveals whether an account exists — always responds { ok: true },
 *  same non-leaking pattern as the old resetPasswordForEmail flow this
 *  replaces. Fires a code on EVERY verified channel the matched account
 *  has (not just the one typed) — the user may not remember which one
 *  they signed up with, and it doubles as a heads-up if the reset wasn't
 *  requested by them. The caller still only *verifies* using the channel
 *  type they typed, since that's the one whose value they actually know. */
export async function POST(request: Request) {
  const { identifier } = (await request.json()) as { identifier?: string };
  const raw = (identifier ?? "").trim();
  const genericOk = () => corsJson({ ok: true });

  const type = detectIdentifierType(raw);
  if (!raw || !type) return genericOk();

  const user =
    type === "phone" ? await findUserByPhone(normalizePhone(raw)) : await findUserByEmail(raw);
  if (!user) return genericOk();

  const sends: Promise<unknown>[] = [];
  if (user.phone) sends.push(sendPhoneOtp(`+${user.phone}`));
  if (user.email) {
    sends.push(
      createAdminClient().auth.signInWithOtp({
        email: user.email,
        options: { shouldCreateUser: false },
      }),
    );
  }
  await Promise.allSettled(sends);
  return genericOk();
}
