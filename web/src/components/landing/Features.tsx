"use client";

import { motion } from "framer-motion";

const FEATURES = [
  {
    icon: "🔔",
    title: "Reminders before the charge",
    body: "Pick how many days of warning you want. SubTrakr nudges you before every renewal — cancel in time or budget for it, never be surprised.",
  },
  {
    icon: "🧾",
    title: "GST-ready exports",
    body: "One tap turns a month of business subscriptions into a clean PDF or CSV with GSTIN, HSN/SAC and 18% GST computed — ready for your CA.",
  },
  {
    icon: "🏢",
    title: "Personal + business, separated",
    body: "Track Netflix next to your company's AWS bill without mixing them. Per-entity filters, budgets and reports keep both lives tidy.",
  },
  {
    icon: "📲",
    title: "Share a payment SMS, we log it",
    body: "Got a bank debit SMS? Share it to SubTrakr and it matches the subscription and marks it paid. No SMS-reading permissions, ever.",
  },
  {
    icon: "☁️",
    title: "Offline-first, synced everywhere",
    body: "Works instantly with zero connection, then syncs to your account. Phone, tablet, web — the same data, always current.",
  },
  {
    icon: "📎",
    title: "Invoice vault",
    body: "Attach the invoice PDF to any payment and find it at filing time — instead of digging through six months of email.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-14 text-center"
      >
        <p className="text-sm font-semibold uppercase tracking-widest text-glow">
          Everything that leaks money, watched
        </p>
        <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
          Small subscriptions add up.
          <br className="hidden sm:block" /> SubTrakr adds them up first.
        </h2>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.1 }}
            className="glass group rounded-3xl p-6 transition hover:border-glow/30"
          >
            <span className="text-2xl">{f.icon}</span>
            <h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
