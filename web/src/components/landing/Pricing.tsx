"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { formatINR } from "@/lib/format";

export type LandingPlan = {
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_entities: number | null;
  max_subscriptions: number | null;
};

export function Pricing({ plans }: { plans: LandingPlan[] }) {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-14 text-center"
      >
        <h2 className="text-3xl font-bold sm:text-4xl">
          Simple pricing, <span className="brand-text">Indian rupees</span>
        </h2>
        <p className="mt-3 text-ink-2">
          Pay by UPI, card or netbanking. Cancel anytime — your data exports
          with you.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan, i) => {
          const highlight = plan.code === "pro";
          return (
            <motion.div
              key={plan.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`rounded-3xl p-7 ${
                highlight
                  ? "glass-strong border-glow/30 glow-shadow md:-translate-y-3"
                  : "glass"
              }`}
            >
              {highlight && (
                <p className="mb-3 inline-block rounded-full bg-glow/15 px-3 py-1 text-xs font-semibold text-glow">
                  Most popular
                </p>
              )}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-ink-2">
                {plan.description}
              </p>
              <p className="mt-5 font-mono text-4xl font-bold">
                {plan.price_monthly > 0 ? formatINR(plan.price_monthly) : "₹0"}
                <span className="text-base font-normal text-ink-3">/mo</span>
              </p>
              {plan.price_yearly > 0 && (
                <p className="mt-1 text-xs text-ink-3">
                  {formatINR(plan.price_yearly)}/yr — 2 months free
                </p>
              )}
              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                <li>
                  ✓{" "}
                  {plan.max_entities
                    ? `${plan.max_entities} ${plan.max_entities === 1 ? "entity" : "entities"}`
                    : "Unlimited entities"}
                </li>
                <li>
                  ✓{" "}
                  {plan.max_subscriptions
                    ? `Up to ${plan.max_subscriptions} subscriptions`
                    : "Unlimited subscriptions"}
                </li>
                <li>✓ Renewal reminders</li>
                {plan.code !== "free" && <li>✓ GST-ready PDF/CSV exports</li>}
                {plan.code !== "free" && <li>✓ Invoice vault</li>}
                {plan.code === "team" && <li>✓ Whole-team access</li>}
              </ul>
              <Link
                href="/login?mode=signup"
                className={`mt-7 block rounded-2xl py-3 text-center text-sm font-bold transition ${
                  highlight
                    ? "brand-gradient glow-shadow text-[#08201a] hover:opacity-90"
                    : "glass text-ink hover:border-glow/30"
                }`}
              >
                {plan.code === "free" ? "Start free" : `Get ${plan.name}`}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
