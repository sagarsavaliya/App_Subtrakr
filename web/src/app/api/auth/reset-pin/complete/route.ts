import { createAdminClient } from "@/lib/supabase/admin";
import { findUserByPhone } from "@/lib/userLookup";
import { isPhoneVerified, consumePhoneVerification } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function OPTIONS() {
  return corsPreflight();
}

/** Phone-channel PIN reset only — there's no session-establishing verify
 *  for phone (it's the custom phone_otp_challenges table, not GoTrue's own
 *  OTP), so unlike the email path this has to reach for the admin API to
 *  set the new password directly. The caller signs in with the new PIN
 *  itself right after this succeeds. */
export async function POST(request: Request) {
  const { phone, pin } = (await request.json()) as { phone?: string; pin?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return corsJson({ error: "Invalid request." }, { status: 400 });
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    return corsJson({ error: "PIN must be exactly 6 digits." }, { status: 400 });
  }

  const verified = await isPhoneVerified(phone);
  if (!verified) {
    return corsJson(
      { error: "Verify your number again before continuing." },
      { status: 400 },
    );
  }

  const user = await findUserByPhone(phone);
  if (!user) {
    return corsJson({ error: "No account found for that number." }, { status: 404 });
  }

  const { error } = await createAdminClient().auth.admin.updateUserById(user.id, {
    password: pin,
  });
  if (error) {
    return corsJson({ error: error.message }, { status: 400 });
  }

  await consumePhoneVerification(phone);
  return corsJson({ ok: true });
}
