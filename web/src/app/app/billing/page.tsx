import { createClient } from "@/lib/supabase/server";
import { hasSetting } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import { BillingPlanGrid } from "@/components/BillingPlanGrid";
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

      <div className="mt-8">
        <BillingPlanGrid
          plans={(plans as Plan[] | null) ?? []}
          currentCode={currentCode}
          currentSortOrder={currentSortOrder}
          daysRemaining={daysRemaining}
          paymentsReady={!!paymentsReady}
        />
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
