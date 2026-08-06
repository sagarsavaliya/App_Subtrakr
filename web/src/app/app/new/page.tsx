import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewSubscriptionForm } from "./NewSubscriptionForm";

export default async function NewSubscriptionPage() {
  const supabase = await createClient();
  const [{ data: entities }, { data: billing }, { count }, { data: paymentMethods }] =
    await Promise.all([
      supabase.from("entities").select("id, name, type").order("type"),
      supabase.from("subscriber_billing").select("*, plans(max_subscriptions)").maybeSingle(),
      supabase.from("subscriptions").select("id", { count: "exact", head: true }),
      supabase.from("payment_methods").select("id, entity_id, label"),
    ]);

  const maxSubscriptions = (
    billing?.plans as unknown as { max_subscriptions: number | null } | null
  )?.max_subscriptions;
  const limit = billing ? maxSubscriptions : 5; // no billing row at all = Free plan's cap
  const atLimit = limit !== null && limit !== undefined && (count ?? 0) >= limit;

  return (
    <div className="mx-auto max-w-2xl">
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
      ) : !entities || entities.length === 0 ? (
        <div className="glass rounded-3xl p-8 text-center space-y-4 text-ink-2">
          <p className="text-base font-semibold text-ink">No entities found</p>
          <p className="text-sm text-ink-3 max-w-md mx-auto">
            Subscriptions are assigned to an entity (e.g. Personal or Company). Please create an entity on your Profile page first.
          </p>
          <Link
            href="/app/profile"
            className="inline-block brand-gradient rounded-xl px-5 py-2.5 text-xs font-bold text-[#08201a] transition hover:opacity-90"
          >
            Create entity in Profile
          </Link>
        </div>
      ) : (
        <NewSubscriptionForm entities={entities} paymentMethods={paymentMethods ?? []} />
      )}
    </div>
  );
}
