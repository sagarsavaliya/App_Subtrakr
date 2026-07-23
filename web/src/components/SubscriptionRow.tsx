"use client";

import { motion } from "framer-motion";
import { formatINR, formatDate } from "@/lib/format";
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
  markPaidAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
  /** Extra hidden fields the actions need beyond `id` — e.g. the admin
   *  variants also need `user_id` to know which subscriber's revalidation
   *  path to hit. */
  hiddenFields?: Record<string, string>;
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
}: Props) {
  const extraInputs = hiddenFields
    ? Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))
    : null;
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
      whileHover={{ y: -2 }}
      className="glass flex items-center gap-4 rounded-2xl p-4 transition-shadow duration-200 hover:shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
    >
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
      <div className="text-right">
        <p className="font-mono font-semibold">{formatINR(amount)}</p>
        <p className="text-xs text-ink-3">/{billingCycle.replace("_", " ")}</p>
      </div>
      {status === "active" && (
        <form action={markPaidAction}>
          <input type="hidden" name="id" value={id} />
          {extraInputs}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="glass cursor-pointer rounded-full px-3 py-1.5 text-xs text-glow transition-colors duration-200 hover:border-glow/40"
            title="Mark paid — advances next due date"
          >
            Mark paid
          </motion.button>
        </form>
      )}
      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        {extraInputs}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="glass cursor-pointer rounded-full p-2 text-ink-3 transition-colors duration-200 hover:text-overdue"
          title="Delete subscription"
          aria-label={`Delete ${name}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </motion.button>
      </form>
    </motion.li>
  );
}
