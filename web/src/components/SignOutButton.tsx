"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/Toaster";

export function SignOutButton({ redirectTo = "/login" }: { redirectTo?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      const { error } = await createClient().auth.signOut();
      if (error) {
        toast.error(error.message);
        return;
      }
      router.replace(redirectTo);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={signOut}
      disabled={pending}
      className="glass cursor-pointer rounded-full px-4 py-1.5 text-sm text-ink-2 transition-colors duration-200 hover:text-overdue disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Signing out…" : "Sign out"}
    </motion.button>
  );
}
