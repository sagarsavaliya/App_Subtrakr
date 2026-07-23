"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addEntity } from "@/app/app/actions";
import { PlusIcon } from "./icons";

/** Toggle-to-reveal "add business" form on the Profile page — collapsed by
 *  default so the entity list stays the focus; expands with a spring-ish
 *  fade+height animation rather than just appearing. */
export function AddEntityForm() {
  const [open, setOpen] = useState(false);

  const inputClass =
    "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  return (
    <div className="mt-4">
      <AnimatePresence initial={false} mode="wait">
        {!open ? (
          <motion.button
            key="trigger"
            type="button"
            onClick={() => setOpen(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-sm text-ink-2 transition-colors duration-200 hover:border-glow/30 hover:text-ink"
          >
            <PlusIcon className="h-4 w-4" />
            Add business
          </motion.button>
        ) : (
          <motion.form
            key="form"
            action={addEntity}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="glass space-y-3 overflow-hidden rounded-2xl p-4"
          >
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                Business name
              </label>
              <input
                name="name"
                required
                autoFocus
                placeholder="Akshara Technologies"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                GSTIN (optional)
              </label>
              <input name="gst_number" placeholder="22AAAAA0000A1Z5" className={inputClass} />
            </div>
            <div className="flex gap-2 pt-1">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="brand-gradient flex-1 cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90"
              >
                Save business
              </motion.button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="cursor-pointer rounded-xl px-4 text-sm text-ink-3 hover:text-ink-2"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
