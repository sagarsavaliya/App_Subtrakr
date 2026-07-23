import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";
import { sendOtpWhatsApp, whatsappConfigured } from "./whatsapp";

/** Verify-then-set-PIN signup: a phone number must prove ownership via a
 *  WhatsApp-delivered code before an account gets created. This lives
 *  outside GoTrue entirely — GoTrue's own phone signup is only called
 *  afterward (with SMS auto-confirm), once we've already verified the
 *  number ourselves. */

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60_000;
// A verified challenge is only good for this long before completeSignup
// must reject it — closes the window on a stale verification being reused
// long after the user walked away.
const VERIFIED_WINDOW_MS = 30 * 60_000;

function hashCode(phone: string, code: string): string {
  return crypto.createHash("sha256").update(`${phone}:${code}`).digest("hex");
}

function randomCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendPhoneOtp(
  phoneE164: string,
): Promise<{ ok: boolean; error?: string; retryAfterSeconds?: number }> {
  if (!(await whatsappConfigured())) {
    return {
      ok: false,
      error: "Verification isn't set up yet — contact support.",
    };
  }

  const db = createAdminClient();

  const { data: recent } = await db
    .from("phone_otp_challenges")
    .select("created_at")
    .eq("phone", phoneE164)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent) {
    // The cooldown is keyed on the phone number only, shared across every
    // client (web, Android) hitting this same table — a request sent from
    // a different device/tab moments ago blocks this one too, correctly.
    // retryAfterSeconds lets the UI show an actual countdown instead of a
    // bare error, whether this is the very first send or a resend.
    const elapsedMs = Date.now() - new Date(recent.created_at).getTime();
    if (elapsedMs < RESEND_COOLDOWN_MS) {
      return {
        ok: false,
        error: "Please wait a moment before requesting another code.",
        retryAfterSeconds: Math.ceil((RESEND_COOLDOWN_MS - elapsedMs) / 1000),
      };
    }
  }

  const code = randomCode();
  // Clear out any earlier unverified attempt for this number first.
  await db
    .from("phone_otp_challenges")
    .delete()
    .eq("phone", phoneE164)
    .is("verified_at", null);

  const { error } = await db.from("phone_otp_challenges").insert({
    phone: phoneE164,
    code_hash: hashCode(phoneE164, code),
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  });
  if (error) {
    console.error("sendPhoneOtp insert failed:", error.message);
    return { ok: false, error: "Could not start verification. Try again." };
  }

  const sent = await sendOtpWhatsApp(phoneE164.replace("+", ""), code);
  if (!sent.ok) {
    // The real Meta error (template/permission/language mismatch etc.) is
    // logged here with full detail — the user only ever sees the generic
    // message below, since the raw API error can reveal config internals.
    console.error("sendPhoneOtp: WhatsApp send failed:", sent.error);
    return { ok: false, error: "Could not send the WhatsApp message. Try again." };
  }
  return { ok: true };
}

export async function verifyPhoneOtp(
  phoneE164: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const db = createAdminClient();
  const { data } = await db
    .from("phone_otp_challenges")
    .select("id, code_hash, attempts, expires_at")
    .eq("phone", phoneE164)
    .is("verified_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { ok: false, error: "No verification in progress — request a new code." };
  if (new Date(data.expires_at) < new Date()) {
    return { ok: false, error: "That code expired — request a new one." };
  }
  if (data.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many attempts — request a new code." };
  }

  if (data.code_hash !== hashCode(phoneE164, code)) {
    await db
      .from("phone_otp_challenges")
      .update({ attempts: data.attempts + 1 })
      .eq("id", data.id);
    return { ok: false, error: "Incorrect code." };
  }

  await db
    .from("phone_otp_challenges")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", data.id);
  return { ok: true };
}

/** Checked by complete-signup before it ever calls GoTrue — a phone can
 *  only proceed to account creation if it was verified recently. */
export async function isPhoneVerified(phoneE164: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("phone_otp_challenges")
    .select("id")
    .eq("phone", phoneE164)
    .not("verified_at", "is", null)
    .gte("verified_at", new Date(Date.now() - VERIFIED_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return !!data;
}

/** Consumes the verification so it can't be replayed for a second
 *  account after completeSignup succeeds. */
export async function consumePhoneVerification(phoneE164: string): Promise<void> {
  const db = createAdminClient();
  await db.from("phone_otp_challenges").delete().eq("phone", phoneE164);
}
