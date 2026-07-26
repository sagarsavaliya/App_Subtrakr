import { formatINR, formatDate } from "@/lib/format";
import { cycleLabel, isBillingCycle } from "@/lib/billingCycle";

type Transaction = {
  id: string;
  created_at: string;
  amount: number;
  status: string;
  method: string | null;
  plan_code: string | null;
  billing_cycle: string | null;
  razorpay_payment_id: string | null;
};

const STATUS_STYLE: Record<string, string> = {
  captured: "bg-glow/15 text-glow",
  authorized: "bg-due/15 text-due",
  created: "bg-white/10 text-ink-2",
  failed: "bg-overdue/15 text-overdue",
  refunded: "bg-overdue/15 text-overdue",
};

function methodLabel(method: string | null): string {
  if (!method) return "—";
  return { upi: "UPI", card: "Card", netbanking: "Net banking", wallet: "Wallet", emi: "EMI" }[
    method
  ] ?? method;
}

/** Every subscriber-facing payment/billing record in one place — plan_code
 *  and billing_cycle are read straight off the transaction row (not joined
 *  through the subscriber's *current* plan), since what they actually
 *  bought at the time shouldn't change just because they've since
 *  upgraded/downgraded. */
export function BillingHistoryTable({
  transactions,
  planNameByCode,
}: {
  transactions: Transaction[];
  planNameByCode: Record<string, string>;
}) {
  if (!transactions.length) {
    return (
      <div className="glass mt-4 rounded-2xl p-6 text-center text-sm text-ink-2">
        No payments yet — your billing history will show up here once you upgrade.
      </div>
    );
  }

  return (
    <div className="glass mt-4 overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-3">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Plan</th>
            <th className="px-4 py-3">Amount</th>
            <th className="px-4 py-3">Payment mode</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Transaction ID</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3 text-ink-2">{formatDate(t.created_at)}</td>
              <td className="px-4 py-3">
                {t.plan_code ? planNameByCode[t.plan_code] ?? t.plan_code : "—"}
                {t.billing_cycle && isBillingCycle(t.billing_cycle) && (
                  <span className="ml-1 text-xs text-ink-3">
                    · {cycleLabel(t.billing_cycle)}
                  </span>
                )}
              </td>
              <td className="px-4 py-3 font-mono">{formatINR(t.amount)}</td>
              <td className="px-4 py-3 text-ink-2">{methodLabel(t.method)}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${
                    STATUS_STYLE[t.status] ?? "bg-white/10 text-ink-2"
                  }`}
                >
                  {t.status}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-ink-3">
                {t.razorpay_payment_id ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
