import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isPhoneVerified, consumePhoneVerification } from "@/lib/otpChallenge";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function POST(request: Request) {
  const { phone, name, pin } = (await request.json()) as {
    phone?: string;
    name?: string;
    pin?: string;
  };
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  }
  if (!pin || !/^\d{6}$/.test(pin)) {
    return NextResponse.json({ error: "PIN must be exactly 6 digits." }, { status: 400 });
  }

  const verified = await isPhoneVerified(phone);
  if (!verified) {
    return NextResponse.json(
      { error: "Verify your number again before continuing." },
      { status: 400 },
    );
  }

  // Cookie-bound client — signUp's Set-Cookie response is what actually
  // logs the browser in, same as any other Supabase auth call from here.
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    phone,
    password: pin,
    options: { data: { full_name: name.trim() } },
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await consumePhoneVerification(phone);
  return NextResponse.json({ ok: true });
}
