"use client";

import { motion } from "framer-motion";

const STEPS = [
  {
    n: "01",
    title: "Add what you pay for",
    body: "Search the catalogue — Netflix, AWS, Jio, Adobe — or add anything custom. Amount, cycle, entity: 20 seconds each.",
  },
  {
    n: "02",
    title: "Let it watch the calendar",
    body: "SubTrakr computes every next due date and reminds you before the charge. Share a bank SMS in and it logs the payment for you.",
  },
  {
    n: "03",
    title: "Export when it matters",
    body: "Come GST filing, one tap produces the month's business-subscription report with GST split out. Your CA will ask what changed.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl px-5 py-24">
      <motion.h2
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-14 text-center text-3xl font-bold sm:text-4xl"
      >
        Up and running in <span className="brand-text">three steps</span>
      </motion.h2>

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <motion.div
            key={s.n}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5, delay: i * 0.12 }}
            className="glass relative overflow-hidden rounded-3xl p-7"
          >
            <span className="brand-text font-mono text-4xl font-bold opacity-60">
              {s.n}
            </span>
            <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-2">{s.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
