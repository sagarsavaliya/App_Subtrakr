import { createClient } from "@/lib/supabase/server";
import { isPhoneVerified, consumePhoneVerification } from "@/lib/otpChallenge";
import { corsJson, corsPreflight } from "@/lib/cors";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function OPTIONS() {
  return corsPreflight();
}

export async function POST(request: Request) {
  const { phone, name, pin } = (await request.json()) as {
    phone?: string;
    name?: string;
    pin?: string;
  };
  if (!phone || !PHONE_RE.test(phone)) {
    return corsJson({ error: "Invalid request." }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return corsJson({ error: "Enter your name." }, { status: 400 });
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

  // Cookie-bound client — signUp's Set-Cookie response is what actually
  // logs a BROWSER caller in. A native client (Flutter) gets the same
  // JSON success/error but ignores the cookie and signs in separately
  // afterward with its own on-device Supabase client.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    phone,
    password: pin,
    options: { data: { full_name: name.trim() } },
  });
  if (error) {
    return corsJson({ error: error.message }, { status: 400 });
  }

  await consumePhoneVerification(phone);
  return corsJson({ ok: true });
}
