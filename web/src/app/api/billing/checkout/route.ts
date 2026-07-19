import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/lib/razorpay";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { planCode, cycle } = (await request.json()) as {
    planCode: string;
    cycle: "monthly" | "yearly";
  };
  if (!["monthly", "yearly"].includes(cycle)) {
    return NextResponse.json({ error: "Invalid cycle" }, { status: 400 });
  }

  // Server-side price lookup — the client never chooses the amount.
  const { data: plan } = await supabase
    .from("plans")
    .select("id, code, price_monthly, price_yearly")
    .eq("code", planCode)
    .eq("is_active", true)
    .maybeSingle();
  if (!plan || plan.code === "free") {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  const price = cycle === "monthly" ? plan.price_monthly : plan.price_yearly;
  const amountPaise = Math.round(Number(price) * 100);

  const order = await createOrder({
    amountPaise,
    receipt: `st_${user.id.slice(0, 8)}_${Date.now()}`,
    notes: { user_id: user.id, plan_code: plan.code, cycle },
  });
  if (!order) {
    return NextResponse.json(
      { error: "Payments are not configured yet" },
      { status: 503 },
    );
  }

  return NextResponse.json({
    orderId: order.orderId,
    keyId: order.keyId,
    amountPaise,
    name: (user.user_metadata?.full_name as string) ?? "",
    email: user.email ?? "",
  });
}
