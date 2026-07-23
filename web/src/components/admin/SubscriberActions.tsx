"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  adminSuspendUser,
  adminUnbanUser,
  adminSendPasswordReset,
  adminDeleteUser,
} from "@/app/admin/actions";
import { BanIcon, CheckCircleIcon, MailIcon, TrashIcon } from "@/components/icons";

const btnClass =
  "glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export function SuspendToggleButton({ userId, banned }: { userId: string; banned: boolean }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run() {
    if (!banned && !confirm("Suspend this account? They won't be able to sign in until unsuspended.")) {
      return;
    }
    const fd = new FormData();
    fd.set("user_id", userId);
    startTransition(async () => {
      await (banned ? adminUnbanUser(fd) : adminSuspendUser(fd));
      router.refresh();
    });
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={run}
      disabled={pending}
      className={`${btnClass} ${banned ? "text-glow hover:border-glow/40" : "text-due hover:border-due/40"}`}
    >
      {banned ? <CheckCircleIcon /> : <BanIcon />}
      {pending ? "Working…" : banned ? "Unsuspend" : "Suspend"}
    </motion.button>
  );
}

export function SendPasswordResetButton({ email }: { email: string | null }) {
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  if (!email) return null;

  function run() {
    const fd = new FormData();
    fd.set("email", email as string);
    startTransition(async () => {
      await adminSendPasswordReset(fd);
      setSent(true);
    });
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={run}
      disabled={pending || sent}
      className={`${btnClass} text-ink-2 hover:border-white/20`}
    >
      <MailIcon />
      {sent ? "Reset link sent" : pending ? "Sending…" : "Send password reset"}
    </motion.button>
  );
}

export function DeleteAccountButton({ userId, name }: { userId: string; name: string }) {
  const [pending, startTransition] = useTransition();

  function run() {
    if (
      !confirm(
        `Permanently delete ${name}'s account? This removes their login and cannot be undone.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("user_id", userId);
    startTransition(() => {
      adminDeleteUser(fd);
    });
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={run}
      disabled={pending}
      className={`${btnClass} text-overdue hover:border-overdue/40`}
    >
      <TrashIcon />
      {pending ? "Deleting…" : "Delete account"}
    </motion.button>
  );
}
