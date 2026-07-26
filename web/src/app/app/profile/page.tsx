import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { AddEntityForm } from "@/components/AddEntityForm";
import { BuildingIcon } from "@/components/icons";
import { ProfileEmailSection } from "@/components/ProfileEmailSection";
import { ProfilePhoneSection } from "@/components/ProfilePhoneSection";
import { ProfilePaymentMethodsSection } from "@/components/ProfilePaymentMethodsSection";

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
    <div className="mx-auto max-w-6xl">
      <h1 className="mb-6 text-xl font-semibold">Profile</h1>

      {/* Email/mobile live inline here (not their own boxed rows below) —
          the card has room to spare, and they're both "who you are"
          alongside the name, not a separate concern. */}
      <div className="glass mb-8 flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-[#08201a]">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold">{name}</p>
            {user?.created_at && (
              <p className="mt-0.5 text-xs text-ink-3">
                Member since {formatDate(user.created_at)}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <ProfileEmailSection
            initialEmail={user?.email ?? null}
            initialConfirmed={!!user?.email_confirmed_at}
          />
          <ProfilePhoneSection initialPhone={user?.phone ?? null} />
        </div>
      </div>

      <ProfilePaymentMethodsSection methods={paymentMethods ?? []} entities={entities ?? []} />

      <div className="mb-3 mt-8 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-2">Entities</h2>
        <AddEntityForm atLimit={atLimit} limit={limit ?? null} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entities?.map((e) => (
          <div key={e.id} className="glass flex items-center gap-3 rounded-2xl p-4">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                e.type === "personal"
                  ? "bg-personal/15 text-personal"
                  : "bg-accent-a/15 text-glow"
              }`}
            >
              {e.type === "company" ? (
                <BuildingIcon className="h-5 w-5" />
              ) : (
                e.name.slice(0, 1).toUpperCase()
              )}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{e.name}</p>
              <p className="truncate text-xs text-ink-3">
                {e.gst_number ? `GSTIN ${e.gst_number}` : e.type}
              </p>
            </div>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-ink-3">
        Manage subscriptions, reminders, and GST exports in the SubTrakr mobile
        app — everything stays in sync with this account.
      </p>
    </div>
  );
}
