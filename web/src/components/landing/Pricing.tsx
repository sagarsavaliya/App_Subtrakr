"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatINR } from "@/lib/format";
import {
  BILLING_CYCLES,
  cycleLabel,
  cycleSuffix,
  priceForCycle,
  effectiveMonthly,
  type BillingCycle,
} from "@/lib/billingCycle";
import { categoryOf, type PlanCategory } from "@/lib/planCategory";
import { CheckCircleIcon } from "@/components/icons";

export type LandingPlan = {
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_half_yearly: number;
  price_yearly: number;
  max_entities: number | null;
  max_subscriptions: number | null;
};

/** Mirrors the app's own BillingPlanGrid (same category + cycle toggle,
 *  same decluttered card content) so a visitor sees the identical pricing
 *  model here as they will once signed in — just with a signup link
 *  instead of a real Upgrade/Downgrade button, since there's no account
 *  yet to charge. */
export function Pricing({ plans }: { plans: LandingPlan[] }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [category, setCategory] = useState<PlanCategory>("personal");

  const visiblePlans = plans.filter((p) => categoryOf(p) === category);
  const cardWidthClass =
    visiblePlans.length <= 2
      ? "sm:w-[calc(50%-0.625rem)] lg:w-96"
      : "sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]";

  return (
    <section id="pricing" className="mx-auto max-w-6xl px-5 py-24">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="mb-10 text-center"
      >
        <h2 className="text-3xl font-bold sm:text-4xl">
          Simple pricing, <span className="brand-text">Indian rupees</span>
        </h2>
        <p className="mt-3 text-ink-2">
          Pay by UPI, card or netbanking. Cancel anytime — your data exports
          with you.
        </p>
      </motion.div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="glass inline-flex gap-1 rounded-full p-1">
            {(["personal", "business"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-5 py-1.5 text-sm capitalize transition-colors ${
                  category === c
                    ? "brand-gradient font-semibold text-[#08201a]"
                    : "text-ink-2 hover:text-ink"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-3">
            {category === "personal"
              ? "Just your own subscriptions, on one personal entity."
              : "Track subscriptions across your business entities too."}
          </p>
        </div>

        <div className="glass inline-flex gap-1 rounded-full p-1">
          {BILLING_CYCLES.map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
                cycle === c
                  ? "brand-gradient font-semibold text-[#08201a]"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {cycleLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-6">
        {visiblePlans.map((plan, i) => {
          const highlight = plan.code === "pro";
          const isFree = plan.price_monthly === 0;
          const price = priceForCycle(plan, cycle);
          return (
            <motion.div
              key={plan.code}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`w-full rounded-3xl p-7 ${cardWidthClass} ${
                highlight
                  ? "glass-strong border-glow/30 glow-shadow md:-translate-y-3"
                  : "glass"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                {highlight && (
                  <p className="shrink-0 rounded-full bg-glow/15 px-3 py-1 text-xs font-semibold text-glow">
                    Most popular
                  </p>
                )}
              </div>
              <p className="mt-1 min-h-10 text-sm text-ink-2">{plan.description}</p>

              <p className="mt-5 font-mono text-4xl font-bold">
                {price > 0 ? formatINR(price) : "₹0"}
                {price > 0 && (
                  <span className="text-base font-normal text-ink-3">{cycleSuffix(cycle)}</span>
                )}
              </p>
              {price > 0 && cycle !== "monthly" && (
                <p className="text-xs text-ink-3">
                  ≈ {formatINR(effectiveMonthly(plan, cycle))}/mo
                </p>
              )}

              <ul className="mt-6 space-y-2 text-sm text-ink-2">
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-glow" />
                  {plan.max_entities
                    ? `${plan.max_entities} ${plan.max_entities === 1 ? "entity" : "entities"}`
                    : "Unlimited entities"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-glow" />
                  {plan.max_subscriptions
                    ? `Up to ${plan.max_subscriptions} subscriptions`
                    : "Unlimited subscriptions"}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-glow" />
                  Renewal reminders
                </li>
                {!isFree && (
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 shrink-0 text-glow" />
                    GST-ready exports · Invoice vault
                  </li>
                )}
              </ul>
              <Link
                href="/login?mode=signup"
                className={`mt-7 block rounded-2xl py-3 text-center text-sm font-bold transition ${
                  highlight
                    ? "brand-gradient glow-shadow text-[#08201a] hover:opacity-90"
                    : "glass text-ink hover:border-glow/30"
                }`}
              >
                {isFree ? "Start free" : `Get ${plan.name}`}
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
