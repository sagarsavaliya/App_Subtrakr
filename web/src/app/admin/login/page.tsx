"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={submit} className="glass w-full max-w-sm rounded-3xl p-6">
        <p className="brand-text text-center text-2xl font-bold">SubTrakr</p>
        <p className="mb-6 mt-1 text-center text-xs uppercase tracking-widest text-ink-3">
          Super admin
        </p>
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="glass mb-3 w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3"
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
      </form>
    </main>
  );
}
