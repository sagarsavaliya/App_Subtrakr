import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: entities } = await supabase
    .from("entities")
    .select("id, name, type, gst_number")
    .order("type");

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
      <ul className="space-y-3">
        {entities?.map((e) => (
          <li key={e.id} className="glass flex items-center gap-3 rounded-2xl p-4">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold ${
                e.type === "personal"
                  ? "bg-personal/15 text-personal"
                  : "bg-accent-a/15 text-glow"
              }`}
            >
              {e.name.slice(0, 1).toUpperCase()}
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

      <p className="mt-8 text-xs text-ink-3">
        Manage subscriptions, reminders, and GST exports in the SubTrakr mobile
        app — everything stays in sync with this account.
      </p>
    </div>
  );
}
