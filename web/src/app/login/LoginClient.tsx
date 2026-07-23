"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SegmentedCodeInput } from "@/components/SegmentedCodeInput";

/** PRD F1 — mobile number + 6-digit PIN is the primary credential; email +
 *  PIN is the secondary method, using the same shape (verify identity via
 *  OTP first, THEN set the PIN — the account/credential isn't finalized
 *  until both steps pass). Phone uses a custom WhatsApp-delivered OTP
 *  (see /api/auth/*); email uses GoTrue's own native email-OTP
 *  (signInWithOtp/verifyOtp), now that Brevo SMTP is configured — no
 *  custom send/verify plumbing needed there.
 *
 *  Existing accounts created before this (arbitrary-length password, not
 *  a 6-digit PIN) still sign in fine — the sign-in password field has no
 *  digit-only or length-6 restriction, only signup enforces the new PIN
 *  shape. Sign-in itself is a single step either way; only signup is the
 *  3-step wizard. */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

function isValidIndianMobile(raw: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalizePhone(raw));
}

type WizardStep = "details" | "otp" | "pin";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(search.get("mode") === "signup");
  const [useEmail, setUseEmail] = useState(false);
  const [step, setStep] = useState<WizardStep>("details");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Seconds remaining before another phone OTP can be requested — driven by
  // the server's own computed remaining time (the cooldown is keyed on the
  // phone number across every client, not just this tab), so it's accurate
  // even when the block came from a request made moments ago on another
  // device. 0 means no cooldown active.
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Auto-submitted from SegmentedCodeInput's onComplete once every box is
  // filled, so requestSubmit() reuses the exact same validated submit path
  // instead of duplicating any logic.
  const detailsFormRef = useRef<HTMLFormElement>(null);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const pinFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const id = setInterval(() => {
      setCooldownSeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSeconds]);

  const inputClass =
    "glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  function done() {
    router.replace(search.get("next") ?? "/app");
    router.refresh();
  }

  function resetWizard() {
    setStep("details");
    setOtp("");
    setPin("");
    setConfirmPin("");
    setForgotMode(false);
    setResetSent(false);
    setError(null);
    setCooldownSeconds(0);
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
      if (!isSignUp) {
        // Existing account — plain password, whatever length/shape it has.
        setLoading(true);
        const { error } = await createClient().auth.signInWithPassword({
          email,
          password,
        });
        setLoading(false);
        if (error) {
          setError(error.message);
          return;
        }
        return done();
      }

      // Signup step 1: precheck, then send the email OTP.
      if (!name.trim()) return setError("Enter your name.");
      setLoading(true);
      const precheck = await fetch("/api/auth/email/precheck", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const precheckBody = await precheck.json();
      if (!precheck.ok) {
        setLoading(false);
        setError(precheckBody.error ?? "Could not verify that email.");
        return;
      }
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setStep("otp");
      return;
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
      if (body.retryAfterSeconds) setCooldownSeconds(body.retryAfterSeconds);
      return;
    }
    setCooldownSeconds(60);
    setStep("otp");
  }

  async function resendOtp() {
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);
    if (useEmail) {
      const { error } = await createClient().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true, data: { full_name: name.trim() } },
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setCooldownSeconds(60);
      return;
    }
    const res = await fetch("/api/auth/send-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone) }),
    });
    const body = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(body.error ?? "Could not send the code. Try again.");
      if (body.retryAfterSeconds) setCooldownSeconds(body.retryAfterSeconds);
      return;
    }
    setCooldownSeconds(60);
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);

    if (useEmail) {
      const { error } = await createClient().auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      setStep("pin");
      return;
    }

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
    setStep("pin");
  }

  async function setPinAndFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setError(null);
    setLoading(true);

    if (useEmail) {
      // Already signed in (verifyOtp established the session) — this just
      // finalizes the PIN as the account's password.
      const { error } = await createClient().auth.updateUser({ password: pin });
      setLoading(false);
      if (error) {
        setError(error.message);
        return;
      }
      return done();
    }

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
    : isSignUp && step === "otp"
      ? useEmail
        ? "Verify your email"
        : "Verify your number"
      : isSignUp && step === "pin"
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
        ) : isSignUp && step === "otp" ? (
          <form ref={otpFormRef} onSubmit={verifyOtp} className="glass rounded-3xl p-6">
            <p className="mb-5 text-center text-sm text-ink-2">
              {useEmail
                ? `We sent a 6-digit code to ${email}`
                : `We sent a 6-digit code over WhatsApp to +91 ${phone}`}
            </p>
            <div className="mb-5">
              <SegmentedCodeInput
                value={otp}
                onChange={setOtp}
                onComplete={() => otpFormRef.current?.requestSubmit()}
                autoFocus
                disabled={loading}
                label="Verification code"
              />
            </div>
            {error && <p className="mb-4 text-center text-sm text-overdue">{error}</p>}
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
                onClick={resetWizard}
                className="text-ink-3 hover:text-ink-2"
              >
                {useEmail ? "Change email" : "Change number"}
              </button>
              <button
                type="button"
                onClick={resendOtp}
                disabled={cooldownSeconds > 0 || loading}
                className="text-glow hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
              >
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
              </button>
            </div>
          </form>
        ) : isSignUp && step === "pin" ? (
          <form ref={pinFormRef} onSubmit={setPinAndFinish} className="glass rounded-3xl p-6">
            <p className="mb-5 text-center text-sm text-ink-2">
              {useEmail ? "Email" : "Number"} verified. Choose the 6-digit PIN
              you&apos;ll use to sign in from now on.
            </p>
            <p className="mb-2 text-center text-xs text-ink-3">6-digit PIN</p>
            <div className="mb-4">
              <SegmentedCodeInput
                value={pin}
                onChange={setPin}
                mask
                autoFocus
                disabled={loading}
                label="New PIN"
              />
            </div>
            <p className="mb-2 text-center text-xs text-ink-3">Confirm PIN</p>
            <div className="mb-5">
              <SegmentedCodeInput
                value={confirmPin}
                onChange={setConfirmPin}
                onComplete={() => pinFormRef.current?.requestSubmit()}
                mask
                disabled={loading}
                label="Confirm PIN"
              />
            </div>
            {error && <p className="mb-4 text-center text-sm text-overdue">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        ) : (
          <form ref={detailsFormRef} onSubmit={submit} className="glass rounded-3xl p-6">
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
                {!isSignUp && (
                  <>
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className={inputClass}
                    />
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
                  </>
                )}
                {isSignUp && (
                  <p className="mb-3 text-xs text-ink-3">
                    We&apos;ll email you a verification code, then you&apos;ll
                    set a 6-digit PIN.
                  </p>
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
                  <div className="mb-3">
                    <SegmentedCodeInput
                      value={pin}
                      onChange={setPin}
                      onComplete={() => detailsFormRef.current?.requestSubmit()}
                      mask
                      disabled={loading}
                      label="PIN"
                    />
                  </div>
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
              disabled={loading || cooldownSeconds > 0}
              className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading
                ? "Please wait…"
                : cooldownSeconds > 0
                  ? `Try again in ${cooldownSeconds}s`
                  : isSignUp
                    ? "Send verification code"
                    : "Sign in"}
            </button>
          </form>
        )}

        {step === "details" && !forgotMode && (
          <>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                resetWizard();
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
                resetWizard();
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
