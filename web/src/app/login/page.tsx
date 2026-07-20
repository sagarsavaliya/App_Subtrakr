"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** PRD F1 — mobile number + 6-digit PIN is the primary credential; email +
 *  password stays as the secondary method. */

function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

function isValidIndianMobile(raw: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalizePhone(raw));
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(search.get("mode") === "signup");
  const [useEmail, setUseEmail] = useState(false);
  const [awaitingOtp, setAwaitingOtp] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const inputClass =
    "glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  function done() {
    router.replace(search.get("next") ?? "/app");
    router.refresh();
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();

    if (useEmail) {
      if (isSignUp && !name.trim()) return setError("Enter your name.");
      setLoading(true);
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
    if (!/^\d{6}$/.test(pin)) {
      return setError("Your PIN must be exactly 6 digits.");
    }
    if (isSignUp && !name.trim()) return setError("Enter your name.");

    setLoading(true);
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({
        phone: normalizePhone(phone),
        password: pin,
        options: { data: { full_name: name.trim() } },
      });
      if (error) {
        setError(
          error.message.toLowerCase().includes("already registered")
            ? "This mobile number already has an account — sign in instead."
            : error.message,
        );
        setLoading(false);
        return;
      }
      // No session ⇒ GoTrue wants OTP verification (live once the SMS
      // gateway is configured; autoconfirmed until then).
      if (!data.session) {
        setAwaitingOtp(true);
        setLoading(false);
        return;
      }
      return done();
    }

    const { error } = await supabase.auth.signInWithPassword({
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
    done();
  }

  async function verifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit code.");
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.verifyOtp({
      phone: normalizePhone(phone),
      token: otp,
      type: "sms",
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    done();
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="brand-text text-3xl font-bold">
            SubTrakr
          </Link>
          <p className="mt-2 text-sm text-ink-2">
            {awaitingOtp
              ? "Verify your number"
              : isSignUp
                ? "Create your account"
                : "Welcome back"}
          </p>
        </div>

        {awaitingOtp ? (
          <form onSubmit={verifyOtp} className="glass rounded-3xl p-6">
            <p className="mb-4 text-sm text-ink-2">
              We sent a 6-digit code to +91 {phone}
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
            <button
              type="button"
              onClick={() => {
                setAwaitingOtp(false);
                setOtp("");
                setError(null);
              }}
              className="mt-3 w-full text-center text-xs text-ink-3 hover:text-ink-2"
            >
              Change number
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
                {isSignUp && (
                  <p className="mb-3 text-xs text-ink-3">
                    You&apos;ll sign in with this number and PIN.
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
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>
        )}

        {!awaitingOtp && (
          <>
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError(null);
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
                setError(null);
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
