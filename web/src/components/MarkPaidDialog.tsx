"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useServerAction, type ActionResult } from "@/lib/useServerAction";
import { Modal } from "@/components/Modal";
import { CustomDatePicker } from "@/components/CustomDatePicker";
import { CustomSelect } from "@/components/CustomSelect";
import type { PaymentMethod } from "@/components/ProfilePaymentMethodsSection";

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Replaces a bare one-click "Mark paid" with a short confirm step that
 *  also asks *how* it was paid — the subscriber's own saved payment
 *  methods (see ProfilePaymentMethodsSection), so each payment can be
 *  traced back to a specific card/account/wallet later for personal vs
 *  business GST/ITR filing, not just a lump total. */
export function MarkPaidDialog({
  subscriptionId,
  defaultAmount,
  markPaidAction,
  hiddenFields,
  paymentMethods,
  renderTrigger,
}: {
  subscriptionId: string;
  defaultAmount: number;
  markPaidAction: (formData: FormData) => Promise<ActionResult | void>;
  hiddenFields?: Record<string, string>;
  paymentMethods: PaymentMethod[];
  renderTrigger: (open: () => void, pending: boolean) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const defaultMethod = paymentMethods.find((m) => m.is_default);

  const { run, pending } = useServerAction(markPaidAction, {
    successMessage: "Marked paid.",
    onSuccess: () => setIsOpen(false),
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", subscriptionId);
    if (hiddenFields) {
      for (const [k, v] of Object.entries(hiddenFields)) fd.set(k, v);
    }
    run(fd);
  }

  return (
    <>
      {renderTrigger(() => setIsOpen(true), pending)}
      <Modal open={isOpen} onClose={() => setIsOpen(false)} title="Mark as paid">
        <form ref={formRef} onSubmit={onSubmit}>
          <label className="mb-1 block text-xs text-ink-2">Amount paid</label>
          <input
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={defaultAmount}
            required
            className="glass mb-3 w-full rounded-xl px-4 py-2.5 text-sm outline-none focus:border-glow/40"
          />

          <label className="mb-1 block text-xs text-ink-2">Date paid</label>
          <div className="mb-3">
            <CustomDatePicker name="paid_date" defaultValue={todayISO()} max={todayISO()} />
          </div>

          {paymentMethods.length > 0 ? (
            <>
              <label className="mb-1 block text-xs text-ink-2">Paid with</label>
              <div className="mb-4">
                <CustomSelect
                  name="payment_method_id"
                  defaultValue={defaultMethod?.id ?? ""}
                  options={[
                    { value: "", label: "Not tracked" },
                    ...paymentMethods.map((m) => ({ value: m.id, label: m.label })),
                  ]}
                />
              </div>
            </>
          ) : (
            <p className="mb-4 text-xs text-ink-3">
              <Link href="/app/profile" className="text-glow hover:underline">
                Add a payment method
              </Link>{" "}
              to track which card/account/wallet you pay with.
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="brand-gradient w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Confirm payment"}
          </button>
        </form>
      </Modal>
    </>
  );
}
