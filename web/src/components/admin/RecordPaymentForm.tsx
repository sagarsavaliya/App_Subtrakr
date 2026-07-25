"use client";

import { motion } from "framer-motion";
import { adminRecordPayment } from "@/app/admin/actions";
import { CustomSelect } from "@/components/CustomSelect";
import { CustomDatePicker } from "@/components/CustomDatePicker";

type Sub = { id: string; name: string };

/** Logs a payment with a chosen amount/date, separate from the per-row
 *  "Mark paid" quick action — for backfilling history or correcting a
 *  record without disturbing the subscription's current renewal cycle. */
export function RecordPaymentForm({
  userId,
  subscriptions,
}: {
  userId: string;
  subscriptions: Sub[];
}) {
  if (subscriptions.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  const inputClass =
    "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  return (
    <form action={adminRecordPayment} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <div>
        <label className="mb-1 block text-xs text-ink-2">Subscription</label>
        <CustomSelect
          name="id"
          options={subscriptions.map((s) => ({ value: s.id, label: s.name }))}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-2">Amount (₹)</label>
        <input
          name="amount"
          type="number"
          min="1"
          step="0.01"
          required
          placeholder="649"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-ink-2">Paid on</label>
        <CustomDatePicker name="paid_date" defaultValue={today} />
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="brand-gradient w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90"
      >
        Record payment
      </motion.button>
    </form>
  );
}
