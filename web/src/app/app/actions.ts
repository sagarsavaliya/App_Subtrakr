"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type ActionResult = { ok: boolean; message?: string };

/** Self-service downgrade — takes effect immediately (no proration/
 *  refund, no scheduling), consistent with the rest of this app's billing
 *  model: there's no auto-recurring charge at all, renewal is always the
 *  subscriber manually clicking Upgrade again, so there's nothing to
 *  "schedule" a downgrade against either. subscriber_billing has no
 *  client-write RLS policy (writes are meant to be server-verified only),
 *  hence the admin client here — identity is still checked via the
 *  cookie-bound session first, so a user can only ever change their own
 *  row. */
export async function downgradePlan(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const planCode = String(formData.get("plan_code") ?? "");
  const db = createAdminClient();

  const [{ data: targetPlan }, { data: billing }] = await Promise.all([
    db.from("plans").select("id, sort_order").eq("code", planCode).eq("is_active", true).maybeSingle(),
    db.from("subscriber_billing").select("id, plans(sort_order)").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!targetPlan) return { ok: false, message: "Unknown plan." };

  const currentSortOrder =
    (billing?.plans as unknown as { sort_order: number } | null)?.sort_order ?? 0;
  if (targetPlan.sort_order >= currentSortOrder) {
    return { ok: false, message: "That isn't a downgrade from your current plan." };
  }

  if (targetPlan.sort_order === 0) {
    // Downgrading to Free — a missing subscriber_billing row IS the Free
    // state everywhere else in the app (addEntity/addSubscription/
    // profile/billing all fall back to Free's caps when there's no row),
    // so clear it rather than pointing it at a ₹0 plan row.
    if (billing) await db.from("subscriber_billing").delete().eq("user_id", user.id);
  } else {
    const { error } = await db
      .from("subscriber_billing")
      .update({ plan_id: targetPlan.id, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
    if (error) return { ok: false, message: error.message };
  }

  revalidatePath("/app/billing");
  return { ok: true, message: "Plan changed." };
}

export async function addSubscription(formData: FormData): Promise<ActionResult> {
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

  if (!name) return { ok: false, message: "Enter a service name." };
  if (!entityId) return { ok: false, message: "Choose an entity." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Enter a valid amount." };
  }
  if (Number.isNaN(new Date(startDate).getTime())) {
    return { ok: false, message: "Choose a valid first charge date." };
  }

  // Re-check the plan's subscription cap server-side — same pattern as
  // addEntity's max_entities check below. Was never enforced anywhere
  // before this (only ever shown as decorative copy on the pricing page).
  const [{ data: billing }, { count }] = await Promise.all([
    supabase.from("subscriber_billing").select("*, plans(max_subscriptions)").maybeSingle(),
    supabase.from("subscriptions").select("id", { count: "exact", head: true }),
  ]);
  const maxSubscriptions = (
    billing?.plans as unknown as { max_subscriptions: number | null } | null
  )?.max_subscriptions;
  const freeMax = 5; // no subscriber_billing row at all means the Free plan's cap
  const subLimit = billing ? maxSubscriptions : freeMax;
  if (subLimit !== null && subLimit !== undefined && (count ?? 0) >= subLimit) {
    return {
      ok: false,
      message: `Your plan allows up to ${subLimit} subscriptions — upgrade to add more.`,
    };
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
    return { ok: false, message: "Could not save that subscription. Try again." };
  }

  revalidatePath("/app");
  return { ok: true, message: `${name} added.` };
}

export async function addEntity(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const gstNumber = String(formData.get("gst_number") ?? "").trim();
  if (!name) return { ok: false, message: "Enter a business name." };

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
    return {
      ok: false,
      message: `Your plan allows ${limit} ${limit === 1 ? "entity" : "entities"} — upgrade to add another business.`,
    };
  }

  const { error } = await supabase.from("entities").insert({
    user_id: user.id,
    name,
    type: "company",
    gst_number: gstNumber || null,
  });
  if (error) {
    console.error("addEntity failed:", error.message);
    return { ok: false, message: "Could not save that business. Try again." };
  }

  revalidatePath("/app/profile");
  revalidatePath("/app");
  return { ok: true, message: `${name} added.` };
}

export async function deleteSubscription(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  // RLS restricts to the user's own rows; children first (no CASCADE).
  await supabase.from("invoices").delete().eq("subscription_id", id);
  await supabase.from("payment_history").delete().eq("subscription_id", id);
  const { error } = await supabase.from("subscriptions").delete().eq("id", id);
  if (error) {
    console.error("deleteSubscription failed:", error.message);
    return { ok: false, message: "Could not delete that subscription. Try again." };
  }
  revalidatePath("/app");
  return { ok: true };
}

export async function markPaid(formData: FormData): Promise<ActionResult> {
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
  if (!sub) return { ok: false, message: "That subscription no longer exists." };

  const now = new Date();
  const due = new Date(sub.next_due_date);
  const base = due < now ? now : due;
  const nextDue = computeNextDue(base, sub.billing_cycle, sub.custom_cycle_days);

  // amount/paid_date/payment_method_id are optional overrides from the
  // Mark Paid dialog — the subscription's own scheduled amount and today
  // are still the defaults for callers that don't send them (none left
  // currently, but keeps this action safe to call bare).
  const amountRaw = formData.get("amount");
  const amount = amountRaw && Number.isFinite(Number(amountRaw)) ? Number(amountRaw) : sub.amount;
  const paidDateRaw = String(formData.get("paid_date") ?? "");
  const paidDate = paidDateRaw || now.toISOString().slice(0, 10);
  const paymentMethodId = String(formData.get("payment_method_id") ?? "") || null;

  const { error: insertError } = await supabase.from("payment_history").insert({
    user_id: user.id,
    subscription_id: id,
    paid_date: paidDate,
    amount_paid: amount,
    currency: sub.currency,
    source: "manual",
    payment_method_id: paymentMethodId,
  });
  if (insertError) {
    console.error("markPaid insert failed:", insertError.message);
    return { ok: false, message: "Could not record that payment. Try again." };
  }

  const { error: updateError } = await supabase
    .from("subscriptions")
    .update({
      status: "active",
      next_due_date: nextDue.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) {
    console.error("markPaid update failed:", updateError.message);
    return { ok: false, message: "Payment recorded, but the next due date didn't update." };
  }

  revalidatePath("/app");
  revalidatePath(`/app/subscription/${id}`);
  return { ok: true };
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
