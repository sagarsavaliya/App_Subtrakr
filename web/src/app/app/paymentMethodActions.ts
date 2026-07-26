"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; message?: string };

/** payment_methods has a real RLS policy (auth.uid() = user_id, FOR ALL) —
 *  unlike subscriber_billing, these actions use the plain cookie-bound
 *  client throughout, no admin client needed. Each method belongs to one
 *  entity (personal or a specific business) — "default" is scoped per
 *  entity too, since "my default card" means something different for
 *  Personal vs. a specific company. */

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Builds a sensible display label when the user didn't type a custom one
 *  — e.g. "HDFC Bank Credit Card •••• 4242", "UPI · me@okhdfcbank". */
function autoLabel(type: string, formData: FormData): string {
  const bankName = str(formData, "bank_name");
  const lastFour = str(formData, "last_four");
  const upiId = str(formData, "upi_id");
  const walletName = str(formData, "wallet_name");
  const walletMobile = str(formData, "wallet_mobile");

  switch (type) {
    case "credit_card":
      return `${bankName} Credit Card${lastFour ? ` •••• ${lastFour}` : ""}`;
    case "debit_card":
      return `${bankName} Debit Card${lastFour ? ` •••• ${lastFour}` : ""}`;
    case "upi":
      return `UPI · ${upiId}`;
    case "bank_transfer":
      return `${bankName} Bank Transfer${lastFour ? ` •••• ${lastFour}` : ""}`;
    case "wallet":
      return `${walletName} Wallet${walletMobile ? ` · ${walletMobile}` : ""}`;
    default:
      return "Payment method";
  }
}

type ParsedFields = {
  entityId: string;
  type: string;
  bankName: string | null;
  cardNetwork: string | null;
  lastFour: string | null;
  upiId: string | null;
  walletName: string | null;
  walletMobile: string | null;
  label: string;
};

/** Shared by add and update — same fields, same validation either way. */
function parseAndValidate(formData: FormData): ParsedFields | { error: string } {
  const entityId = str(formData, "entity_id");
  if (!entityId) return { error: "Choose an entity." };

  const type = str(formData, "type");
  if (!["credit_card", "debit_card", "upi", "bank_transfer", "wallet"].includes(type)) {
    return { error: "Choose a payment method type." };
  }

  const bankName = str(formData, "bank_name") || null;
  const cardNetwork = str(formData, "card_network") || null;
  const lastFour = str(formData, "last_four") || null;
  const upiId = str(formData, "upi_id") || null;
  const walletName = str(formData, "wallet_name") || null;
  const walletMobile = str(formData, "wallet_mobile") || null;

  if ((type === "credit_card" || type === "debit_card") && (!bankName || !lastFour)) {
    return { error: "Enter the bank/issuer and last 4 digits." };
  }
  if (lastFour && !/^\d{4}$/.test(lastFour)) {
    return { error: "Last 4 digits must be exactly 4 numbers." };
  }
  if (type === "upi" && (!upiId || !upiId.includes("@"))) {
    return { error: "Enter a valid UPI ID (e.g. name@bank)." };
  }
  if (type === "bank_transfer" && !bankName) {
    return { error: "Enter the bank name." };
  }
  if (type === "wallet" && (!walletName || !walletMobile)) {
    return { error: "Enter the wallet provider and its linked mobile number." };
  }

  const label = str(formData, "label") || autoLabel(type, formData);
  return { entityId, type, bankName, cardNetwork, lastFour, upiId, walletName, walletMobile, label };
}

export async function addPaymentMethod(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const parsed = parseAndValidate(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const makeDefault = formData.get("is_default") === "on";
  if (makeDefault) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("entity_id", parsed.entityId);
  }

  const { error } = await supabase.from("payment_methods").insert({
    user_id: user.id,
    entity_id: parsed.entityId,
    type: parsed.type,
    label: parsed.label,
    bank_name: parsed.bankName,
    card_network: parsed.cardNetwork,
    last_four: parsed.lastFour,
    upi_id: parsed.upiId,
    wallet_name: parsed.walletName,
    wallet_mobile: parsed.walletMobile,
    is_default: makeDefault,
  });
  if (error) {
    console.error("addPaymentMethod failed:", error.message);
    return { ok: false, message: "Could not save that payment method. Try again." };
  }

  revalidatePath("/app/profile");
  return { ok: true, message: `${parsed.label} added.` };
}

export async function updatePaymentMethod(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = str(formData, "id");
  if (!id) return { ok: false, message: "Missing payment method." };

  const parsed = parseAndValidate(formData);
  if ("error" in parsed) return { ok: false, message: parsed.error };

  const makeDefault = formData.get("is_default") === "on";
  if (makeDefault) {
    await supabase
      .from("payment_methods")
      .update({ is_default: false })
      .eq("user_id", user.id)
      .eq("entity_id", parsed.entityId)
      .neq("id", id);
  }

  const { error } = await supabase
    .from("payment_methods")
    .update({
      entity_id: parsed.entityId,
      type: parsed.type,
      label: parsed.label,
      bank_name: parsed.bankName,
      card_network: parsed.cardNetwork,
      last_four: parsed.lastFour,
      upi_id: parsed.upiId,
      wallet_name: parsed.walletName,
      wallet_mobile: parsed.walletMobile,
      is_default: makeDefault,
    })
    .eq("id", id);
  if (error) {
    console.error("updatePaymentMethod failed:", error.message);
    return { ok: false, message: "Could not save that payment method. Try again." };
  }

  revalidatePath("/app/profile");
  return { ok: true, message: `${parsed.label} updated.` };
}

export async function deletePaymentMethod(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) {
    console.error("deletePaymentMethod failed:", error.message);
    return { ok: false, message: "Could not delete that payment method. Try again." };
  }
  revalidatePath("/app/profile");
  return { ok: true, message: "Payment method removed." };
}
