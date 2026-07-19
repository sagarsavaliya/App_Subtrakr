"use client";

import Link from "next/link";
import { motion } from "framer-motion";

const DEMO_ROWS = [
  { initials: "NF", name: "Netflix", meta: "Personal · renews 25 Jul", amount: "₹649", color: "#E5484D" },
  { initials: "AW", name: "AWS", meta: "Akshara Tech · auto-debit", amount: "₹4,120", color: "#FF9900" },
  { initials: "SP", name: "Spotify", meta: "Personal · renews 2 Aug", amount: "₹199", color: "#A3E635" },
  { initials: "CL", name: "Claude", meta: "Akshara Tech · renews 9 Aug", amount: "₹1,650", color: "#E8703A" },
];

export function Hero() {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-24 pt-36 lg:grid-cols-2">
      <div>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass mb-5 inline-block rounded-full px-4 py-1.5 text-xs font-semibold text-glow"
        >
          Built for India · GST-ready · UPI friendly
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.08 }}
          className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-[3.4rem]"
        >
          All your subscriptions.
          <br />
          <span className="brand-text">Tracked. Sorted.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16 }}
          className="mt-5 max-w-md text-lg text-ink-2"
        >
          Netflix to AWS, personal to business — one place for every recurring
          payment, with renewal reminders before you&apos;re charged and
          GST-ready reports at filing time.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.24 }}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Link
            href="/login?mode=signup"
            className="brand-gradient glow-shadow rounded-2xl px-7 py-3.5 font-bold text-[#08201a] transition hover:scale-[1.02] hover:opacity-90"
          >
            Start free — no card needed
          </Link>
          <a
            href="#features"
            className="glass rounded-2xl px-6 py-3.5 text-sm text-ink transition hover:border-glow/30"
          >
            See what it does
          </a>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="mt-10 flex gap-8 text-sm text-ink-2"
        >
          <div>
            <p className="font-mono text-xl font-semibold text-ink">2 min</p>
            <p>to first insight</p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold text-ink">₹0</p>
            <p>to get started</p>
          </div>
          <div>
            <p className="font-mono text-xl font-semibold text-ink">18%</p>
            <p>GST, auto-computed</p>
          </div>
        </motion.div>
      </div>

      {/* Stylized live-looking app mock */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotate: 1.5 }}
        animate={{ opacity: 1, y: 0, rotate: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="relative mx-auto w-full max-w-md"
      >
        <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-accent-a/10 blur-3xl" />
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="glass-strong rounded-[2rem] border-glow/20 p-6"
        >
          <p className="text-[10px] font-semibold uppercase tracking-widest text-ink-2">
            Total monthly spend
          </p>
          <p className="brand-text mt-1 font-mono text-4xl font-bold">₹6,618</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[
              ["12", "Active"],
              ["3", "Due this week"],
              ["5", "Auto-debit"],
            ].map(([v, l]) => (
              <div key={l} className="glass rounded-xl py-2">
                <p className="font-mono text-base">{v}</p>
                <p className="text-[10px] text-ink-2">{l}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-2.5">
            {DEMO_ROWS.map((row, i) => (
              <motion.div
                key={row.name}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.15, duration: 0.5 }}
                className="glass flex items-center gap-3 rounded-2xl p-3"
              >
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold"
                  style={{ background: `${row.color}26`, color: row.color }}
                >
                  {row.initials}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{row.name}</span>
                  <span className="block truncate text-[11px] text-ink-3">
                    {row.meta}
                  </span>
                </span>
                <span className="font-mono text-sm">{row.amount}</span>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5, duration: 0.4 }}
            className="mt-4 flex items-center gap-2 rounded-2xl border border-due/30 bg-due/10 p-3 text-xs text-due"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-due" />
            Netflix renews in 3 days — ₹649
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
