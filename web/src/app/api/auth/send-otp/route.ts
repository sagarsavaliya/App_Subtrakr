import { createAdminClient } from "@/lib/supabase/admin";
import { sendPhoneOtp } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const { phone } = (await request.json()) as { phone?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return corsJson({ error: "Enter a valid mobile number." }, { status: 400 });
  }

  // Don't burn a WhatsApp send on a number that's already got an account —
  // GoTrue would reject it at the final step anyway, but only after the
  // user has been through OTP + PIN entry for nothing.
  const db = createAdminClient();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const exists = data?.users?.some((u) => u.phone === phone.replace("+", ""));
  if (exists) {
    return corsJson(
      { error: "This mobile number already has an account — sign in instead." },
      { status: 409 },
    );
  }

  const result = await sendPhoneOtp(phone);
  if (!result.ok) {
    return corsJson({ error: result.error }, { status: 400 });
  }
  return corsJson({ ok: true });
}
