import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/settings";
import { verifyWebhookSignature } from "@/lib/razorpay";

/** Razorpay webhook — the authoritative backup for payment.captured (e.g.
 *  the user closed the tab before the checkout handler ran). Idempotent on
 *  razorpay_payment_id. */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  const webhookSecret = await getSetting("razorpay_webhook_secret");
  if (!webhookSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  }
  if (!verifyWebhookSignature({ rawBody, signature, webhookSecret })) {
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as {
    event: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          amount: number;
          method?: string;
          notes?: { user_id?: string; plan_code?: string; cycle?: string };
        };
      };
    };
  };

  if (event.event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  const userId = payment?.notes?.user_id;
  const planCode = payment?.notes?.plan_code;
  const cycle = payment?.notes?.cycle === "yearly" ? "yearly" : "monthly";
  if (!payment || !userId || !planCode) {
    return NextResponse.json({ ok: true, ignored: "missing notes" });
  }

  const db = createAdminClient();

  const { data: existing } = await db
    .from("billing_transactions")
    .select("id")
    .eq("razorpay_payment_id", payment.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const { data: plan } = await db
    .from("plans")
    .select("id")
    .eq("code", planCode)
    .single();
  if (!plan) return NextResponse.json({ ok: true, ignored: "unknown plan" });

  const now = new Date();
  const periodEnd = new Date(now);
  if (cycle === "yearly") periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  else periodEnd.setMonth(periodEnd.getMonth() + 1);

  const { data: billingRow } = await db
    .from("subscriber_billing")
    .upsert(
      {
        user_id: userId,
        plan_id: plan.id,
        status: "active",
        billing_cycle: cycle,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id")
    .single();

  await db.from("billing_transactions").insert({
    user_id: userId,
    subscriber_billing_id: billingRow?.id,
    razorpay_payment_id: payment.id,
    razorpay_order_id: payment.order_id,
    amount: payment.amount / 100,
    status: "captured",
    method: payment.method,
    raw_payload: event,
  });

  return NextResponse.json({ ok: true });
}
