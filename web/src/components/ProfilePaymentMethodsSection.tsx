"use client";

import { useState } from "react";
import { deletePaymentMethod, setDefaultPaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";

export type PaymentMethod = {
  id: string;
  type: string;
  label: string;
  bank_name: string | null;
  card_network: string | null;
  last_four: string | null;
  upi_id: string | null;
  wallet_name: string | null;
  wallet_mobile: string | null;
  is_default: boolean;
};

const TYPE_LABEL: Record<string, string> = {
  credit_card: "Credit card",
  debit_card: "Debit card",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  wallet: "Wallet",
};

function detailLine(m: PaymentMethod): string {
  switch (m.type) {
    case "credit_card":
    case "debit_card":
      return [m.bank_name, m.card_network, m.last_four ? `•••• ${m.last_four}` : null]
        .filter(Boolean)
        .join(" · ");
    case "upi":
      return m.upi_id ?? "";
    case "bank_transfer":
      return [m.bank_name, m.last_four ? `•••• ${m.last_four}` : null].filter(Boolean).join(" · ");
    case "wallet":
      return [m.wallet_name, m.wallet_mobile].filter(Boolean).join(" · ");
    default:
      return "";
  }
}

function Row({ method }: { method: PaymentMethod }) {
  const del = useServerAction(deletePaymentMethod, { successMessage: "Removed." });
  const setDefault = useServerAction(setDefaultPaymentMethod);

  return (
    <li className="glass flex items-center justify-between gap-3 rounded-2xl p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-medium">
          {method.label}
          {method.is_default && (
            <span className="rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-semibold text-glow">
              Default
            </span>
          )}
        </p>
        <p className="truncate text-xs text-ink-3">
          {TYPE_LABEL[method.type] ?? method.type} · {detailLine(method)}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!method.is_default && (
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set("id", method.id);
              setDefault.run(fd);
            }}
            disabled={setDefault.pending}
            className="text-xs text-glow hover:underline disabled:opacity-50"
          >
            Set default
          </button>
        )}
        <button
          onClick={() => {
            if (confirm(`Remove ${method.label}?`)) {
              const fd = new FormData();
              fd.set("id", method.id);
              del.run(fd);
            }
          }}
          disabled={del.pending}
          className="glass rounded-full p-2 text-ink-3 transition-colors hover:text-overdue disabled:opacity-50"
          aria-label={`Remove ${method.label}`}
        >
          ×
        </button>
      </div>
    </li>
  );
}

/** How the subscriber actually pays for things — reusable across every
 *  "Mark paid" so payments trace back to a specific card/account/wallet,
 *  useful for splitting personal vs business spend at ITR/GST time. */
export function ProfilePaymentMethodsSection({ methods }: { methods: PaymentMethod[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {methods.length > 0 && (
        <ul className="mb-3 space-y-2">
          {methods.map((m) => (
            <Row key={m.id} method={m} />
          ))}
        </ul>
      )}

      {adding ? (
        <PaymentMethodForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="glass w-full rounded-2xl p-4 text-center text-sm text-ink-2 transition-colors hover:border-glow/30 hover:text-ink"
        >
          {methods.length === 0
            ? "Add your first payment method"
            : "+ Add another payment method"}
        </button>
      )}
    </div>
  );
}
