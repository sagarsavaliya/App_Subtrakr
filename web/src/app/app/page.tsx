import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatDate, monthlyEquivalent } from "@/lib/format";
import { deleteSubscription, markPaid } from "./actions";

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
      <section className="glass-strong glow-shadow rounded-3xl border-glow/20 p-7">
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
          className={`rounded-full px-4 py-1.5 text-sm ${!entityFilter ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
        >
          All
        </Link>
        {(entities as Entity[] | null)?.map((e) => (
          <Link
            key={e.id}
            href={`/app?entity=${e.id}`}
            className={`rounded-full px-4 py-1.5 text-sm ${entityFilter === e.id ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
          >
            {e.name}
          </Link>
        ))}
        <div className="flex-1" />
        <Link
          href="/app/new"
          className="brand-gradient glow-shadow rounded-full px-5 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90"
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
            {shown.map((s) => {
              const overdue =
                new Date(s.next_due_date) < now && s.status === "active";
              return (
                <li
                  key={s.id}
                  className="glass flex items-center gap-4 rounded-2xl p-4"
                >
                  <div className="brand-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-bold text-[#08201a]">
                    {s.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-ink-2">
                      {entityName(s.entity_id)} ·{" "}
                      <span
                        className={
                          overdue
                            ? "text-overdue"
                            : s.status === "active"
                              ? "text-ink-2"
                              : "text-ink-3"
                        }
                      >
                        {s.status === "active"
                          ? `${overdue ? "Overdue — was due" : "renews"} ${formatDate(s.next_due_date)}`
                          : s.status}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">
                      {formatINR(s.amount)}
                    </p>
                    <p className="text-xs text-ink-3">
                      /{s.billing_cycle.replace("_", " ")}
                    </p>
                  </div>
                  {s.status === "active" && (
                    <form action={markPaid}>
                      <input type="hidden" name="id" value={s.id} />
                      <button
                        className="glass rounded-full px-3 py-1.5 text-xs text-glow transition hover:border-glow/40"
                        title="Mark paid — advances next due date"
                      >
                        Mark paid
                      </button>
                    </form>
                  )}
                  <form action={deleteSubscription}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      className="glass rounded-full px-3 py-1.5 text-xs text-ink-3 transition hover:text-overdue"
                      title="Delete subscription"
                    >
                      ✕
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
