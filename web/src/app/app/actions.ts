"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function addSubscription(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const amount = Number(formData.get("amount"));
  const startDate = String(formData.get("start_date"));
  const cycle = String(formData.get("billing_cycle"));
  const entityId = String(formData.get("entity_id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  // Bad input renders a message instead of a server-error page.
  if (!name || !entityId || !Number.isFinite(amount) || amount <= 0 ||
      Number.isNaN(new Date(startDate).getTime())) {
    redirect("/app/new?error=1");
  }

  const nextDue = computeNextDue(new Date(startDate), cycle);

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    entity_id: entityId,
    name,
    category: String(formData.get("category") || "other"),
    amount,
    billing_cycle: cycle,
    start_date: startDate,
    next_due_date: nextDue.toISOString().slice(0, 10),
    is_auto_debit: formData.get("is_auto_debit") === "on",
    status: "active",
  });
  if (error) {
    console.error("addSubscription failed:", error.message);
    redirect("/app/new?error=1");
  }

  revalidatePath("/app");
  redirect("/app");
}

export async function addEntity(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const gstNumber = String(formData.get("gst_number") ?? "").trim();
  if (!name) redirect("/app/profile?error=1");

  // Re-check the plan's entity cap server-side — the UI already hides the
  // form once at the limit, but that's not a security boundary on its own.
  const [{ data: billing }, { count }] = await Promise.all([
    supabase.from("subscriber_billing").select("*, plans(max_entities)").maybeSingle(),
    supabase.from("entities").select("id", { count: "exact", head: true }),
  ]);
  const maxEntities = (billing?.plans as unknown as { max_entities: number | null } | null)
    ?.max_entities;
  const freeMax = 1; // no subscriber_billing row at all means the Free plan's cap
  const limit = billing ? maxEntities : freeMax;
  if (limit !== null && limit !== undefined && (count ?? 0) >= limit) {
    redirect("/app/profile?error=limit");
  }

  const { error } = await supabase.from("entities").insert({
    user_id: user.id,
    name,
    type: "company",
    gst_number: gstNumber || null,
  });
  if (error) {
    console.error("addEntity failed:", error.message);
    redirect("/app/profile?error=1");
  }

  revalidatePath("/app/profile");
  revalidatePath("/app");
  redirect("/app/profile");
}

export async function deleteSubscription(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  // RLS restricts to the user's own rows; children first (no CASCADE).
  await supabase.from("invoices").delete().eq("subscription_id", id);
  await supabase.from("payment_history").delete().eq("subscription_id", id);
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) console.error("deleteSubscription failed:", error.message);
  revalidatePath("/app");
}

export async function markPaid(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id"));
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("amount, currency, next_due_date, billing_cycle, custom_cycle_days")
    .eq("id", id)
    .single();
  if (!sub) return;

  const now = new Date();
  const due = new Date(sub.next_due_date);
  const base = due < now ? now : due;
  const nextDue = computeNextDue(base, sub.billing_cycle, sub.custom_cycle_days);

  await supabase.from("payment_history").insert({
    user_id: user.id,
    subscription_id: id,
    paid_date: now.toISOString().slice(0, 10),
    amount_paid: sub.amount,
    currency: sub.currency,
    source: "manual",
  });
  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      next_due_date: nextDue.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath("/app");
}

function computeNextDue(
  from: Date,
  cycle: string,
  customDays?: number | null,
): Date {
  const d = new Date(from);
  switch (cycle) {
    case "weekly":
      d.setDate(d.getDate() + 7);
      break;
    case "monthly":
      d.setMonth(d.getMonth() + 1);
      break;
    case "quarterly":
      d.setMonth(d.getMonth() + 3);
      break;
    case "half_yearly":
      d.setMonth(d.getMonth() + 6);
      break;
    case "yearly":
      d.setFullYear(d.getFullYear() + 1);
      break;
    default:
      d.setDate(d.getDate() + (customDays ?? 30));
  }
  return d;
}
