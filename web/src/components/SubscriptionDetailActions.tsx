"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useServerAction, type ActionResult } from "@/lib/useServerAction";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import type { PaymentMethod } from "@/components/ProfilePaymentMethodsSection";
import { TrashIcon } from "./icons";

export function SubscriptionDetailActions({
  id,
  name,
  amount,
  active,
  markPaidAction,
  deleteAction,
  paymentMethods,
}: {
  id: string;
  name: string;
  amount: number;
  active: boolean;
  markPaidAction: (formData: FormData) => Promise<ActionResult | void>;
  deleteAction: (formData: FormData) => Promise<ActionResult | void>;
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const del = useServerAction(deleteAction, {
    successMessage: `${name} deleted.`,
    onSuccess: () => router.push("/app"),
  });

  function idFormData() {
    const fd = new FormData();
    fd.set("id", id);
    return fd;
  }

  return (
    <div className="flex gap-2">
      {active && (
        <MarkPaidDialog
          subscriptionId={id}
          defaultAmount={amount}
          markPaidAction={markPaidAction}
          paymentMethods={paymentMethods}
          renderTrigger={(open, pending) => (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={open}
              disabled={pending}
              className="brand-gradient cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "Working…" : "Mark paid"}
            </motion.button>
          )}
        />
      )}
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => {
          if (confirm(`Delete ${name}? This can't be undone.`)) del.run(idFormData());
        }}
        disabled={del.pending}
        className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-2 transition-colors duration-200 hover:text-overdue disabled:cursor-not-allowed disabled:opacity-50"
      >
        <TrashIcon className="h-4 w-4" />
        {del.pending ? "Deleting…" : "Delete"}
      </motion.button>
    </div>
  );
}
