"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";
import { useToast } from "@/components/Toaster";
import {
  BILLING_CYCLES,
  cycleLabel,
  cycleShortLabel,
  priceForCycle,
  type BillingCycle,
} from "@/lib/billingCycle";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckoutJs(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Could not load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

export function UpgradeButton({
  planCode,
  priceMonthly,
  priceQuarterly,
  priceHalfYearly,
  priceYearly,
  disabled,
}: {
  planCode: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceHalfYearly: number;
  priceYearly: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [busy, setBusy] = useState(false);
  const prices = {
    price_monthly: priceMonthly,
    price_quarterly: priceQuarterly,
    price_half_yearly: priceHalfYearly,
    price_yearly: priceYearly,
  };

  async function upgrade() {
    setBusy(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, cycle }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Checkout failed");
      const { orderId, keyId, amountPaise, name, email } = await res.json();

      await loadCheckoutJs();
      new window.Razorpay!({
        key: keyId,
        order_id: orderId,
        amount: amountPaise,
        currency: "INR",
        name: "SubTrakr",
        description: `${planCode.toUpperCase()} · ${cycleLabel(cycle)}`,
        prefill: { name, email },
        theme: { color: "#2EC4A0" },
        handler: async (rsp: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          const verify = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...rsp, planCode, cycle }),
          });
          if (verify.ok) {
            toast.success("Payment successful — you're upgraded.");
            router.refresh();
          } else {
            toast.error("Payment verification failed — contact support.");
          }
        },
      }).open();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  const price = priceForCycle(prices, cycle);

  return (
    <div>
      <div className="mb-3 grid grid-cols-4 gap-1.5 text-xs">
        {BILLING_CYCLES.map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            title={cycleLabel(c)}
            className={`rounded-full px-2 py-1 text-center ${cycle === c ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
          >
            {cycleShortLabel(c)}
          </button>
        ))}
      </div>
      <button
        onClick={upgrade}
        disabled={disabled || busy}
        className="brand-gradient glow-shadow w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Opening checkout…" : `Upgrade · ${formatINR(price)}`}
      </button>
    </div>
  );
}
