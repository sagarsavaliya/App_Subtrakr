"use server";

import { revalidatePath } from "next/cache";
import { getAdminIdentity } from "@/lib/adminAuth";
import { createAdminClient } from "@/lib/supabase/admin";
import { setSetting } from "@/lib/settings";
import { testWhatsAppConnection, type WhatsAppDiagnostic } from "@/lib/whatsapp";

async function requireAdmin() {
  const admin = await getAdminIdentity();
  if (!admin) throw new Error("Not an admin");
  return admin;
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
