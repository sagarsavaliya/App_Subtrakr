import { createAdminClient } from "@/lib/supabase/admin";
import { updatePlan } from "../actions";

export const dynamic = "force-dynamic";

export default async function PlansAdminPage() {
  const db = createAdminClient();
  const { data: plans } = await db
    .from("plans")
    .select("*")
    .order("sort_order");

  const inputClass =
    "glass w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-glow/40";

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Plans</h1>
      <p className="mb-6 text-sm text-ink-2">
        Changes apply immediately to the pricing page and billing checkout.
      </p>

      <div className="space-y-5">
        {plans?.map((plan) => (
          <form
            key={plan.id}
            action={updatePlan}
            className="glass rounded-2xl p-5"
          >
            <input type="hidden" name="id" value={plan.id} />
            <div className="mb-4 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
                {plan.code}
              </p>
              <label className="flex items-center gap-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={plan.is_active}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-ink-2">Name</label>
                <input name="name" defaultValue={plan.name} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-2">
                  Description
                </label>
                <input
                  name="description"
                  defaultValue={plan.description ?? ""}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-2">
                  Monthly price (₹)
                </label>
                <input
                  name="price_monthly"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={Number(plan.price_monthly)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-2">
                  Yearly price (₹)
                </label>
                <input
                  name="price_yearly"
                  type="number"
                  min="0"
                  step="1"
                  defaultValue={Number(plan.price_yearly)}
                  className={inputClass}
                />
              </div>
            </div>

            <button className="brand-gradient mt-4 cursor-pointer rounded-lg px-5 py-2 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-105 hover:opacity-90 active:scale-95">
              Save {plan.name}
            </button>
          </form>
        ))}
      </div>
    </div>
  );
}
