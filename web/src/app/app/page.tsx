import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatINR, monthlyEquivalent } from "@/lib/format";
import { deleteSubscription, markPaid } from "./actions";
import { SubscriptionRow } from "@/components/SubscriptionRow";

type Sub = {
  id: string;
  entity_id: string;
  name: string;
  amount: number;
  billing_cycle: string;
  custom_cycle_days: number | null;
  next_due_date: string;
  status: string;
  is_auto_debit: boolean;
};

type Entity = { id: string; name: string; type: string };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ entity?: string }>;
}) {
  const { entity: entityFilter } = await searchParams;
  const supabase = await createClient();

  const [{ data: entities }, { data: subs }] = await Promise.all([
    supabase.from("entities").select("id, name, type").order("type"),
    supabase
      .from("subscriptions")
      .select(
        "id, entity_id, name, amount, billing_cycle, custom_cycle_days, next_due_date, status, is_auto_debit",
      )
      .order("next_due_date"),
  ]);

  const allSubs: Sub[] = subs ?? [];
  const shown = entityFilter
    ? allSubs.filter((s) => s.entity_id === entityFilter)
    : allSubs;
  const active = allSubs.filter((s) => s.status === "active");
  const totalMonthly = active.reduce(
    (sum, s) =>
      sum + monthlyEquivalent(s.amount, s.billing_cycle, s.custom_cycle_days),
    0,
  );
  const now = new Date();
  const weekOut = new Date(now.getTime() + 7 * 86400_000);
  const dueThisWeek = active.filter(
    (s) => new Date(s.next_due_date) <= weekOut,
  ).length;

  const entityName = (id: string) =>
    (entities as Entity[] | null)?.find((e) => e.id === id)?.name ?? "";

  return (
    <div>
      <section className="glass-strong hero-glow rounded-3xl border-glow/20 p-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-2">
          Total monthly spend
        </p>
        <p className="brand-text mt-1 font-mono text-4xl font-bold">
          {formatINR(Math.round(totalMonthly))}
        </p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {[
            [String(active.length), "Active"],
            [String(dueThisWeek), "Due this week"],
            [
              String(active.filter((s) => s.is_auto_debit).length),
              "Auto-debit",
            ],
          ].map(([v, l]) => (
            <div key={l} className="glass rounded-2xl p-3">
              <p className="font-mono text-lg">{v}</p>
              <p className="text-xs text-ink-2">{l}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href="/app"
          className={`rounded-full px-4 py-1.5 text-sm transition-transform duration-150 hover:scale-105 active:scale-95 ${!entityFilter ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
        >
          All
        </Link>
        {(entities as Entity[] | null)?.map((e) => (
          <Link
            key={e.id}
            href={`/app?entity=${e.id}`}
            className={`rounded-full px-4 py-1.5 text-sm transition-transform duration-150 hover:scale-105 active:scale-95 ${entityFilter === e.id ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
          >
            {e.name}
          </Link>
        ))}
        <div className="flex-1" />
        <Link
          href="/app/new"
          className="brand-gradient glow-shadow rounded-full px-5 py-2 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-105 active:scale-95"
        >
          + Add subscription
        </Link>
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Subscriptions</h2>
          <span className="text-sm text-ink-3">{shown.length} total</span>
        </div>

        {shown.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-ink-2">
            No subscriptions yet.{" "}
            <Link href="/app/new" className="text-glow hover:underline">
              Add your first one
            </Link>
            .
          </div>
        ) : (
          <ul className="space-y-3">
            {shown.map((s, i) => (
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
                markPaidAction={markPaid}
                deleteAction={deleteSubscription}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
