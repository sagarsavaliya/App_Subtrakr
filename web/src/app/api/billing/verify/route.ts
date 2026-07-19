import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { razorpayKeys, verifyPaymentSignature } from "@/lib/razorpay";

/** Called by the checkout success handler. Verifies Razorpay's signature,
 *  then activates the plan (service role — subscriber_billing is
 *  deliberately not client-writable). The webhook is the backup path. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await request.json()) as {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planCode: string;
    cycle: "monthly" | "yearly";
  };

  const keys = await razorpayKeys();
  if (!keys) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  const valid = verifyPaymentSignature({
    orderId: body.razorpay_order_id,
    paymentId: body.razorpay_payment_id,
    signature: body.razorpay_signature,
    keySecret: keys.keySecret,
  });
  if (!valid) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: plan } = await db
    .from("plans")
    .select("id, price_monthly, price_yearly")
    .eq("code", body.planCode)
    .single();
  if (!plan) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const now = new Date();
  const periodEnd = new Date(now);
  if (body.cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: billingRow, error: billingError } = await db
    .from("subscriber_billing")
    .upsert(
      {
        user_id: user.id,
        plan_id: plan.id,
        status: "active",
        billing_cycle: body.cycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();
  if (billingError) {
    return NextResponse.json({ error: billingError.message }, { status: 500 });
  }

  const amount =
    body.cycle === "yearly" ? plan.price_yearly : plan.price_monthly;
  await db.from("billing_transactions").insert({
    user_id: user.id,
    subscriber_billing_id: billingRow.id,
    razorpay_payment_id: body.razorpay_payment_id,
    razorpay_order_id: body.razorpay_order_id,
    amount,
    status: "captured",
  });

  return NextResponse.json({ ok: true });
}
