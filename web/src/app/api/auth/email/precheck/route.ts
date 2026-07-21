import { createAdminClient } from "@/lib/supabase/admin";
import { corsJson, corsPreflight } from "@/lib/cors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function OPTIONS() {
  return corsPreflight();
}

/** Checked before signInWithOtp() on the signup path — otherwise an
 *  already-registered email would still get an OTP sent, and completing
 *  it would silently overwrite that account's existing PIN via
 *  updateUser(). Mirrors the phone flow's send-otp precheck. */
export async function POST(request: Request) {
  const { email } = (await request.json()) as { email?: string };
  if (!email || !EMAIL_RE.test(email)) {
    return corsJson({ error: "Enter a valid email address." }, { status: 400 });
  }

  const db = createAdminClient();
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const exists = data?.users?.some(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (exists) {
    return corsJson(
      { error: "This email already has an account — sign in instead." },
      { status: 409 },
    );
  }

  return corsJson({ ok: true });
}
