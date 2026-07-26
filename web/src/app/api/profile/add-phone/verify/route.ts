import { createClient } from "@/lib/supabase/server";
import { verifyPhoneOtp, consumePhoneVerification } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function OPTIONS() {
  return corsPreflight();
}

/** Verifies the WhatsApp code only — setting the phone on the account
 *  itself happens client-side right after this succeeds, via
 *  supabase.auth.updateUser({ phone }) on the caller's own authenticated
 *  session (GOTRUE_SMS_AUTOCONFIRM is on, so that call confirms it
 *  immediately, same as phone signup never needing a second GoTrue-side
 *  verify). This route only proves the number belongs to whoever's
 *  asking, same custom phone_otp_challenges table signup already uses. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return corsJson({ error: "Not signed in." }, { status: 401 });

  const { phone, code } = (await request.json()) as { phone?: string; code?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return corsJson({ error: "Invalid request." }, { status: 400 });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return corsJson({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await verifyPhoneOtp(phone, code);
  if (!result.ok) {
    return corsJson({ error: result.error }, { status: 400 });
  }
  await consumePhoneVerification(phone);
  return corsJson({ ok: true });
}
