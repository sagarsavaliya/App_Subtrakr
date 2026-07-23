import { createAdminClient } from "@/lib/supabase/admin";
import { formatINR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const db = createAdminClient();

  const [{ data: transactions }, usersRes] = await Promise.all([
    db
      .from("billing_transactions")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const emailByUser = new Map(
    (usersRes.data?.users ?? []).map((u) => [u.id, u.email ?? "—"]),
  );

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Payments</h1>

      {!transactions?.length ? (
        <p className="glass rounded-2xl p-6 text-sm text-ink-3">
          No payments yet. Once Razorpay keys are configured in Settings and a
          subscriber upgrades, every transaction lands here.
        </p>
      ) : (
        <div className="glass overflow-x-auto rounded-2xl">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-3">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-white/5 transition-colors duration-150 hover:bg-white/[0.03]"
                >
                  <td className="px-4 py-3 text-ink-2">
                    {formatDate(t.created_at)}
                  </td>
                  <td className="px-4 py-3">{emailByUser.get(t.user_id) ?? t.user_id}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink-2">
                    {t.razorpay_payment_id ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-2">{t.method ?? "—"}</td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {formatINR(Number(t.amount))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
