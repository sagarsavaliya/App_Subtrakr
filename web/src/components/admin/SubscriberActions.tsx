"use client";

import { motion } from "framer-motion";
import {
  adminSuspendUser,
  adminUnbanUser,
  adminSendPinReset,
  adminDeleteUser,
} from "@/app/admin/actions";
import { useServerAction } from "@/lib/useServerAction";
import { BanIcon, CheckCircleIcon, MailIcon, TrashIcon } from "@/components/icons";

const btnClass =
  "glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50";

export function SuspendToggleButton({ userId, banned }: { userId: string; banned: boolean }) {
  const { run, pending } = useServerAction(banned ? adminUnbanUser : adminSuspendUser);

  function onClick() {
    if (!banned && !confirm("Suspend this account? They won't be able to sign in until unsuspended.")) {
      return;
    }
    const fd = new FormData();
    fd.set("user_id", userId);
    run(fd);
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={pending}
      className={`${btnClass} ${banned ? "text-glow hover:border-glow/40" : "text-due hover:border-due/40"}`}
    >
      {banned ? <CheckCircleIcon /> : <BanIcon />}
      {pending ? "Working…" : banned ? "Unsuspend" : "Suspend"}
    </motion.button>
  );
}

export function SendPinResetButton({ userId }: { userId: string }) {
  const { run, pending } = useServerAction(adminSendPinReset);

  function onClick() {
    const fd = new FormData();
    fd.set("user_id", userId);
    run(fd);
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={pending}
      className={`${btnClass} text-ink-2 hover:border-white/20`}
    >
      <MailIcon />
      {pending ? "Sending…" : "Send PIN reset code"}
    </motion.button>
  );
}

export function DeleteAccountButton({ userId, name }: { userId: string; name: string }) {
  const { run, pending } = useServerAction(adminDeleteUser);

  function onClick() {
    if (
      !confirm(
        `Permanently delete ${name}'s account? This removes their login and cannot be undone.`,
      )
    ) {
      return;
    }
    const fd = new FormData();
    fd.set("user_id", userId);
    run(fd);
  }

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      disabled={pending}
      className={`${btnClass} text-overdue hover:border-overdue/40`}
    >
      <TrashIcon />
      {pending ? "Deleting…" : "Delete account"}
    </motion.button>
  );
}
