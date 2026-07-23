"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Landing page for GoTrue's password-recovery email link. Handles both
 *  link formats self-hosted GoTrue might use: a `?code=` query param (PKCE
 *  — exchanged for a session) or a `#access_token=...&type=recovery` hash
 *  fragment (implicit flow — supabase-js parses this itself on load and
 *  fires a PASSWORD_RECOVERY auth event). Whichever fires first wins. */
function ResetPasswordForm() {
  const router = useRouter();
  const search = useSearchParams();
  // Set by the admin forgot-password flow's redirectTo — routes the
  // already-authenticated user (the recovery link itself establishes the
  // session) straight to the right destination instead of bouncing them
  // through a login page for credentials they no longer need to re-enter.
  const isAdmin = search.get("admin") === "1";
  const [ready, setReady] = useState(false);
  const [linkInvalid, setLinkInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let settled = false;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        settled = true;
        setReady(true);
      }
    });

    (async () => {
      const code = search.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          settled = true;
          setReady(true);
        }
      }
      // Give the hash-fragment path (if that's what GoTrue used instead)
      // a few seconds to fire its own auth event before giving up.
      setTimeout(() => {
        if (!settled) setLinkInvalid(true);
      }, 4000);
    })();

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords don't match.");
    setError(null);
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="glass rounded-3xl p-6 text-center">
        <p className="mb-4 text-sm text-ink-2">
          Your password has been updated.
        </p>
        <button
          onClick={() => router.replace(isAdmin ? "/admin" : "/app")}
          className="brand-gradient w-full rounded-xl py-3 text-sm font-bold text-[#08201a]"
        >
          Continue
        </button>
      </div>
    );
  }

  if (linkInvalid) {
    return (
      <div className="glass rounded-3xl p-6 text-center">
        <p className="mb-4 text-sm text-overdue">
          This reset link is invalid or has expired.
        </p>
        <Link
          href={isAdmin ? "/admin/login" : "/login"}
          className="glass block w-full rounded-xl py-3 text-sm text-ink hover:border-glow/30"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="glass rounded-3xl p-6 text-center text-sm text-ink-2">
        Verifying your reset link…
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass rounded-3xl p-6">
      <p className="mb-4 text-sm text-ink-2">Choose a new password.</p>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        minLength={6}
        className="glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        minLength={6}
        className="glass mb-4 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3"
      />
      {error && <p className="mb-4 text-sm text-overdue">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="brand-text text-3xl font-bold">
            SubTrakr
          </Link>
          <p className="mt-2 text-sm text-ink-2">Reset your password</p>
        </div>
        <Suspense>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
