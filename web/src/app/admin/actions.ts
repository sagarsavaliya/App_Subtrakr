"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminIdentity } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSetting } from "@/lib/settings";
import { testWhatsAppConnection, type WhatsAppDiagnostic } from "@/lib/whatsapp";
import { sendPhoneOtp } from "@/lib/otpChallenge";

/** Every mutating action returns this instead of throwing on expected
 *  failures (a bad password, a plan still in use, missing permission) —
 *  a thrown error from a server action invoked outside a <form action>
 *  becomes an unhandled promise rejection with zero UI feedback, which is
 *  exactly the "I don't know what happened" bug this replaces. Genuine
 *  programming errors (a broken query, a missing table) still throw and
 *  hit Next's error boundary, which is the right place for those. */
type ActionResult = { ok: boolean; message?: string };

async function requireAdmin() {
  const admin = await getAdminIdentity();
  if (!admin) throw new Error("Not an admin");
  return admin;
}

// ── Subscriber operations ───────────────────────────────────────────────

/** ~100 years — GoTrue's ban_duration takes a duration string, not a date;
 *  there's no "indefinite" literal, so this is the practical equivalent. */
const INDEFINITE_BAN = "876000h";

export async function adminSuspendUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: INDEFINITE_BAN,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
  return { ok: true, message: "Account suspended." };
}

