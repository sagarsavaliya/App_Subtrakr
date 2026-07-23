"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSetting } from "@/lib/settings";
import { testWhatsAppConnection, type WhatsAppDiagnostic } from "@/lib/whatsapp";

async function requireAdmin() {
  const admin = await getAdminIdentity();
  if (!admin) throw new Error("Not an admin");
  return admin;
}

// ── Subscriber operations ───────────────────────────────────────────────

/** ~100 years — GoTrue's ban_duration takes a duration string, not a date;
 *  there's no "indefinite" literal, so this is the practical equivalent. */
const INDEFINITE_BAN = "876000h";

export async function adminSuspendUser(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: INDEFINITE_BAN,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
}

export async function adminUnbanUser(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
}

export async function adminDeleteUser(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") throw new Error("Super admin only");
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers");
}

export async function adminSendPasswordReset(formData: FormData) {
  await requireAdmin();
  const email = String(formData.get("email") ?? "");
  if (!email) throw new Error("This account has no email to send a reset link to.");
  const db = createAdminClient();
  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: "https://subtrakr.me/reset-password",
  });
  if (error) throw new Error(error.message);
}

/** Manual plan override (comping an account, support gestures) — separate
 *  from the real Razorpay-driven billing flow. No expiry is set: it holds
 *  until an admin changes it again, since there's no subscription behind
 *  it to expire on its own. */
export async function adminChangePlan(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const planId = String(formData.get("plan_id"));
  const { error } = await db.from("subscriber_billing").upsert(
    {
      user_id: userId,
      plan_id: planId,
      status: "active",
      current_period_end: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
}

export async function adminMarkSubscriptionPaid(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  const userId = String(formData.get("user_id"));

  const { data: sub } = await db
    .from("subscriptions")
    .select("amount, currency, next_due_date, billing_cycle, custom_cycle_days")
    .eq("id", id)
    .single();
  if (!sub) return;

  const now = new Date();
  const due = new Date(sub.next_due_date);
  const base = due < now ? now : due;
  const nextDue = computeNextDue(base, sub.billing_cycle, sub.custom_cycle_days);

  await db.from("payment_history").insert({
    user_id: userId,
    subscription_id: id,
    paid_date: now.toISOString().slice(0, 10),
    amount_paid: sub.amount,
    currency: sub.currency,
    source: "manual",
  });
  await db
    .from("subscriptions")
    .update({
      status: "active",
      next_due_date: nextDue.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  revalidatePath(`/admin/subscribers/${userId}`);
}

export async function adminDeleteSubscription(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  const userId = String(formData.get("user_id"));

  await db.from("invoices").delete().eq("subscription_id", id);
  await db.from("payment_history").delete().eq("subscription_id", id);
  await db.from("subscriptions").delete().eq("id", id);

  revalidatePath(`/admin/subscribers/${userId}`);
}

function computeNextDue(from: Date, cycle: string, customDays?: number | null): Date {
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

export async function updatePlan(formData: FormData) {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id"));
  const { error } = await db
    .from("plans")
    .update({
      name: String(formData.get("name")).trim(),
      description: String(formData.get("description")).trim(),
      price_monthly: Number(formData.get("price_monthly")),
      price_yearly: Number(formData.get("price_yearly")),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/plans");
  revalidatePath("/app/billing");
}

export async function saveRazorpaySettings(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") throw new Error("Super admin only");

  const keyId = String(formData.get("key_id") ?? "").trim();
  const keySecret = String(formData.get("key_secret") ?? "").trim();
  const webhookSecret = String(formData.get("webhook_secret") ?? "").trim();

  // Blank fields mean "keep the existing value" — so a saved secret never
  // has to be re-typed to change a sibling field.
  if (keyId) {
    await setSetting("razorpay_key_id", keyId, {
      description: "Razorpay key id (public half)",
    });
  }
  if (keySecret) {
    await setSetting("razorpay_key_secret", keySecret, {
      secret: true,
      description: "Razorpay key secret",
    });
  }
  if (webhookSecret) {
    await setSetting("razorpay_webhook_secret", webhookSecret, {
      secret: true,
      description: "Razorpay webhook signing secret",
    });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/app/billing");
}

export async function saveWhatsAppSettings(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") throw new Error("Super admin only");

  const phoneNumberId = String(formData.get("phone_number_id") ?? "").trim();
  const accessToken = String(formData.get("access_token") ?? "").trim();
  const businessAccountId = String(formData.get("business_account_id") ?? "").trim();

  // Blank fields mean "keep the existing value" — same pattern as Razorpay.
  if (phoneNumberId) {
    await setSetting("whatsapp_phone_number_id", phoneNumberId, {
      description: "WhatsApp Cloud API phone number ID",
    });
  }
  if (accessToken) {
    await setSetting("whatsapp_access_token", accessToken, {
      secret: true,
      description: "WhatsApp Cloud API permanent access token",
    });
  }
  if (businessAccountId) {
    await setSetting("whatsapp_business_account_id", businessAccountId, {
      description: "WhatsApp Business Account ID (reference only)",
    });
  }

  revalidatePath("/admin/settings");
}

export async function runWhatsAppTest(): Promise<
  WhatsAppDiagnostic | { notConfigured: true }
> {
  await requireAdmin();
  return testWhatsAppConnection();
}
