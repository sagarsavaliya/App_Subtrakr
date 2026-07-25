"use client";

import { motion } from "framer-motion";
import { TrashIcon } from "./icons";

export function SubscriptionDetailActions({
  id,
  active,
  markPaidAction,
  deleteAction,
}: {
  id: string;
  active: boolean;
  markPaidAction: (formData: FormData) => void;
  deleteAction: (formData: FormData) => void;
}) {
  return (
    <div className="flex gap-2">
      {active && (
        <form action={markPaidAction}>
          <input type="hidden" name="id" value={id} />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="brand-gradient cursor-pointer rounded-xl px-4 py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90"
          >
            Mark paid
          </motion.button>
        </form>
      )}
      <form action={deleteAction}>
        <input type="hidden" name="id" value={id} />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="glass flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-ink-2 transition-colors duration-200 hover:text-overdue"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </motion.button>
      </form>
    </div>
  );
}
