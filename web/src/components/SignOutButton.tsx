"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();

  async function signOut() {
    await createClient().auth.signOut();
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="glass rounded-full px-4 py-1.5 text-sm text-ink-2 transition hover:text-overdue"
    >
      Sign out
    </button>
  );
}
