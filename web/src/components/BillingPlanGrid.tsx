"use client";

import { useState } from "react";
import { formatINR } from "@/lib/format";
import { UpgradeButton } from "@/components/UpgradeButton";
import { DowngradeButton } from "@/components/DowngradeButton";
import {
  BILLING_CYCLES,
  cycleLabel,
  cycleSuffix,
  priceForCycle,
  effectiveMonthly,
  type BillingCycle,
} from "@/lib/billingCycle";
import { categoryOf, type PlanCategory } from "@/lib/planCategory";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_quarterly: number;
  price_half_yearly: number;
  price_yearly: number;
  max_entities: number | null;
  max_subscriptions: number | null;
  sort_order: number;
};

/** One cycle picked once for the whole grid, instead of a repeated 4-way
 *  toggle on every card (that version both looked noisy and wrapped into
 *  an ugly vertical stack in a narrow card). Cards themselves only show
 *  the price for whichever cycle is selected — the other three aren't
 *  duplicated as extra text underneath anymore. A second Personal/Business
 *  toggle filters which plans show at all, since showing all 5 side by
 *  side made it harder to tell which ones actually apply to you. */
export function BillingPlanGrid({
  plans,
  currentCode,
  currentSortOrder,
  daysRemaining,
  paymentsReady,
}: {
  plans: Plan[];
  currentCode: string;
  currentSortOrder: number;
  daysRemaining: number | null;
  paymentsReady: boolean;
}) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const currentPlan = plans.find((p) => p.code === currentCode);
  const [category, setCategory] = useState<PlanCategory>(
    currentPlan ? categoryOf(currentPlan) : "personal",
  );

  const visiblePlans = plans.filter((p) => categoryOf(p) === category);
  const cardWidthClass =
    visiblePlans.length <= 2
      ? "sm:w-[calc(50%-0.625rem)] lg:w-96"
      : "sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.834rem)]";

  return (
    <div>
      {/* Primary filter (which plans apply to you) on the left, secondary
          refinement (which cycle to pay) on the right — the two controls
          aren't peers, so a single centered stack of both was confusing
          about which one to reach for first. */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="glass inline-flex gap-1 rounded-full p-1">
            {(["personal", "business"] as const).map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-5 py-1.5 text-sm capitalize transition-colors ${
                  category === c ? "brand-gradient font-semibold text-[#08201a]" : "text-ink-2 hover:text-ink"
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
                cycle === c ? "brand-gradient font-semibold text-[#08201a]" : "text-ink-2 hover:text-ink"
              }`}
            >
              {cycleLabel(c)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-5">
        {visiblePlans.map((plan) => {
          const isCurrent = plan.code === currentCode;
          const highlight = plan.code === "pro";
          const isFree = plan.sort_order === 0;
          const price = priceForCycle(plan, cycle);

          return (
            <div
              key={plan.id}
              className={`w-full rounded-3xl p-6 ${cardWidthClass} ${
                highlight ? "glass-strong border-glow/30 glow-shadow" : "glass"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                {highlight && (
                  <p className="shrink-0 rounded-full bg-glow/15 px-3 py-0.5 text-xs font-semibold text-glow">
                    Most popular
                  </p>
                )}
              </div>
              <p className="mt-1 min-h-10 text-sm text-ink-2">{plan.description}</p>

              <p className="mt-4 font-mono text-3xl font-bold">
                {price > 0 ? formatINR(price) : "₹0"}
                {price > 0 && (
                  <span className="text-sm font-normal text-ink-3">{cycleSuffix(cycle)}</span>
                )}
              </p>
              {price > 0 && cycle !== "monthly" && (
                <p className="text-xs text-ink-3">
                  ≈ {formatINR(effectiveMonthly(plan, cycle))}/mo
                </p>
              )}

              <ul className="mt-4 space-y-1.5 text-sm text-ink-2">
                <li>
                  {plan.max_entities
                    ? `${plan.max_entities} ${plan.max_entities === 1 ? "entity" : "entities"}`
                    : "Unlimited entities"}
                </li>
                <li>
                  {plan.max_subscriptions
                    ? `Up to ${plan.max_subscriptions} subscriptions`
                    : "Unlimited subscriptions"}
                </li>
                {!isFree && <li>GST-ready exports · Invoice vault</li>}
              </ul>

              <div className="mt-6">
                {isCurrent ? (
                  <p className="glass rounded-xl py-2.5 text-center text-sm text-ink-2">
                    Current plan
                  </p>
                ) : plan.sort_order < currentSortOrder ? (
                  <DowngradeButton
                    planCode={plan.code}
                    planName={plan.name}
                    daysRemaining={daysRemaining}
                  />
                ) : (
                  <UpgradeButton
                    planCode={plan.code}
                    prices={plan}
                    cycle={cycle}
                    disabled={!paymentsReady}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
