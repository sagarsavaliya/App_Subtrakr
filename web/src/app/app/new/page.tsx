import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewSubscriptionForm } from "./NewSubscriptionForm";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();
  const [{ data: entities }, { data: billing }, { count }] = await Promise.all([
    supabase.from("entities").select("id, name, type").order("type"),
    supabase.from("subscriber_billing").select("*, plans(max_subscriptions)").maybeSingle(),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
  ]);

  const maxSubscriptions = (
    billing?.plans as unknown as { max_subscriptions: number | null } | null
  )?.max_subscriptions;
  const limit = billing ? maxSubscriptions : 5; // no billing row at all = Free plan's cap
  const atLimit = limit !== null && limit !== undefined && (count ?? 0) >= limit;

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add subscription</h1>
        <Link href="/app" className="text-sm text-ink-2 hover:text-ink">
          Cancel
        </Link>
      </div>

      {atLimit ? (
        <div className="glass rounded-2xl p-4 text-center text-sm text-ink-2">
          Your plan allows up to {limit} {limit === 1 ? "subscription" : "subscriptions"}.{" "}
          <Link href="/app/billing" className="text-glow hover:underline">
            Upgrade
          </Link>{" "}
          to track more.
        </div>
      ) : (
        <NewSubscriptionForm entities={entities ?? []} />
      )}
    </div>
  );
}
