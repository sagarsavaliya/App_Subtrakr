"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: boolean; message?: string };

/** payment_methods has a real RLS policy (auth.uid() = user_id, FOR ALL) —
 *  unlike subscriber_billing, these actions use the plain cookie-bound
 *  client throughout, no admin client needed. */

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

export async function addPaymentMethod(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const type = str(formData, "type");
  if (!["credit_card", "debit_card", "upi", "bank_transfer", "wallet"].includes(type)) {
    return { ok: false, message: "Choose a payment method type." };
  }

  const bankName = str(formData, "bank_name") || null;
  const cardNetwork = str(formData, "card_network") || null;
  const lastFour = str(formData, "last_four") || null;
  const upiId = str(formData, "upi_id") || null;
  const walletName = str(formData, "wallet_name") || null;
  const walletMobile = str(formData, "wallet_mobile") || null;

  if ((type === "credit_card" || type === "debit_card") && (!bankName || !lastFour)) {
    return { ok: false, message: "Enter the bank/issuer and last 4 digits." };
  }
  if (lastFour && !/^\d{4}$/.test(lastFour)) {
    return { ok: false, message: "Last 4 digits must be exactly 4 numbers." };
  }
  if (type === "upi" && (!upiId || !upiId.includes("@"))) {
    return { ok: false, message: "Enter a valid UPI ID (e.g. name@bank)." };
  }
  if (type === "bank_transfer" && !bankName) {
    return { ok: false, message: "Enter the bank name." };
  }
  if (type === "wallet" && (!walletName || !walletMobile)) {
    return { ok: false, message: "Enter the wallet provider and its linked mobile number." };
  }

  const label = str(formData, "label") || autoLabel(type, formData);
  const makeDefault = formData.get("is_default") === "on";

  if (makeDefault) {
    await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
  }

  const { error } = await supabase.from("payment_methods").insert({
    user_id: user.id,
    type,
    label,
    bank_name: bankName,
    card_network: cardNetwork,
    last_four: lastFour,
    upi_id: upiId,
    wallet_name: walletName,
    wallet_mobile: walletMobile,
    is_default: makeDefault,
  });
  if (error) {
    console.error("addPaymentMethod failed:", error.message);
    return { ok: false, message: "Could not save that payment method. Try again." };
  }

  revalidatePath("/app/profile");
  return { ok: true, message: `${label} added.` };
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

export async function setDefaultPaymentMethod(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const id = String(formData.get("id"));
  await supabase.from("payment_methods").update({ is_default: false }).eq("user_id", user.id);
  const { error } = await supabase
    .from("payment_methods")
    .update({ is_default: true })
    .eq("id", id);
  if (error) return { ok: false, message: error.message };

  revalidatePath("/app/profile");
  return { ok: true, message: "Default payment method updated." };
}
