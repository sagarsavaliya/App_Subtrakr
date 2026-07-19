import { createClient } from "@/lib/supabase/server";
import { hasSetting } from "@/lib/settings";
import { formatINR, formatDate } from "@/lib/format";
import { UpgradeButton } from "@/components/UpgradeButton";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_entities: number | null;
  max_subscriptions: number | null;
};

export default async function BillingPage() {
  const supabase = await createClient();
  const [{ data: plans }, { data: billing }, paymentsReady] =
    await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("subscriber_billing").select("*, plans(code, name)").maybeSingle(),
      hasSetting("razorpay_key_id"),
    ]);

  const currentCode =
    (billing?.plans as unknown as { code: string } | null)?.code ?? "free";

  return (
    <div>
      <h1 className="text-xl font-semibold">Your plan</h1>
      <p className="mt-1 text-sm text-ink-2">
        {billing
          ? `You're on ${(billing.plans as unknown as { name: string }).name} · ${billing.status}` +
            (billing.current_period_end
              ? ` · renews ${formatDate(billing.current_period_end)}`
              : "")
          : "You're on Free."}
      </p>

      {!paymentsReady && (
        <p className="glass mt-4 rounded-2xl border-due/30 p-4 text-sm text-due">
          Online payments are being set up — paid plans will be available very
          soon.
        </p>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
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
                  or {formatINR(plan.price_yearly)}/yr (2 months free)
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
                {plan.code === "team" && <li>Team access</li>}
              </ul>
              <div className="mt-6">
                {isCurrent ? (
                  <p className="glass rounded-xl py-2.5 text-center text-sm text-ink-2">
                    Current plan
                  </p>
                ) : plan.code === "free" ? null : (
                  <UpgradeButton
                    planCode={plan.code}
                    priceMonthly={plan.price_monthly}
                    priceYearly={plan.price_yearly}
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
