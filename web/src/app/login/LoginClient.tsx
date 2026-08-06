"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { SegmentedCodeInput } from "@/components/SegmentedCodeInput";
import {
  detectIdentifierType,
  isValidEmail,
  isValidIndianMobile,
  normalizePhone,
  type IdentifierType,
} from "@/lib/identifier";
import { formatAuthError, logAuthEvent } from "@/lib/authError";

/** PRD F1 — a single 6-digit PIN is the only credential, for both phone and
 *  email accounts; there is no password anymore. Which channel an account
 *  uses is auto-detected from what's typed into one identifier field (see
 *  detectIdentifierType) rather than a manual "use email instead" toggle.
 *  Phone uses a custom WhatsApp-delivered OTP (see /api/auth/*); email
 *  uses GoTrue's own native email-OTP (signInWithOtp/verifyOtp), via
 *  Brevo SMTP. Verify identity via OTP first, THEN set the PIN — the
 *  account/credential isn't finalized until both steps pass. Sign-in
 *  itself is a single step either way; only signup (and PIN reset) is a
 *  multi-step wizard. */

function IdentifierIcon({ type }: { type: IdentifierType }) {
  if (type === "phone") {
    return (
      <svg
        className="h-4 w-4 shrink-0 text-ink-3"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a2.25 2.25 0 002.25-2.25v-1.372a1.5 1.5 0 00-1.06-1.436l-3.135-.94a1.5 1.5 0 00-1.545.417l-.686.686a11.25 11.25 0 01-5.373-5.373l.686-.686a1.5 1.5 0 00.417-1.545l-.94-3.135A1.5 1.5 0 007.622 3H6.25a2.25 2.25 0 00-2.25 2.25z"
        />
      </svg>
    );
  }
  return (
    <svg
      className={`h-4 w-4 shrink-0 text-ink-3 ${type ? "" : "opacity-50"}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0a2.25 2.25 0 00-2.25-2.25h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

type WizardStep = "details" | "otp" | "pin";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(search.get("mode") === "signup");
  const [step, setStep] = useState<WizardStep>("details");

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [otp, setOtp] = useState("");

  const identifierType = detectIdentifierType(identifier);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Seconds remaining before another OTP can be requested — driven by the
  // server's own computed remaining time (the cooldown is keyed on the
  // identifier across every client, not just this tab), so it's accurate
  // even when the block came from a request made moments ago on another
  // device. 0 means no cooldown active.
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [forgotMode, setForgotMode] = useState(false);

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
    setError(null);
    setCooldownSeconds(0);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isSignUp) {
      // Sign-in — one 6-digit PIN, no password, for either channel.
      if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");

      if (identifierType === "phone") {
        if (!isValidIndianMobile(identifier)) {
          return setError("Enter a valid 10-digit mobile number.");
        }
        setLoading(true);
        try {
          const { error } = await createClient().auth.signInWithPassword({
            phone: normalizePhone(identifier),
            password: pin,
          });
          setLoading(false);
          if (error) {
            logAuthEvent("signInWithPassword (phone)", { phone: normalizePhone(identifier) }, error);
            setError(formatAuthError(error));
            return;
          }
          logAuthEvent("signInWithPassword (phone) success", { phone: normalizePhone(identifier) });
          return done();
        } catch (err) {
          setLoading(false);
          logAuthEvent("signInWithPassword (phone) failed", { phone: normalizePhone(identifier) }, err);
          setError(formatAuthError(err));
          return;
        }
      }

      if (identifierType === "email") {
        if (!isValidEmail(identifier)) return setError("Enter a valid email address.");
        setLoading(true);
        try {
          const { error } = await createClient().auth.signInWithPassword({
            email: identifier.trim(),
            password: pin,
          });
          setLoading(false);
          if (error) {
            logAuthEvent("signInWithPassword (email)", { email: identifier.trim() }, error);
            setError(formatAuthError(error));
            return;
          }
          logAuthEvent("signInWithPassword (email) success", { email: identifier.trim() });
          return done();
        } catch (err) {
          setLoading(false);
          logAuthEvent("signInWithPassword (email) failed", { email: identifier.trim() }, err);
          setError(formatAuthError(err));
          return;
        }
      }

      return setError("Enter your email or mobile number.");
    }

    // Signup step 1: precheck + send OTP on whichever channel was detected.
    if (!name.trim()) return setError("Enter your name.");

    if (identifierType === "email") {
      if (!isValidEmail(identifier)) return setError("Enter a valid email address.");
      setLoading(true);
      try {
        const precheck = await fetch("/api/auth/email/precheck", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: identifier.trim() }),
        });
        const precheckBody = await precheck.json();
        if (!precheck.ok) {
          setLoading(false);
          setError(precheckBody.error ?? "Could not verify that email.");
          return;
        }
        const { error } = await createClient().auth.signInWithOtp({
          email: identifier.trim(),
          options: { shouldCreateUser: true, data: { full_name: name.trim() } },
        });
        setLoading(false);
        if (error) {
          logAuthEvent("signInWithOtp (email)", { email: identifier.trim() }, error);
          setError(formatAuthError(error));
          return;
        }
        logAuthEvent("signInWithOtp (email) success", { email: identifier.trim() });
        setStep("otp");
        return;
      } catch (err) {
        setLoading(false);
        logAuthEvent("submit signup (email) failed", { email: identifier.trim() }, err);
        setError(formatAuthError(err));
        return;
      }
    }

    if (identifierType === "phone") {
      if (!isValidIndianMobile(identifier)) {
        return setError("Enter a valid 10-digit mobile number.");
      }
      setLoading(true);
      try {
        const res = await fetch("/api/auth/send-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: normalizePhone(identifier) }),
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
        return;
      } catch (err) {
        setLoading(false);
        logAuthEvent("submit send-otp (phone) failed", { phone: normalizePhone(identifier) }, err);
        setError(formatAuthError(err));
        return;
      }
    }

    return setError("Enter your email or mobile number.");
  }

  async function resendOtp() {
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);
    try {
      if (identifierType === "email") {
        const { error } = await createClient().auth.signInWithOtp({
          email: identifier.trim(),
          options: { shouldCreateUser: isSignUp && !forgotMode },
        });
        setLoading(false);
        if (error) {
          logAuthEvent("resendOtp (email)", { email: identifier.trim() }, error);
          setError(formatAuthError(error));
          return;
        }
        setCooldownSeconds(60);
        return;
      }
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(identifier) }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "Could not send the code. Try again.");
        if (body.retryAfterSeconds) setCooldownSeconds(body.retryAfterSeconds);
        return;
      }
      setCooldownSeconds(60);
    } catch (err) {
      setLoading(false);
      logAuthEvent("resendOtp failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);

    try {
      if (identifierType === "email") {
        const { error } = await createClient().auth.verifyOtp({
          email: identifier.trim(),
          token: otp,
          type: "email",
        });
        setLoading(false);
        if (error) {
          logAuthEvent("verifyOtp (email)", { email: identifier.trim() }, error);
          setError(formatAuthError(error));
          return;
        }
        setStep("pin");
        return;
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(identifier), code: otp }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "Incorrect code.");
        return;
      }
      setStep("pin");
    } catch (err) {
      setLoading(false);
      logAuthEvent("verifyOtp failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  async function setPinAndFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setError(null);
    setLoading(true);

    try {
      if (identifierType === "email") {
        // Already signed in (verifyOtp established the session) — this just
        // finalizes the PIN as the account's password.
        const { error } = await createClient().auth.updateUser({ password: pin });
        setLoading(false);
        if (error) {
          logAuthEvent("updateUser PIN (email)", { email: identifier.trim() }, error);
          setError(formatAuthError(error));
          return;
        }
        return done();
      }

      const res = await fetch("/api/auth/complete-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(identifier), name: name.trim(), pin }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "Could not create your account. Try again.");
        return;
      }
      done();
    } catch (err) {
      setLoading(false);
      logAuthEvent("setPinAndFinish failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  // --- Forgot-PIN wizard — reuses the same identifier/otp/pin state and
  // "details" -> "otp" -> "pin" steps as signup, just with different
  // submit handlers underneath. ---

  async function submitForgotIdentifier(e: React.FormEvent) {
    e.preventDefault();
    if (!identifierType) return setError("Enter your email or mobile number.");
    setError(null);
    setLoading(true);
    try {
      await fetch("/api/auth/reset-pin/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      setLoading(false);
      setCooldownSeconds(60);
      setStep("otp");
    } catch (err) {
      setLoading(false);
      logAuthEvent("submitForgotIdentifier failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  async function verifyForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);

    try {
      if (identifierType === "email") {
        const { error } = await createClient().auth.verifyOtp({
          email: identifier.trim(),
          token: otp,
          type: "email",
        });
        setLoading(false);
        if (error) {
          logAuthEvent("verifyForgotOtp (email)", {}, error);
          setError(formatAuthError(error));
          return;
        }
        setStep("pin");
        return;
      }

      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(identifier), code: otp }),
      });
      const body = await res.json();
      setLoading(false);
      if (!res.ok) {
        setError(body.error ?? "Incorrect code.");
        return;
      }
      setStep("pin");
    } catch (err) {
      setLoading(false);
      logAuthEvent("verifyForgotOtp failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  async function setNewPinAndFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
    if (pin !== confirmPin) return setError("PINs don't match.");
    setError(null);
    setLoading(true);

    try {
      if (identifierType === "email") {
        // verifyForgotOtp already established a session for this account.
        const { error } = await createClient().auth.updateUser({ password: pin });
        setLoading(false);
        if (error) {
          logAuthEvent("setNewPinAndFinish (email)", {}, error);
          setError(formatAuthError(error));
          return;
        }
        return done();
      }

      const res = await fetch("/api/auth/reset-pin/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(identifier), pin }),
      });
      const body = await res.json();
      if (!res.ok) {
        setLoading(false);
        setError(body.error ?? "Could not reset your PIN. Try again.");
        return;
      }
      // Unlike the email path, phone verification doesn't establish a
      // session on its own — sign in now that the new PIN is set.
      const { error } = await createClient().auth.signInWithPassword({
        phone: normalizePhone(identifier),
        password: pin,
      });
      setLoading(false);
      if (error) {
        logAuthEvent("setNewPinAndFinish signIn (phone)", {}, error);
        setError(formatAuthError(error));
        return;
      }
      done();
    } catch (err) {
      setLoading(false);
      logAuthEvent("setNewPinAndFinish failed", {}, err);
      setError(formatAuthError(err));
    }
  }

  const identifierField = (
    <div className="glass mb-3 flex items-center gap-2 rounded-xl px-4">
      <IdentifierIcon type={identifierType} />
      <input
        type="text"
        placeholder="Email or mobile number"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
        autoComplete="username"
        className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-ink-3"
      />
    </div>
  );

  const title = forgotMode
    ? step === "otp"
      ? "Enter the code"
      : step === "pin"
        ? "Set a new PIN"
        : "Reset your PIN"
    : isSignUp && step === "otp"
      ? identifierType === "email"
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
          step === "otp" ? (
            <form ref={otpFormRef} onSubmit={verifyForgotOtp} className="glass rounded-3xl p-6">
              <p className="mb-5 text-center text-sm text-ink-2">
                We sent a 6-digit code to your {identifierType === "email" ? "email" : "WhatsApp"}
                {identifierType === "phone" ? ` (+91 ${identifier})` : ""}. If your account has
                both an email and a number on file, we sent it to both.
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
                <button type="button" onClick={resetWizard} className="text-ink-3 hover:text-ink-2">
                  Start over
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
          ) : step === "pin" ? (
            <form ref={pinFormRef} onSubmit={setNewPinAndFinish} className="glass rounded-3xl p-6">
              <p className="mb-5 text-center text-sm text-ink-2">
                Verified. Choose the new 6-digit PIN you&apos;ll use to sign in from now on.
              </p>
              <p className="mb-2 text-center text-xs text-ink-3">New PIN</p>
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
                {loading ? "Saving…" : "Save new PIN"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitForgotIdentifier} className="glass rounded-3xl p-6">
              <p className="mb-4 text-sm text-ink-2">
                Enter the email or mobile number on your account and we&apos;ll send a
                verification code.
              </p>
              {identifierField}
              {error && <p className="mb-4 text-sm text-overdue">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send verification code"}
              </button>
              <button
                type="button"
                onClick={resetWizard}
                className="mt-3 w-full text-center text-xs text-ink-3 hover:text-ink-2"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : isSignUp && step === "otp" ? (
          <form ref={otpFormRef} onSubmit={verifyOtp} className="glass rounded-3xl p-6">
            <p className="mb-5 text-center text-sm text-ink-2">
              {identifierType === "email"
                ? `We sent a 6-digit code to ${identifier.trim()}`
                : `We sent a 6-digit code over WhatsApp to +91 ${identifier}`}
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
                {identifierType === "email" ? "Change email" : "Change number"}
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
              {identifierType === "email" ? "Email" : "Number"} verified. Choose the 6-digit PIN
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

            {identifierField}

            {!isSignUp && (
              <>
                <div className="mb-1">
                  <SegmentedCodeInput
                    value={pin}
                    onChange={setPin}
                    onComplete={() => detailsFormRef.current?.requestSubmit()}
                    mask
                    disabled={loading}
                    label="PIN"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true);
                    setError(null);
                  }}
                  className="mb-3 w-full text-right text-xs text-ink-3 hover:text-ink-2"
                >
                  Forgot PIN?
                </button>
              </>
            )}
            {isSignUp && (
              <p className="mb-3 text-xs text-ink-3">
                We&apos;ll verify this over WhatsApp or email (whichever you entered), then
                you&apos;ll set a 6-digit PIN.
              </p>
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
