import { createClient } from "@/lib/supabase/server";
import { findUserByPhone } from "@/lib/userLookup";
import { sendPhoneOtp } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function OPTIONS() {
  return corsPreflight();
}

/** Adds a phone number to an already-authenticated (usually email-signup)
 *  account — same WhatsApp OTP mechanism as signup, just gated on "does
 *  this number belong to a DIFFERENT account" instead of signup's "does
 *  this number belong to any account at all" (this one's fine belonging
 *  to the caller, since they might be retrying/re-verifying their own). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return corsJson({ error: "Not signed in." }, { status: 401 });

  const { phone } = (await request.json()) as { phone?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return corsJson({ error: "Enter a valid mobile number." }, { status: 400 });
  }

  const existing = await findUserByPhone(phone);
  if (existing && existing.id !== user.id) {
    return corsJson(
      { error: "This mobile number is already linked to another account." },
      { status: 409 },
    );
  }

  const result = await sendPhoneOtp(phone);
  if (!result.ok) {
    return corsJson(
      { error: result.error, retryAfterSeconds: result.retryAfterSeconds },
      { status: 400 },
    );
  }
  return corsJson({ ok: true });
}
