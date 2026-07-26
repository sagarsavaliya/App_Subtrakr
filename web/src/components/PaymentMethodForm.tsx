"use client";

import { useState } from "react";
import { addPaymentMethod, updatePaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { ChipSelect } from "@/components/ChipSelect";
import type { PaymentMethod } from "@/components/ProfilePaymentMethodsSection";

const TYPE_OPTIONS = [
  { value: "credit_card", label: "Credit card" },
  { value: "debit_card", label: "Debit card" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "wallet", label: "Wallet" },
];

const CARD_NETWORKS = [
  { value: "Visa", label: "Visa" },
  { value: "Mastercard", label: "Mastercard" },
  { value: "RuPay", label: "RuPay" },
  { value: "American Express", label: "Amex" },
  { value: "Diners Club", label: "Diners" },
];

const BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
  "Union Bank of India",
  "IDFC FIRST Bank",
  "Yes Bank",
  "IndusInd Bank",
  "Federal Bank",
  "RBL Bank",
  "IDBI Bank",
];

const WALLETS = ["Paytm", "PhonePe", "Amazon Pay", "MobiKwik", "Freecharge", "Airtel Money", "JioMoney"];

const inputClass =
  "glass w-full rounded-xl px-4 py-2.5 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

/** Shared by both the "add" and "edit" flows — same fields, same
 *  validation, just a different action underneath (edit sends the row's
 *  id and calls updatePaymentMethod instead of addPaymentMethod).
 *  Rendered inside a Modal, so no own container/cancel button here. */
export function PaymentMethodForm({
  existing,
  onDone,
}: {
  existing?: PaymentMethod;
  onDone: () => void;
}) {
  const [type, setType] = useState(existing?.type ?? "credit_card");
  const { run, pending } = useServerAction(existing ? updatePaymentMethod : addPaymentMethod, {
    onSuccess: onDone,
  });

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (existing) fd.set("id", existing.id);
    run(fd);
  }

  return (
    <form onSubmit={onSubmit}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">Type</p>
      <div className="mb-4">
        <ChipSelect name="type" options={TYPE_OPTIONS} defaultValue={type} onChange={setType} />
      </div>

      {(type === "credit_card" || type === "debit_card") && (
        <div className="mb-3 space-y-3">
          <input
            name="bank_name"
            list="banks"
            placeholder="Issuing bank"
            defaultValue={existing?.bank_name ?? ""}
            required
            className={inputClass}
          />
          <div>
            <p className="mb-2 text-xs text-ink-2">Card network</p>
            <ChipSelect
              name="card_network"
              options={CARD_NETWORKS}
              defaultValue={existing?.card_network ?? "Visa"}
            />
          </div>
          <input
            name="last_four"
            inputMode="numeric"
            maxLength={4}
            placeholder="Last 4 digits"
            defaultValue={existing?.last_four ?? ""}
            required
            className={inputClass}
          />
        </div>
      )}

      {type === "upi" && (
        <div className="mb-3">
          <input
            name="upi_id"
            placeholder="UPI ID, e.g. name@okhdfcbank"
            defaultValue={existing?.upi_id ?? ""}
            required
            className={inputClass}
          />
        </div>
      )}

      {type === "bank_transfer" && (
        <div className="mb-3 space-y-3">
          <input
            name="bank_name"
            list="banks"
            placeholder="Bank name"
            defaultValue={existing?.bank_name ?? ""}
            required
            className={inputClass}
          />
          <input
            name="last_four"
            inputMode="numeric"
            maxLength={4}
            placeholder="Last 4 digits of account number (optional)"
            defaultValue={existing?.last_four ?? ""}
            className={inputClass}
          />
        </div>
      )}

      {type === "wallet" && (
        <div className="mb-3 space-y-3">
          <input
            name="wallet_name"
            list="wallets"
            placeholder="Wallet provider"
            defaultValue={existing?.wallet_name ?? ""}
            required
            className={inputClass}
          />
          <input
            name="wallet_mobile"
            inputMode="numeric"
            maxLength={10}
            placeholder="Linked mobile number"
            defaultValue={existing?.wallet_mobile ?? ""}
            required
            className={inputClass}
          />
        </div>
      )}

      <datalist id="banks">
        {BANKS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>
      <datalist id="wallets">
        {WALLETS.map((w) => (
          <option key={w} value={w} />
        ))}
      </datalist>

      <input
        name="label"
        placeholder="Custom label (optional)"
        defaultValue={existing?.label ?? ""}
        className={`${inputClass} mb-3`}
      />

      <label className="mb-4 flex items-center gap-2 text-xs text-ink-2">
        <input
          type="checkbox"
          name="is_default"
          defaultChecked={existing?.is_default ?? false}
          className="h-4 w-4"
        />
        Set as default
      </label>

      <button
        type="submit"
        disabled={pending}
        className="brand-gradient w-full rounded-xl px-4 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : existing ? "Save changes" : "Save payment method"}
      </button>
    </form>
  );
}
