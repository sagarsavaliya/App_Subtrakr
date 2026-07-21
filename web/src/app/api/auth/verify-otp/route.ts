import { NextResponse } from "next/server";
import { verifyPhoneOtp } from "@/lib/otpChallenge";

const PHONE_RE = /^\+91[6-9]\d{9}$/;

export async function POST(request: Request) {
  const { phone, code } = (await request.json()) as { phone?: string; code?: string };
  if (!phone || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!code || !/^\d{6}$/.test(code)) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  const result = await verifyPhoneOtp(phone, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
