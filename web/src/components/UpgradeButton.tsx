"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";
import { useToast } from "@/components/Toaster";
import { cycleLabel, priceForCycle, type BillingCycle, type PlanPrices } from "@/lib/billingCycle";

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

/** Just the checkout button now — which cycle to buy is chosen once, above
 *  the whole card grid (see BillingPlanGrid), not per-card; a separate
 *  4-way toggle repeated on every card was both visually noisy and
 *  wrapped into an ugly vertical stack in a narrow card. */
export function UpgradeButton({
  planCode,
  prices,
  cycle,
  disabled,
}: {
  planCode: string;
  prices: PlanPrices;
  cycle: BillingCycle;
  disabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

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
    <button
      onClick={upgrade}
      disabled={disabled || busy}
      className="brand-gradient glow-shadow w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-[1.02] hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {busy ? "Opening checkout…" : `Upgrade · ${formatINR(price)}`}
    </button>
  );
}
