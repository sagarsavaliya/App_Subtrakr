import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminIdentity } from "@/lib/adminAuth";
import { PlanCard } from "@/components/admin/PlanCard";

export const dynamic = "force-dynamic";

export default async function PlansAdminPage() {
  const db = createAdminClient();
  const admin = await getAdminIdentity();
  const { data: plans } = await db
    .from("plans")
    .select("*")
    .order("sort_order");

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Plans</h1>
      <p className="mb-6 text-sm text-ink-2">
        Changes apply immediately to the pricing page and billing checkout.
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => (
          <PlanCard key={plan.id} plan={plan} canDelete={admin?.role === "super_admin"} />
        ))}
      </div>
    </div>
  );
}