export async function adminUnbanUser(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));
  const { error } = await db.auth.admin.updateUserById(userId, {
    ban_duration: "none",
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
  return { ok: true, message: "Account unsuspended." };
}

export async function adminDeleteUser(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") return { ok: false, message: "Super admin only." };
  const db = createAdminClient();
  const userId = String(formData.get("user_id"));

  // The subscribers list already excludes admin accounts, but this is the
  // real backstop — an admin account being deletable from this action at
  // all is how a live admin got wiped by an accidental click before this
  // check existed.
  const { data: adminRow } = await db
    .from("admin_users")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (adminRow) {
    return { ok: false, message: "Can't delete an admin account from here." };
  }

  const { error } = await db.auth.admin.deleteUser(userId);
  if (error) return { ok: false, message: error.message };
  revalidatePath("/admin/subscribers");
  redirect("/admin/subscribers?deleted=1");
}

/** Fires a PIN-reset verification code on every channel the account
 *  actually has (email and/or WhatsApp) — same dual-channel behavior as
 *  the subscriber's own self-service "Forgot PIN", just triggered by an
 *  admin instead of the subscriber typing their own identifier. The
 *  subscriber finishes it themselves via the login page's Forgot PIN flow. */
export async function adminSendPinReset(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const db = createAdminClient();
  const { data, error } = await db.auth.admin.getUserById(userId);
  if (error || !data?.user) return { ok: false, message: "Could not find that account." };

  const { email, phone } = data.user;
  const sends: Promise<unknown>[] = [];
  if (phone) sends.push(sendPhoneOtp(`+${phone}`));
  if (email) {
    sends.push(db.auth.signInWithOtp({ email, options: { shouldCreateUser: false } }));
  }
  if (!sends.length) {
    return { ok: false, message: "This account has no email or phone on file." };
  }
  await Promise.allSettled(sends);
  return { ok: true, message: "Verification code sent — ask them to use Forgot PIN to finish." };
}

/** Manual plan override (comping an account, support gestures) — separate
 *  from the real Razorpay-driven billing flow. No expiry is set: it holds
 *  until an admin changes it again, since there's no subscription behind
 *  it to expire on its own. */
export async function adminChangePlan(formData: FormData): Promise<ActionResult> {
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
  if (error) return { ok: false, message: error.message };
  revalidatePath(`/admin/subscribers/${userId}`);
  revalidatePath("/admin/subscribers");
  revalidatePath("/app");
  revalidatePath("/app/billing");
  revalidatePath("/app/profile");
  return { ok: true, message: "Plan updated successfully." };
}

export async function adminMarkSubscriptionPaid(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  const userId = String(formData.get("user_id"));

  const { data: sub } = await db
    .from("subscriptions")
    .select("amount, currency, next_due_date, billing_cycle, custom_cycle_days")
    .eq("id", id)
    .single();
  if (!sub) return { ok: false, message: "That subscription no longer exists." };

  const now = new Date();
  const due = new Date(sub.next_due_date);
  const base = due < now ? now : due;
  const nextDue = computeNextDue(base, sub.billing_cycle, sub.custom_cycle_days);

  const { error: insertError } = await db.from("payment_history").insert({
    user_id: userId,
    subscription_id: id,
    paid_date: now.toISOString().slice(0, 10),
    amount_paid: sub.amount,
    currency: sub.currency,
    source: "manual",
  });
  if (insertError) return { ok: false, message: insertError.message };

  const { error: updateError } = await db
    .from("subscriptions")
    .update({
      status: "active",
      next_due_date: nextDue.toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updateError) return { ok: false, message: updateError.message };

  revalidatePath(`/admin/subscribers/${userId}`);
  return { ok: true, message: "Marked paid." };
}

export async function adminDeleteSubscription(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();
  const id = String(formData.get("id"));
  const userId = String(formData.get("user_id"));

  await db.from("invoices").delete().eq("subscription_id", id);
  await db.from("payment_history").delete().eq("subscription_id", id);
  const { error } = await db.from("subscriptions").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath(`/admin/subscribers/${userId}`);
  return { ok: true, message: "Subscription deleted." };
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

// A blank cap field means "unlimited" (NULL in the DB), not zero.
function parseCap(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  return s === "" ? null : Number(s);
}

export async function updatePlan(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const db = createAdminClient();

  const id = String(formData.get("id"));
  const { error } = await db
    .from("plans")
    .update({
      name: String(formData.get("name")).trim(),
      description: String(formData.get("description")).trim(),
      price_monthly: Number(formData.get("price_monthly")),
      price_quarterly: Number(formData.get("price_quarterly")),
      price_half_yearly: Number(formData.get("price_half_yearly")),
      price_yearly: Number(formData.get("price_yearly")),
      max_entities: parseCap(formData.get("max_entities")),
      max_subscriptions: parseCap(formData.get("max_subscriptions")),
      is_active: formData.get("is_active") === "on",
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/plans");
  revalidatePath("/app/billing");
  return { ok: true, message: "Plan saved." };
}

export async function deletePlan(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") return { ok: false, message: "Super admin only." };
  const db = createAdminClient();

  const id = String(formData.get("id"));
  // No ON DELETE clause on subscriber_billing.plan_id — Postgres rejects
  // this with a foreign-key error if any subscriber is currently on the
  // plan, which is the correct behavior (silently orphaning billing rows
  // would be worse than a blocked delete). Surfaced as a clear message
  // instead of a raw constraint-violation string.
  const { error } = await db.from("plans").delete().eq("id", id);
  if (error) {
    const inUse = error.message.toLowerCase().includes("foreign key");
    return {
      ok: false,
      message: inUse
        ? "Can't delete — at least one subscriber is currently on this plan."
        : error.message,
    };
  }

  revalidatePath("/admin/plans");
  revalidatePath("/app/billing");
  return { ok: true, message: "Plan deleted." };
}

export async function saveRazorpaySettings(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") return { ok: false, message: "Super admin only." };

  const keyId = String(formData.get("key_id") ?? "").trim();
  const keySecret = String(formData.get("key_secret") ?? "").trim();
  const webhookSecret = String(formData.get("webhook_secret") ?? "").trim();

  try {
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
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save settings." };
  }

  revalidatePath("/admin/settings");
  revalidatePath("/app/billing");
  return { ok: true, message: "Razorpay settings saved." };
}

export async function saveWhatsAppSettings(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (admin.role !== "super_admin") return { ok: false, message: "Super admin only." };

  const phoneNumberId = String(formData.get("phone_number_id") ?? "").trim();
  const accessToken = String(formData.get("access_token") ?? "").trim();
  const businessAccountId = String(formData.get("business_account_id") ?? "").trim();

  try {
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
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Could not save settings." };
  }

  revalidatePath("/admin/settings");
  return { ok: true, message: "WhatsApp settings saved." };
}

export async function runWhatsAppTest(): Promise<
  WhatsAppDiagnostic | { notConfigured: true }
> {
  await requireAdmin();
  return testWhatsAppConnection();
}
