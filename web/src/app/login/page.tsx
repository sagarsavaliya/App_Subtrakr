"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** PRD F1 — mobile number + 6-digit PIN is the primary credential; email +
 *  password stays as the secondary method.
 *
 *  Phone SIGNUP is a 3-step wizard: verify the number via a WhatsApp OTP
 *  first, THEN ask the user to set the PIN they'll actually sign in with —
 *  the account itself isn't created until both steps pass. Phone SIGN-IN
 *  stays a single step, since an existing account was already verified at
 *  signup time. */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

function isValidIndianMobile(raw: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalizePhone(raw));
}

type PhoneStep = "details" | "otp" | "pin";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(search.get("mode") === "signup");
  const [useEmail, setUseEmail] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("details");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const inputClass =
    "glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  function done() {
    router.replace(search.get("next") ?? "/app");
    router.refresh();
  }

  function resetPhoneWizard() {
    setPhoneStep("details");
    setOtp("");
    setPin("");
    setConfirmPin("");
    setForgotMode(false);
    setResetSent(false);
    setError(null);
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setResetSent(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (useEmail) {
      if (isSignUp && !name.trim()) return setError("Enter your name.");
      setLoading(true);
      const supabase = createClient();
      const result = isSignUp
        ? await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: name.trim() } },
          })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) {
        setError(result.error.message);
        setLoading(false);
        return;
      }
      return done();
    }

    if (!isValidIndianMobile(phone)) {
      return setError("Enter a valid 10-digit mobile number.");
    }

    if (!isSignUp) {
      // Existing account — straight to sign-in, no OTP needed.
      if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
      setLoading(true);
      const { error } = await createClient().auth.signInWithPassword({
        phone: normalizePhone(phone),
        password: pin,
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("invalid login")
            ? "Wrong mobile number or PIN."
            : error.message,
        );
        setLoading(false);
        return;
      }
      return done();
    }

    // Signup, phone step 1: send the WhatsApp OTP.
    if (!name.trim()) return setError("Enter your name.");
    setLoading(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not send the code. Try again.");
      return;
    }
    setPhoneStep("otp");
  }

  async function resendOtp() {
    if (resendCooldown) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not send the code. Try again.");
      return;
    }
    setResendCooldown(true);
    setTimeout(() => setResendCooldown(false), 60_000);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone), code: otp }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Incorrect code.");
      return;
    }
    setPhoneStep("pin");
  }

  async function setPinAndFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setError(null);
    setLoading(true);
    const res = await fetch("/api/auth/complete-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone), name: name.trim(), pin }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not create your account. Try again.");
      return;
    }
    done();
  }

  const title = forgotMode
    ? "Reset your password"
    : !useEmail && isSignUp && phoneStep === "otp"
      ? "Verify your number"
      : !useEmail && isSignUp && phoneStep === "pin"
        ? "Set your PIN"
        : isSignUp
          ? "Create your account"
          : "Welcome back";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="brand-text text-3xl font-bold">
            SubTrakr
          </Link>
          <p className="mt-2 text-sm text-ink-2">{title}</p>
        </div>

        {forgotMode ? (
          resetSent ? (
            <div className="glass rounded-3xl p-6 text-center text-sm text-ink-2">
              If an account exists for {email}, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={submitForgot} className="glass rounded-3xl p-6">
              <p className="mb-4 text-sm text-ink-2">
                Enter your email and we&apos;ll send a reset link.
              </p>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
              {error && <p className="mb-4 text-sm text-overdue">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError(null);
                }}
                className="mt-3 w-full text-center text-xs text-ink-3 hover:text-ink-2"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : !useEmail && isSignUp && phoneStep === "otp" ? (
          <form onSubmit={verifyOtp} className="glass rounded-3xl p-6">
            <p className="mb-4 text-sm text-ink-2">
              We sent a 6-digit code over WhatsApp to +91 {phone}
            </p>
            <input
              type="text"
              inputMode="numeric"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className={inputClass}
            />
            {error && <p className="mb-4 text-sm text-overdue">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Verifying…" : "Verify"}
            </button>
            <div className="mt-3 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={resetPhoneWizard}
                className="text-ink-3 hover:text-ink-2"
              >
                Change number
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={resendCooldown || loading}
                className="text-glow hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
              >
                {resendCooldown ? "Code sent — wait a moment" : "Resend code"}
              </button>
            </div>
          </form>
        ) : !useEmail && isSignUp && phoneStep === "pin" ? (
          <form onSubmit={setPinAndFinish} className="glass rounded-3xl p-6">
            <p className="mb-4 text-sm text-ink-2">
              Number verified. Choose the 6-digit PIN you&apos;ll use to sign in from now on.
            </p>
            <input
              type="password"
              inputMode="numeric"
              placeholder="6-digit PIN"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className={inputClass}
            />
            <input
              type="password"
              inputMode="numeric"
              placeholder="Confirm PIN"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              className={inputClass}
            />
            {error && <p className="mb-4 text-sm text-overdue">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="glass rounded-3xl p-6">
            {isSignUp && (
              <input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className={inputClass}
              />
            )}

            {useEmail ? (
              <>
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={inputClass}
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className={inputClass}
                />
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                    }}
                    className="mb-1 w-full text-right text-xs text-ink-3 hover:text-ink-2"
                  >
                    Forgot password?
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="glass mb-3 flex items-center rounded-xl">
                  <span className="pl-4 text-sm text-ink-2">+91</span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Mobile number"
                    value={phone}
                    onChange={(e) =>
                      setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                    }
                    required
                    className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-ink-3"
                  />
                </div>
                {!isSignUp && (
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="6-digit PIN"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    required
                    className={inputClass}
                  />
                )}
                {isSignUp && (
                  <p className="mb-3 text-xs text-ink-3">
                    We&apos;ll verify this number over WhatsApp, then you&apos;ll set a PIN.
                  </p>
                )}
              </>
            )}

            {error && <p className="mb-4 text-sm text-overdue">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : isSignUp && !useEmail
                  ? "Send verification code"
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
            </button>
          </form>
        )}

        {phoneStep === "details" && !forgotMode && (
          <>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                resetPhoneWizard();
              }}
              className="mt-5 w-full text-center text-sm text-glow hover:underline"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "New to SubTrakr? Create account"}
            </button>
            <button
              onClick={() => {
                setUseEmail(!useEmail);
                resetPhoneWizard();
              }}
              className="mt-2 w-full text-center text-xs text-ink-3 hover:text-ink-2"
            >
              {useEmail ? "Use mobile number instead" : "Use email instead"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
