import { createClient } from "@/lib/supabase/server";
import { hasSetting } from "@/lib/settings";
import { formatINR, formatDate } from "@/lib/format";
import { UpgradeButton } from "@/components/UpgradeButton";
import { DowngradeButton } from "@/components/DowngradeButton";
import { BillingHistoryTable } from "@/components/BillingHistoryTable";

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

export default async function BillingPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: billing }, paymentsReady, { data: transactions }] =
    await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase
        .from("subscriber_billing")
        .select("*, plans(code, name, sort_order)")
        .maybeSingle(),
      hasSetting("razorpay_key_id"),
      supabase
        .from("billing_transactions")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);

  const currentPlanMeta = billing?.plans as unknown as {
    code: string;
    name: string;
    sort_order: number;
  } | null;
  const currentCode = currentPlanMeta?.code ?? "free";
  const currentSortOrder = currentPlanMeta?.sort_order ?? 0;

  const daysRemaining = billing?.current_period_end
    ? Math.max(
        0,
        Math.ceil(
          (new Date(billing.current_period_end).getTime() - Date.now()) / 86_400_000,
        ),
      )
    : null;

  return (
    <div>
      <h1 className="text-xl font-semibold">Your plan</h1>
      <p className="mt-1 text-sm text-ink-2">
        {billing
          ? `You're on ${currentPlanMeta?.name} · ${billing.status}` +
            (billing.current_period_end
              ? ` · renews ${formatDate(billing.current_period_end)}`
              : "")
          : "You're on Free."}
      </p>
      {daysRemaining !== null && (
        <p className="mt-1 text-xs text-ink-3">
          {daysRemaining > 0
            ? `${daysRemaining} ${daysRemaining === 1 ? "day" : "days"} left in your current paid period.`
            : "Your current paid period has ended."}
        </p>
      )}

      {!paymentsReady && (
        <p className="glass mt-4 rounded-2xl border-due/30 p-4 text-sm text-due">
          Online payments are being set up — paid plans will be available very
          soon.
        </p>
      )}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {(plans as Plan[] | null)?.map((plan) => {
          const isCurrent = plan.code === currentCode;
          const highlight = plan.code === "pro";
          return (
            <div
              key={plan.id}
              className={`rounded-3xl p-6 ${highlight ? "glass-strong border-glow/30 glow-shadow" : "glass"}`}
            >
              {highlight && (
                <p className="mb-2 inline-block rounded-full bg-glow/15 px-3 py-0.5 text-xs font-semibold text-glow">
                  Most popular
                </p>
              )}
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 min-h-10 text-sm text-ink-2">
                {plan.description}
              </p>
              <p className="mt-4 font-mono text-3xl font-bold">
                {plan.price_monthly > 0 ? formatINR(plan.price_monthly) : "₹0"}
                <span className="text-sm font-normal text-ink-3">/mo</span>
              </p>
              {plan.price_yearly > 0 && (
                <p className="text-xs text-ink-3">
                  or {formatINR(plan.price_quarterly)}/qtr · {formatINR(plan.price_half_yearly)}/half-yr ·{" "}
                  {formatINR(plan.price_yearly)}/yr
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
                {plan.code !== "free" && <li>GST-ready exports</li>}
                {plan.code !== "free" && <li>Invoice vault</li>}
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
                    priceMonthly={plan.price_monthly}
                    priceQuarterly={plan.price_quarterly}
                    priceHalfYearly={plan.price_half_yearly}
                    priceYearly={plan.price_yearly}
                    disabled={!paymentsReady}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mb-2 mt-10 text-lg font-semibold">Billing history</h2>
      <p className="mb-1 text-sm text-ink-2">
        Every payment on this account — date, amount, transaction ID, and status.
      </p>
      <BillingHistoryTable
        transactions={transactions ?? []}
        planNameByCode={Object.fromEntries(
          ((plans as Plan[] | null) ?? []).map((p) => [p.code, p.name]),
        )}
      />
    </div>
  );
}
