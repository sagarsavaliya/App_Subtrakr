"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // Membership is checked server-side in the admin layout.
    router.replace("/admin");
    router.refresh();
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
          resetSent ? (
            <div className="glass rounded-3xl p-6 text-center text-sm text-ink-2">
              If an account exists for {email}, a reset link has been sent.
            </div>
          ) : (
            <form onSubmit={submitForgot} className="glass rounded-3xl p-6">
              <p className="mb-4 text-sm text-ink-2">
                Enter your admin email and we&apos;ll send a reset link.
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
        ) : (
          <form onSubmit={submit} className="glass rounded-3xl p-6">
            <input
              type="email"
              placeholder="Admin email"
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
              className="glass mb-4 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3"
            />
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
              Forgot password?
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
