"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatINR, formatDate } from "@/lib/format";
import { useServerAction, type ActionResult } from "@/lib/useServerAction";
import { MarkPaidDialog } from "@/components/MarkPaidDialog";
import type { PaymentMethod } from "@/components/ProfilePaymentMethodsSection";
import { TrashIcon } from "./icons";

type Props = {
  id: string;
  name: string;
  entityName: string;
  amount: number;
  billingCycle: string;
  nextDueDate: string;
  status: string;
  isAutoDebit: boolean;
  overdue: boolean;
  index: number;
  markPaidAction: (formData: FormData) => Promise<ActionResult | void>;
  deleteAction: (formData: FormData) => Promise<ActionResult | void>;
  /** Extra fields the actions need beyond `id` — e.g. the admin variants
   *  also need `user_id` to know which subscriber's revalidation path to
   *  hit. */
  hiddenFields?: Record<string, string>;
  /** When set, the name/avatar area links to the subscription's detail
   *  page (payment history, total paid). Omitted in the admin context —
   *  /app/subscription/[id] is RLS-scoped to the owning user, so an admin
   *  viewing someone else's row can't follow it anyway. */
  detailHref?: string;
  /** Only passed from the subscriber's own /app pages — its presence (even
   *  as an empty array) is what switches "Mark paid" from an immediate
   *  one-click action to the payment-method confirm dialog. The admin
   *  subscriber-detail page (which reuses this same row) doesn't pass it,
   *  since admin doesn't know or need the subscriber's own saved payment
   *  methods — its one-click "Mark paid" stays exactly as it was. */
  paymentMethods?: PaymentMethod[];
};

/** Client component so the list can use framer-motion (entrance stagger +
 *  hover lift) — the dashboard page itself stays a Server Component for its
 *  direct Supabase data fetch, so only the interactive/animated row is
 *  split out. */
export function SubscriptionRow({
  id,
  name,
  entityName,
  amount,
  billingCycle,
  nextDueDate,
  status,
  overdue,
  index,
  markPaidAction,
  deleteAction,
  hiddenFields,
  detailHref,
  paymentMethods,
}: Props) {
  const markPaid = useServerAction(markPaidAction, { successMessage: "Marked paid." });
  const del = useServerAction(deleteAction, { successMessage: `${name} deleted.` });

  function buildFormData() {
    const fd = new FormData();
    fd.set("id", id);
    if (hiddenFields) {
      for (const [k, v] of Object.entries(hiddenFields)) fd.set(k, v);
    }
    return fd;
  }

  const identity = (
    <>
      <div className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-[#08201a]">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{name}</p>
        <p className="text-xs text-ink-2">
          {entityName} ·{" "}
          <span
            className={
              overdue ? "text-overdue" : status === "active" ? "text-ink-2" : "text-ink-3"
            }
          >
            {status === "active"
              ? `${overdue ? "Overdue — was due" : "renews"} ${formatDate(nextDueDate)}`
              : status}
          </span>
        </p>
      </div>
    </>
  );

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -2 }}
      className="glass flex items-center gap-4 rounded-2xl p-4 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
    >
      {detailHref ? (
        <Link href={detailHref} className="flex min-w-0 flex-1 items-center gap-4">
          {identity}
        </Link>
      ) : (
        identity
      )}
      <div className="text-right">
        <p className="font-mono font-semibold">{formatINR(amount)}</p>
        <p className="text-xs text-ink-3">/{billingCycle.replace("_", " ")}</p>
      </div>
      {status === "active" &&
        (paymentMethods !== undefined ? (
          <MarkPaidDialog
            subscriptionId={id}
            defaultAmount={amount}
            markPaidAction={markPaidAction}
            hiddenFields={hiddenFields}
            paymentMethods={paymentMethods}
            renderTrigger={(open, pending) => (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={open}
                disabled={pending}
                className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-glow transition-colors duration-200 hover:border-glow/40 disabled:cursor-not-allowed disabled:opacity-50"
                title="Mark paid — advances next due date"
              >
                {pending ? "Working…" : "Mark paid"}
              </motion.button>
            )}
          />
        ) : (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => markPaid.run(buildFormData())}
            disabled={markPaid.pending}
            className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-glow transition-colors duration-200 hover:border-glow/40 disabled:cursor-not-allowed disabled:opacity-50"
            title="Mark paid — advances next due date"
          >
            {markPaid.pending ? "Working…" : "Mark paid"}
          </motion.button>
        ))}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (confirm(`Delete ${name}? This can't be undone.`)) del.run(buildFormData());
        }}
        disabled={del.pending}
        className="glass cursor-pointer rounded-full p-2 text-ink-3 transition-colors duration-200 hover:text-overdue disabled:cursor-not-allowed disabled:opacity-50"
        title="Delete subscription"
        aria-label={`Delete ${name}`}
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </motion.button>
    </motion.li>
  );
}
