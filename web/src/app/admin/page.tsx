import { createAdminClient } from "@/lib/supabase/admin";
import { formatINR, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const db = createAdminClient();

  const [usersRes, billingRes, txRes, subsRes] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("subscriber_billing").select("status"),
    db
      .from("billing_transactions")
      .select("amount, status, created_at")
      .order("created_at", { ascending: false }),
    db.from("subscriptions").select("id", { count: "exact", head: true }),
  ]);

  const totalUsers = usersRes.data?.users?.length ?? 0;
  const billingRows = billingRes.data ?? [];
  const paidActive = billingRows.filter((b) => b.status === "active").length;

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const captured = (txRes.data ?? []).filter((t) => t.status === "captured");
  const revenueThisMonth = captured
    .filter((t) => new Date(t.created_at) >= monthStart)
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const revenueAllTime = captured.reduce((sum, t) => sum + Number(t.amount), 0);

  const stats: [string, string][] = [
    ["Total users", String(totalUsers)],
    ["Paid subscribers", String(paidActive)],
    ["Revenue this month", formatINR(revenueThisMonth)],
    ["Revenue all-time", formatINR(revenueAllTime)],
    ["Tracked subscriptions", String(subsRes.count ?? 0)],
  ];

  const recent = (txRes.data ?? []).slice(0, 8);

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Overview</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="glass rounded-2xl p-4">
            <p className="font-mono text-xl font-semibold">{value}</p>
            <p className="mt-1 text-xs text-ink-2">{label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-8 text-sm font-semibold text-ink-2">
        Recent transactions
      </h2>
      {recent.length === 0 ? (
        <p className="glass rounded-2xl p-6 text-sm text-ink-3">
          No transactions yet — they&apos;ll appear here once Razorpay is
          configured and the first payment lands.
        </p>
      ) : (
        <ul className="space-y-2">
          {recent.map((t, i) => (
            <li
              key={i}
              className="glass flex items-center justify-between rounded-xl px-4 py-3 text-sm"
            >
              <span className="text-ink-2">{formatDate(t.created_at)}</span>
              <span
                className={
                  t.status === "captured" ? "text-glow" : "text-ink-3"
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
  );
}
