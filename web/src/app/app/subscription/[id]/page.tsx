import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatINR, formatDate } from "@/lib/format";
import { markPaid, deleteSubscription } from "../../actions";
import { SubscriptionDetailActions } from "@/components/SubscriptionDetailActions";
import { ArrowLeftIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: sub }, { data: history }, { data: paymentMethods }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, name, amount, currency, billing_cycle, custom_cycle_days, start_date, next_due_date, status, is_auto_debit, category, notes, entity_id, entities(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("payment_history")
      .select("id, paid_date, amount_paid, source, payment_methods(label)")
      .eq("subscription_id", id)
      .order("paid_date", { ascending: false }),
    supabase
      .from("payment_methods")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  // RLS already scopes this to the caller's own rows — a null result here
  // means either it doesn't exist or (indistinguishably, by design) it
  // belongs to someone else, so notFound() either way rather than leaking
  // which.
  if (!sub) notFound();

  const entityName = (sub.entities as unknown as { name: string } | null)?.name ?? "";
  const totalPaid = (history ?? []).reduce((sum, h) => sum + Number(h.amount_paid), 0);
  const overdue = new Date(sub.next_due_date) < new Date() && sub.status === "active";

  const sourceLabel: Record<string, string> = {
    manual: "Manual",
    sms_detected: "Detected",
    auto: "Auto",
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/app"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-3 transition-colors duration-150 hover:text-ink-2"
      >
        <ArrowLeftIcon className="h-3.5 w-3.5" />
        Back to subscriptions
      </Link>

      <div className="glass mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl p-6">
        <div className="flex items-center gap-4">
          <div className="brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-[#08201a]">
            {sub.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="flex items-center gap-2 text-lg font-semibold">
              {sub.name}
              {sub.status !== "active" && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold capitalize text-ink-2">
                  {sub.status}
                </span>
              )}
            </p>
            <p className="text-sm text-ink-2">
              {entityName} ·{" "}
              <span className={overdue ? "text-overdue" : "text-ink-2"}>
                {sub.status === "active"
                  ? `${overdue ? "Overdue — was due" : "renews"} ${formatDate(sub.next_due_date)}`
                  : `since ${formatDate(sub.start_date)}`}
              </span>
            </p>
          </div>
        </div>
        <SubscriptionDetailActions
          id={sub.id}
          name={sub.name}
          amount={sub.amount}
          active={sub.status === "active"}
          markPaidAction={markPaid}
          deleteAction={deleteSubscription}
          paymentMethods={paymentMethods ?? []}
        />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          [formatINR(sub.amount), `/${sub.billing_cycle.replace("_", " ")}`],
          [formatINR(totalPaid), "Total paid"],
          [String(history?.length ?? 0), "Payments"],
          [sub.is_auto_debit ? "On" : "Off", "Auto-debit"],
        ].map(([value, label]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <p className="font-mono text-lg font-semibold">{value}</p>
            <p className="mt-1 text-xs text-ink-2">{label}</p>
          </div>
        ))}
      </div>

      {sub.notes && (
        <div className="glass mb-6 rounded-2xl p-4 text-sm text-ink-2">{sub.notes}</div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-ink-2">Payment history</h2>
      {!history?.length ? (
        <div className="glass rounded-3xl p-10 text-center text-sm text-ink-2">
          No payments recorded yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {history.map((h) => {
            const methodLabel = (h.payment_methods as unknown as { label: string } | null)?.label;
            return (
              <li
                key={h.id}
                className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm"
              >
                <span className="text-ink-2">{formatDate(h.paid_date)}</span>
                <span className="min-w-0 flex-1 truncate text-center text-xs text-ink-3">
                  {methodLabel ?? "—"}
                </span>
                <span className="text-xs text-ink-3">{sourceLabel[h.source] ?? h.source}</span>
                <span className="font-mono font-medium">{formatINR(Number(h.amount_paid))}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
