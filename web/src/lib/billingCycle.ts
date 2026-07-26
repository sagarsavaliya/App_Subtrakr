/** SubTrakr's own subscription billing cycle (subscriber_billing.billing_cycle)
 *  — four cycles now, not just monthly/yearly. Kept in one place so
 *  checkout/verify/webhook/UI never have to duplicate the cycle → months
 *  or cycle → price-column mapping (three near-identical ternaries were
 *  already drifting before this). Unrelated to the *tracked*-subscription
 *  billing_cycle column (weekly/monthly/quarterly/half_yearly/yearly/
 *  custom) on the `subscriptions` table — same word, different concept. */

export const BILLING_CYCLES = ["monthly", "quarterly", "half_yearly", "yearly"] as const;
export type BillingCycle = (typeof BILLING_CYCLES)[number];

export function isBillingCycle(value: unknown): value is BillingCycle {
  return typeof value === "string" && (BILLING_CYCLES as readonly string[]).includes(value);
}

const CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  quarterly: 3,
  half_yearly: 6,
  yearly: 12,
};

export function cycleLabel(cycle: BillingCycle): string {
  return { monthly: "Monthly", quarterly: "Quarterly", half_yearly: "Half-yearly", yearly: "Yearly" }[
    cycle
  ];
}

export function addCyclePeriod(from: Date, cycle: BillingCycle): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + CYCLE_MONTHS[cycle]);
  return d;
}

export type PlanPrices = {
  price_monthly: number;
  price_quarterly: number;
  price_half_yearly: number;
  price_yearly: number;
};

export function priceForCycle(plan: PlanPrices, cycle: BillingCycle): number {
  return {
    monthly: plan.price_monthly,
    quarterly: plan.price_quarterly,
    half_yearly: plan.price_half_yearly,
    yearly: plan.price_yearly,
  }[cycle];
}
