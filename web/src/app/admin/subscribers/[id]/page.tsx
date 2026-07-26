import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminIdentity } from "@/lib/adminAuth";
import { formatDate, formatINR, monthlyEquivalent } from "@/lib/format";
import { ArrowLeftIcon, BuildingIcon } from "@/components/icons";
import {
  SuspendToggleButton,
  SendPinResetButton,
  DeleteAccountButton,
} from "@/components/admin/SubscriberActions";
import { PlanOverrideForm } from "@/components/admin/PlanOverrideForm";
import { SubscriptionRow } from "@/components/SubscriptionRow";
import { adminMarkSubscriptionPaid, adminDeleteSubscription } from "../../actions";

export const dynamic = "force-dynamic";

type BillingRow = {
  status: string;
  current_period_end: string | null;
  plans: { id: string; name: string; code: string } | null;
};

export default async function SubscriberDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ entity?: string }>;
}) {
  const { id } = await params;
  const { entity: entityFilter } = await searchParams;
  const db = createAdminClient();
  const admin = await getAdminIdentity();

  const [
    { data: userRes },
    { data: billing },
    { data: entities },
    { data: subs },
    { data: plans },
    { data: transactions },
    { data: payments },
  ] = await Promise.all([
    db.auth.admin.getUserById(id),
    db
      .from("subscriber_billing")
      .select("status, current_period_end, plans(id, name, code)")
      .eq("user_id", id)
      .maybeSingle(),
    db.from("entities").select("id, name, type, gst_number").eq("user_id", id).order("type"),
    db
      .from("subscriptions")
      .select(
        "id, entity_id, name, amount, billing_cycle, custom_cycle_days, next_due_date, status, is_auto_debit",
      )
      .eq("user_id", id)
      .order("next_due_date"),
    db.from("plans").select("id, name, code").order("sort_order"),
    db
      .from("billing_transactions")
      .select("id, amount, status, created_at")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(10),
    db.from("payment_history").select("amount_paid").eq("user_id", id),
  ]);

  const user = userRes?.user;
  if (!user) notFound();

  const billingRow = billing as unknown as BillingRow | null;
  const banned = !!user.banned_until && new Date(user.banned_until) > new Date();
  const name = (user.user_metadata?.full_name as string) ?? "—";
  const entityName = (eid: string) => entities?.find((e) => e.id === eid)?.name ?? "";
  const now = new Date();

  const allSubs = subs ?? [];
  const shownSubs = entityFilter
    ? allSubs.filter((s) => s.entity_id === entityFilter)
    : allSubs;
  const activeSubs = allSubs.filter((s) => s.status === "active");
  const monthlySpend = activeSubs.reduce(
    (sum, s) => sum + monthlyEquivalent(s.amount, s.billing_cycle, s.custom_cycle_days),
    0,
  );
  const lifetimePaid = (payments ?? []).reduce((sum, p) => sum + Number(p.amount_paid), 0);
  const stats: [string, string][] = [
    [String(activeSubs.length), "Active"],
    [formatINR(Math.round(monthlySpend)), "Monthly spend"],
    [formatINR(lifetimePaid), "Lifetime paid"],
    [String(activeSubs.filter((s) => s.is_auto_debit).length), "Auto-debit"],
  ];

  return (
    <div>
      <Link
        href="/admin/subscribers"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors duration-150 hover:text-ink-2"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Back to subscribers
      </Link>

      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-[#08201a]">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              {name}
              {banned && (
                <span className="rounded-full bg-overdue/15 px-2 py-0.5 text-xs font-semibold text-overdue">
                  Suspended
                </span>
              )}
            </p>
            <p className="text-sm text-ink-2">
              {user.email ?? (user.phone ? `+${user.phone}` : "—")}
            </p>
            <p className="mt-0.5 text-xs text-ink-3">
              Joined {user.created_at ? formatDate(user.created_at) : "—"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <SendPinResetButton userId={user.id} />
          <SuspendToggleButton userId={user.id} banned={banned} />
          {admin?.role === "super_admin" && (
            <DeleteAccountButton userId={user.id} name={name} />
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(([value, label]) => (
          <div
            key={label}
            className="glass rounded-2xl p-4 transition-transform duration-200 hover:-translate-y-0.5"
          >
            <p className="font-mono text-lg font-semibold">{value}</p>
            <p className="mt-1 text-xs text-ink-2">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-ink-2">
              Subscriptions ({shownSubs.length}{entityFilter ? ` of ${allSubs.length}` : ""})
            </h2>
            {entities && entities.length > 1 && (
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/subscribers/${user.id}`}
                  className={`rounded-full px-3 py-1 text-xs transition-transform duration-150 hover:scale-105 ${!entityFilter ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
                >
                  All
                </Link>
                {entities.map((e) => (
                  <Link
                    key={e.id}
                    href={`/admin/subscribers/${user.id}?entity=${e.id}`}
                    className={`rounded-full px-3 py-1 text-xs transition-transform duration-150 hover:scale-105 ${entityFilter === e.id ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
                  >
                    {e.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {!shownSubs.length ? (
            <p className="glass rounded-2xl p-6 text-sm text-ink-3">
              {entityFilter ? "No subscriptions for this entity." : "No tracked subscriptions."}
            </p>
          ) : (
            <ul className="space-y-3">
              {shownSubs.map((s, i) => (
                <SubscriptionRow
                  key={s.id}
                  id={s.id}
                  name={s.name}
                  entityName={entityName(s.entity_id)}
                  amount={s.amount}
                  billingCycle={s.billing_cycle}
                  nextDueDate={s.next_due_date}
                  status={s.status}
                  isAutoDebit={s.is_auto_debit}
                  overdue={new Date(s.next_due_date) < now && s.status === "active"}
                  index={i}
                  markPaidAction={adminMarkSubscriptionPaid}
                  deleteAction={adminDeleteSubscription}
                  hiddenFields={{ user_id: user.id }}
                />
              ))}
            </ul>
          )}

          <h2 className="mb-3 mt-8 text-sm font-semibold text-ink-2">
            Recent transactions
          </h2>
          {!transactions?.length ? (
            <p className="glass rounded-2xl p-6 text-sm text-ink-3">
              No payments from this subscriber yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {transactions.map((t) => (
                <li
                  key={t.id}
                  className="glass flex items-center justify-between rounded-xl px-4 py-3 text-sm"
                >
                  <span className="text-ink-2">{formatDate(t.created_at)}</span>
                  <span
                    className={
                      t.status === "captured"
                        ? "text-glow"
                        : t.status === "failed" || t.status === "refunded"
                          ? "text-overdue"
                          : "text-due"
                    }
                  >
                    {t.status}
                  </span>
                  <span className="font-mono">{formatINR(Number(t.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-2">Plan</h2>
            <p className="mb-4 text-sm text-ink-2">
              {billingRow ? `${billingRow.plans?.name} · ${billingRow.status}` : "Free"}
              {billingRow?.current_period_end && (
                <> · renews {formatDate(billingRow.current_period_end)}</>
              )}
            </p>
            <PlanOverrideForm
              userId={user.id}
              plans={plans ?? []}
              currentPlanId={billingRow?.plans?.id}
            />
          </div>

          <div className="glass rounded-2xl p-5">
            <h2 className="mb-3 text-sm font-semibold text-ink-2">Entities</h2>
            <ul className="space-y-2">
              {entities?.map((e) => (
                <li key={e.id} className="flex items-center gap-2 text-sm">
                  {e.type === "company" ? (
                    <BuildingIcon className="h-4 w-4 text-glow" />
                  ) : (
                    <span className="h-3 w-3 rounded-full bg-personal/60" />
                  )}
                  <span>{e.name}</span>
                  {e.gst_number && (
                    <span className="text-xs text-ink-3">· {e.gst_number}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
