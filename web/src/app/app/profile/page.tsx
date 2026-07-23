import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { AddEntityForm } from "@/components/AddEntityForm";
import { BuildingIcon } from "@/components/icons";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: entities }, { data: billing }] = await Promise.all([
    supabase.from("entities").select("id, name, type, gst_number").order("type"),
    supabase.from("subscriber_billing").select("*, plans(max_entities)").maybeSingle(),
  ]);

  const maxEntities = (billing?.plans as unknown as { max_entities: number | null } | null)
    ?.max_entities;
  const limit = billing ? maxEntities : 1; // no billing row at all = Free plan's cap
  const atLimit = limit !== null && limit !== undefined && (entities?.length ?? 0) >= limit;

  const name = (user?.user_metadata?.full_name as string) ?? "—";

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="mb-6 text-xl font-semibold">Profile</h1>

      <div className="glass mb-5 flex items-center gap-4 rounded-3xl p-6">
        <div className="brand-gradient flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-[#08201a]">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="text-lg font-semibold">{name}</p>
          <p className="text-sm text-ink-2">
            {user?.email ??
              (user?.phone ? `+${user.phone.replace(/^\+/, "")}` : "")}
          </p>
          {user?.created_at && (
            <p className="mt-0.5 text-xs text-ink-3">
              Member since {formatDate(user.created_at)}
            </p>
          )}
        </div>
      </div>

      <h2 className="mb-3 text-sm font-semibold text-ink-2">Entities</h2>

      {error && (
        <p className="glass mb-4 rounded-2xl border-overdue/40 p-4 text-sm text-overdue">
          {error === "limit"
            ? "Your plan's entity limit is reached — upgrade to add another business."
            : "That didn't save — check the fields and try again."}
        </p>
      )}

      <ul className="space-y-3">
        {entities?.map((e) => (
          <li key={e.id} className="glass flex items-center gap-3 rounded-2xl p-4">
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
            <div>
              <p className="text-sm font-medium">{e.name}</p>
              <p className="text-xs text-ink-3">
                {e.gst_number ? `GSTIN ${e.gst_number}` : e.type}
              </p>
            </div>
          </li>
        ))}
      </ul>

      {atLimit ? (
        <div className="glass mt-4 rounded-2xl p-4 text-center text-sm text-ink-2">
          Your plan allows {limit} {limit === 1 ? "entity" : "entities"}.{" "}
          <Link href="/app/billing" className="text-glow hover:underline">
            Upgrade
          </Link>{" "}
          to add another business.
        </div>
      ) : (
        <AddEntityForm />
      )}

      <p className="mt-8 text-xs text-ink-3">
        Manage subscriptions, reminders, and GST exports in the SubTrakr mobile
        app — everything stays in sync with this account.
      </p>
    </div>
  );
}
