"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

/** First real modal overlay in this app — everything else so far used
 *  either a native confirm() or an inline expanding form. Mark Paid needed
 *  an actual dialog (payment method + amount + date), which doesn't fit
 *  inline in a list row.
 *
 *  Rendered via a portal straight into document.body — framer-motion's
 *  motion.* components almost always end up with an inline `transform`
 *  style (even a resting `translate3d(0,0,0)` for GPU acceleration), and
 *  ANY ancestor with a non-none transform becomes the containing block for
 *  a `position: fixed` descendant instead of the viewport. Confirmed live:
 *  the dialog rendered pinned near the top of the page, overlapping the
 *  nav, instead of centered over the whole viewport — a portal sidesteps
 *  this rather than auditing every possible motion.* ancestor. */
export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.15 }}
            className="glass-strong relative w-full max-w-md rounded-3xl p-6"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="glass rounded-full p-1.5 text-ink-3 hover:text-ink"
              >
                ×
              </button>
            </div>
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
