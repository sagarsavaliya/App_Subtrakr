"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-4xl px-5 pb-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6 }}
        className="glass-strong glow-shadow relative overflow-hidden rounded-[2.5rem] border-glow/25 p-10 text-center sm:p-14"
      >
        <div className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-accent-a/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-accent-b/20 blur-3xl" />
        <h2 className="relative text-3xl font-bold sm:text-4xl">
          Know exactly where your money{" "}
          <span className="brand-text">renews next</span>
        </h2>
        <p className="relative mx-auto mt-4 max-w-md text-ink-2">
          Free to start, two minutes to set up, and one renewal caught in time
          pays for a year of Pro.
        </p>
        <Link
          href="/login?mode=signup"
          className="brand-gradient glow-shadow relative mt-8 inline-block rounded-2xl px-8 py-4 font-bold text-[#08201a] transition hover:scale-[1.02]"
        >
          Create your free account
        </Link>
      </motion.div>
    </section>
  );
}
