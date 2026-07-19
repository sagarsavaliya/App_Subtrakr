"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatINR } from "@/lib/format";

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
  priceYearly,
  disabled,
}: {
  planCode: string;
  priceMonthly: number;
  priceYearly: number;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upgrade() {
    setBusy(true);
    setError(null);
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
        description: `${planCode.toUpperCase()} · ${cycle}`,
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
          if (verify.ok) router.refresh();
          else setError("Payment verification failed — contact support.");
        },
      }).open();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const price = cycle === "monthly" ? priceMonthly : priceYearly;

  return (
    <div>
      <div className="mb-3 flex gap-2 text-xs">
        {(["monthly", "yearly"] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCycle(c)}
            className={`rounded-full px-3 py-1 ${cycle === c ? "brand-gradient font-semibold text-[#08201a]" : "glass text-ink-2"}`}
          >
            {c === "monthly" ? "Monthly" : "Yearly"}
          </button>
        ))}
      </div>
      <button
        onClick={upgrade}
        disabled={disabled || busy}
        className="brand-gradient glow-shadow w-full rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? "Opening checkout…" : `Upgrade · ${formatINR(price)}`}
      </button>
      {error && <p className="mt-2 text-xs text-overdue">{error}</p>}
    </div>
  );
}
