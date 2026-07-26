"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SegmentedCodeInput } from "@/components/SegmentedCodeInput";

type ForgotStep = "identifier" | "otp" | "pin";

/** Admin accounts use the same single-credential shape as consumer
 *  accounts now — a 6-digit PIN instead of an arbitrary password — so
 *  there's one PIN concept across the whole app, not two. Admin identity
 *  is always email (no phone login for admins), so the reset flow only
 *  ever exercises the email branch of /api/auth/reset-pin/*, but reuses
 *  those same endpoints rather than a parallel admin-only implementation. */
export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>("identifier");
  const [otp, setOtp] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmNewPin, setConfirmNewPin] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const detailsFormRef = useRef<HTMLFormElement>(null);
  const otpFormRef = useRef<HTMLFormElement>(null);
  const pinFormRef = useRef<HTMLFormElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return setError("Your PIN must be exactly 6 digits.");
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password: pin,
    });
    if (error) {
      setError(
        error.message.toLowerCase().includes("invalid login")
          ? "Wrong email or PIN."
          : error.message,
      );
      setLoading(false);
      return;
    }
    // Membership is checked server-side in the admin layout.
    router.replace("/admin");
    router.refresh();
  }

  function resetForgot() {
    setForgotMode(false);
    setForgotStep("identifier");
    setOtp("");
    setNewPin("");
    setConfirmNewPin("");
    setError(null);
    setCooldownSeconds(0);
  }

  async function submitForgotIdentifier(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Enter your admin email.");
    setError(null);
    setLoading(true);
    await fetch("/api/auth/reset-pin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email.trim() }),
    });
    setLoading(false);
    setCooldownSeconds(60);
    setForgotStep("otp");
  }

  async function resendForgotOtp() {
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);
    await fetch("/api/auth/reset-pin/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email.trim() }),
    });
    setLoading(false);
    setCooldownSeconds(60);
  }

  async function verifyForgotOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setForgotStep("pin");
  }

  async function setNewPinAndFinish(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(newPin)) return setError("Your PIN must be exactly 6 digits.");
    if (newPin !== confirmNewPin) return setError("PINs don't match.");
    setError(null);
    setLoading(true);
    // verifyForgotOtp already established a session for this account.
    const { error } = await createClient().auth.updateUser({ password: newPin });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  const inputClass =
    "glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3";

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <p className="brand-text text-center text-2xl font-bold">SubTrakr</p>
        <p className="mb-6 mt-1 text-center text-xs uppercase tracking-widest text-ink-3">
          Super admin
        </p>

        {forgotMode ? (
          forgotStep === "otp" ? (
            <form ref={otpFormRef} onSubmit={verifyForgotOtp} className="glass rounded-3xl p-6">
              <p className="mb-5 text-center text-sm text-ink-2">
                We sent a 6-digit code to {email.trim()}.
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
                className="brand-gradient w-full rounded-xl py-3 text-sm font-bold text-[#08201a] disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
              <div className="mt-3 flex items-center justify-between text-xs">
                <button type="button" onClick={resetForgot} className="text-ink-3 hover:text-ink-2">
                  Start over
                </button>
                <button
                  type="button"
                  onClick={resendForgotOtp}
                  disabled={cooldownSeconds > 0 || loading}
                  className="text-glow hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
                >
                  {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
                </button>
              </div>
            </form>
          ) : forgotStep === "pin" ? (
            <form ref={pinFormRef} onSubmit={setNewPinAndFinish} className="glass rounded-3xl p-6">
              <p className="mb-5 text-center text-sm text-ink-2">
                Verified. Choose the new 6-digit PIN you&apos;ll sign in with.
              </p>
              <p className="mb-2 text-center text-xs text-ink-3">New PIN</p>
              <div className="mb-4">
                <SegmentedCodeInput
                  value={newPin}
                  onChange={setNewPin}
                  mask
                  autoFocus
                  disabled={loading}
                  label="New PIN"
                />
              </div>
              <p className="mb-2 text-center text-xs text-ink-3">Confirm PIN</p>
              <div className="mb-5">
                <SegmentedCodeInput
                  value={confirmNewPin}
                  onChange={setConfirmNewPin}
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
                className="brand-gradient w-full rounded-xl py-3 text-sm font-bold text-[#08201a] disabled:opacity-50"
              >
                {loading ? "Saving…" : "Save new PIN"}
              </button>
            </form>
          ) : (
            <form onSubmit={submitForgotIdentifier} className="glass rounded-3xl p-6">
              <p className="mb-4 text-sm text-ink-2">
                Enter your admin email and we&apos;ll send a verification code.
              </p>
              <input
                type="email"
                placeholder="Admin email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={inputClass}
              />
              {error && <p className="mb-3 text-sm text-overdue">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="brand-gradient w-full rounded-xl py-3 text-sm font-bold text-[#08201a] disabled:opacity-50"
              >
                {loading ? "Sending…" : "Send verification code"}
              </button>
              <button
                type="button"
                onClick={resetForgot}
                className="mt-3 w-full text-center text-xs text-ink-3 hover:text-ink-2"
              >
                Back to sign in
              </button>
            </form>
          )
        ) : (
          <form ref={detailsFormRef} onSubmit={submit} className="glass rounded-3xl p-6">
            <input
              type="email"
              placeholder="Admin email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputClass}
            />
            <div className="mb-4">
              <SegmentedCodeInput
                value={pin}
                onChange={setPin}
                onComplete={() => detailsFormRef.current?.requestSubmit()}
                mask
                disabled={loading}
                label="PIN"
              />
            </div>
            {error && <p className="mb-3 text-sm text-overdue">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient w-full rounded-xl py-3 text-sm font-bold text-[#08201a] disabled:opacity-50"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
            <button
              type="button"
              onClick={() => {
                setForgotMode(true);
                setError(null);
              }}
              className="mt-3 w-full text-center text-xs text-ink-3 hover:text-ink-2"
            >
              Forgot PIN?
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
