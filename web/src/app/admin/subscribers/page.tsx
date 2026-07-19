import { createAdminClient } from "@/lib/supabase/admin";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const db = createAdminClient();

  const [usersRes, billingRes, subCountsRes] = await Promise.all([
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from("subscriber_billing").select("user_id, status, current_period_end, plans(name)"),
    db.from("subscriptions").select("user_id"),
  ]);

  const users = usersRes.data?.users ?? [];
  const billingByUser = new Map(
    (billingRes.data ?? []).map((b) => [b.user_id, b]),
  );
  const subCount = new Map<string, number>();
  for (const row of subCountsRes.data ?? []) {
    subCount.set(row.user_id, (subCount.get(row.user_id) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-semibold">Subscribers</h1>
        <span className="text-sm text-ink-3">{users.length} users</span>
      </div>

      <div className="glass overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wider text-ink-3">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3 text-right">Tracked subs</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const billing = billingByUser.get(u.id);
              const planName =
                (billing?.plans as unknown as { name: string } | null)?.name ??
                "Free";
              return (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <p className="font-medium">
                      {(u.user_metadata?.full_name as string) ?? "—"}
                    </p>
                    <p className="text-xs text-ink-3">{u.email}</p>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {u.created_at ? formatDate(u.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        planName === "Free" ? "text-ink-2" : "text-glow"
                      }
                    >
                      {planName}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {billing?.status ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink-2">
                    {billing?.current_period_end
                      ? formatDate(billing.current_period_end)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {subCount.get(u.id) ?? 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
