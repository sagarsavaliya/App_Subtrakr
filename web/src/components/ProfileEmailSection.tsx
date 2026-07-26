"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SegmentedCodeInput } from "@/components/SegmentedCodeInput";
import { Modal } from "@/components/Modal";

type Props = {
  initialEmail: string | null;
  initialConfirmed: boolean;
};

/** Lets a phone-primary account add (and later re-verify) an email — once
 *  confirmed, that email works as an alternate sign-in identifier with the
 *  same 6-digit PIN (GoTrue stores one password hash per account shared
 *  across every identifier on it, so no extra plumbing is needed beyond
 *  getting the email itself added and confirmed). Verification reuses
 *  GoTrue's own email-change flow — a DIFFERENT template/subject pair and
 *  verifyOtp "type" than the signup email-OTP flow, see docker-compose.yml.
 *  Renders as a compact row (meant to sit inline in the profile identity
 *  card) plus a modal for the add/verify form — the row itself was
 *  previously its own boxed "view" state, but now the identity card is
 *  its container. */
export function ProfileEmailSection({ initialEmail, initialConfirmed }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "otp">("add");
  const [email, setEmail] = useState(initialEmail ?? "");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const otpFormRef = useRef<HTMLFormElement>(null);

  const hasConfirmedEmail = !!initialEmail && initialConfirmed;

  async function openModal() {
    setError(null);
    setEmail(initialEmail ?? "");
    if (initialEmail && !hasConfirmedEmail) {
      // Re-send rather than assume a still-valid code is in flight — the
      // modal may be reopened long after the original add.
      setLoading(true);
      const { error } = await createClient().auth.updateUser({ email: initialEmail });
      setLoading(false);
      if (error) {
        setError(error.message);
        setOpen(true);
        setMode("add");
        return;
      }
      setCooldownSeconds(60);
      setMode("otp");
      setOpen(true);
      return;
    }
    setMode("add");
    setOpen(true);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return setError("Enter a valid email address.");
    }
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ email: email.trim() });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCooldownSeconds(60);
    setMode("otp");
  }

  async function resendCode() {
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ email: email.trim() });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setCooldownSeconds(60);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({
      email: email.trim(),
      token: otp,
      type: "email_change",
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setOpen(false);
    setOtp("");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-2 text-sm">
        <span className="min-w-0 truncate text-ink-2">{initialEmail ?? "No email on file"}</span>
        {initialEmail && (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              hasConfirmedEmail ? "bg-glow/15 text-glow" : "bg-due/15 text-due"
            }`}
          >
            {hasConfirmedEmail ? "Verified" : "Unverified"}
          </span>
        )}
        <button
          onClick={openModal}
          disabled={loading}
          className="glass shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-ink hover:border-glow/30 disabled:opacity-50"
        >
          {initialEmail ? (hasConfirmedEmail ? "Change" : "Verify") : "Add email"}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Email">
        {mode === "otp" ? (
          <form ref={otpFormRef} onSubmit={verifyCode}>
            <p className="mb-3 text-sm text-ink-2">We sent a 6-digit code to {email.trim()}.</p>
            <div className="mb-3">
              <SegmentedCodeInput
                value={otp}
                onChange={setOtp}
                onComplete={() => otpFormRef.current?.requestSubmit()}
                autoFocus
                disabled={loading}
                label="Email verification code"
              />
            </div>
            {error && <p className="mb-3 text-sm text-overdue">{error}</p>}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={loading}
                className="brand-gradient rounded-xl px-4 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Verifying…" : "Verify"}
              </button>
              <button
                type="button"
                onClick={resendCode}
                disabled={cooldownSeconds > 0 || loading}
                className="text-xs text-glow hover:underline disabled:cursor-not-allowed disabled:text-ink-3 disabled:no-underline"
              >
                {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : "Resend code"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={sendCode}>
            <p className="mb-3 text-sm text-ink-2">
              Add an email to also sign in with it, using the same PIN.
            </p>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40"
            />
            {error && <p className="mb-3 text-sm text-overdue">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="brand-gradient w-full rounded-xl px-4 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Send code"}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
