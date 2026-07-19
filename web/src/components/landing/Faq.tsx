"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FAQS: [string, string][] = [
  [
    "Does SubTrakr read my SMS or bank account?",
    "No — and that's deliberate. SubTrakr never asks for SMS or notification access. When you get a debit SMS, you share it into the app yourself; it parses that one message, matches the subscription, and asks before logging anything.",
  ],
  [
    "How does the GST export work?",
    "Mark subscriptions as business expenses under a company entity with its GSTIN. At month end, export a PDF or CSV with every payment, its GST portion computed at 18%, ready to hand to your CA.",
  ],
  [
    "Can I use it for both personal and business?",
    "Yes — that's the core idea. Entities keep personal and company subscriptions fully separated, with independent totals, filters and exports, inside the same app.",
  ],
  [
    "What happens if I stop paying for Pro?",
    "Your data is never held hostage. You drop back to the Free plan's limits for new additions, everything already tracked stays visible, and full backup export always works.",
  ],
  [
    "Which payment methods do you accept?",
    "Checkout runs on Razorpay: UPI, cards, netbanking and popular wallets. Prices are in INR with no currency-conversion surprises.",
  ],
  [
    "Is there an iPhone app?",
    "Android is first out the door; iOS is next on the roadmap. The web app works everywhere today, synced to the same account.",
  ],
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center text-3xl font-bold sm:text-4xl"
      >
        Questions, answered
      </motion.h2>

      <div className="space-y-3">
        {FAQS.map(([q, a], i) => {
          const isOpen = open === i;
          return (
            <div key={q} className="glass overflow-hidden rounded-2xl">
              <button
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
              >
                {q}
                <span
                  className={`ml-4 shrink-0 text-glow transition-transform ${isOpen ? "rotate-45" : ""}`}
                >
                  +
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                  >
                    <p className="px-5 pb-5 text-sm leading-relaxed text-ink-2">
                      {a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
