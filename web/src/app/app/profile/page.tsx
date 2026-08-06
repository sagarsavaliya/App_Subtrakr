import { createClient } from "@/lib/supabase/server";
import { ProfileEntitiesAndPaymentsSection } from "@/components/ProfileEntitiesAndPaymentsSection";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entities }, { data: billing }, { data: paymentMethods }] = await Promise.all([
    supabase.from("entities").select("id, name, type, gst_number").order("type"),
    supabase.from("subscriber_billing").select("*, plans(max_entities)").maybeSingle(),
    supabase
      .from("payment_methods")
      .select("*")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  const maxEntities = (billing?.plans as unknown as { max_entities: number | null } | null)
    ?.max_entities;
  const limit = billing ? maxEntities : 1; // no billing row at all = Free plan's cap
  const atLimit = limit !== null && limit !== undefined && (entities?.length ?? 0) >= limit;

  const name = (user?.user_metadata?.full_name as string) ?? "—";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <h1 className="text-xl font-semibold">Profile</h1>

      {/* Page layout order:
          1. Profile (Page Title)
          2. Entities
          3. Profile Information Card
          4. Payment Methods */}
      <ProfileEntitiesAndPaymentsSection
        userName={name}
        userCreatedAt={user?.created_at ?? null}
        userEmail={user?.email ?? null}
        userEmailConfirmed={!!user?.email_confirmed_at}
        userPhone={user?.phone ?? null}
        entities={entities ?? []}
        methods={paymentMethods ?? []}
        atLimit={atLimit}
        limit={limit ?? null}
      />

      <p className="pt-2 text-xs text-ink-3">
        Manage subscriptions, reminders, and GST exports in the SubTrakr mobile
        app — everything stays in sync with this account.
      </p>
    </div>
  );
}
