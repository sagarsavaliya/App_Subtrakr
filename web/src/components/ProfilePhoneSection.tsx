"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SegmentedCodeInput } from "@/components/SegmentedCodeInput";
import { normalizePhone, isValidIndianMobile } from "@/lib/identifier";
import { Modal } from "@/components/Modal";

type Props = {
  initialPhone: string | null; // E.164 without the leading "+", e.g. "919876543210"
};

/** Lets an email-primary account add (and verify) a mobile number — same
 *  WhatsApp-OTP mechanism as phone signup. Once the WhatsApp code is
 *  confirmed via /api/profile/add-phone/verify, the actual phone gets set
 *  on the account client-side via updateUser({ phone }); GOTRUE_SMS_
 *  AUTOCONFIRM is on, so that confirms it immediately — there's no
 *  "Unverified" phone state to handle, unlike email. Renders as a compact
 *  row (meant to sit inline in the profile identity card) plus a modal
 *  for the add/verify form. */
export function ProfilePhoneSection({ initialPhone }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"add" | "otp">("add");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const otpFormRef = useRef<HTMLFormElement>(null);

  const displayPhone = initialPhone ? `+${initialPhone}` : null;

  function openModal() {
    setError(null);
    setPhone("");
    setOtp("");
    setMode("add");
    setOpen(true);
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidIndianMobile(phone)) return setError("Enter a valid 10-digit mobile number.");
    setError(null);
    setLoading(true);
    const res = await fetch("/api/profile/add-phone/send", {
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
    setMode("otp");
  }

  async function resendCode() {
    if (cooldownSeconds > 0) return;
    setError(null);
    setLoading(true);
    const res = await fetch("/api/profile/add-phone/send", {
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

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);
    const res = await fetch("/api/profile/add-phone/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: normalizePhone(phone), code: otp }),
    });
    const body = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(body.error ?? "Incorrect code.");
      return;
    }

    const { error } = await createClient().auth.updateUser({ phone: normalizePhone(phone) });
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
        <span className="min-w-0 truncate text-ink-2">
          {displayPhone ?? "No mobile number on file"}
        </span>
        {displayPhone && (
          <span className="shrink-0 rounded-full bg-glow/15 px-2 py-0.5 text-[11px] font-semibold text-glow">
            Verified
          </span>
        )}
        <button
          onClick={openModal}
          className="glass shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-ink hover:border-glow/30"
        >
          {displayPhone ? "Change" : "Add number"}
        </button>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Mobile number">
        {mode === "otp" ? (
          <form ref={otpFormRef} onSubmit={verifyCode}>
            <p className="mb-3 text-sm text-ink-2">
              We sent a 6-digit code over WhatsApp to +91 {phone}.
            </p>
            <div className="mb-3">
              <SegmentedCodeInput
                value={otp}
                onChange={setOtp}
                onComplete={() => otpFormRef.current?.requestSubmit()}
                autoFocus
                disabled={loading}
                label="Mobile verification code"
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
              Add a mobile number to also sign in with it, using the same PIN.
            </p>
            <div className="glass mb-3 flex items-center rounded-xl">
              <span className="pl-4 text-sm text-ink-2">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                required
                className="w-full bg-transparent px-3 py-3 text-sm outline-none placeholder:text-ink-3"
              />
            </div>
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
