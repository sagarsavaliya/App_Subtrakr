"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { Modal } from "@/components/Modal";
import { PencilIcon, TrashIcon } from "@/components/icons";

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

function Card({ method, onEdit }: { method: PaymentMethod; onEdit: () => void }) {
  const router = useRouter();
  const del = useServerAction(deletePaymentMethod, {
    successMessage: "Removed.",
    onSuccess: () => router.refresh(),
  });

  return (
    <li className="group glass relative overflow-hidden rounded-2xl p-4">
      <div className="min-w-0 pr-16">
        <p className="flex items-center gap-2 text-sm font-medium">
          <span className="truncate">{method.label}</span>
          {method.is_default && (
            <span className="shrink-0 rounded-full bg-glow/15 px-2 py-0.5 text-[10px] font-semibold text-glow">
              Default
            </span>
          )}
        </p>
        <p className="truncate text-xs text-ink-3">
          {TYPE_LABEL[method.type] ?? method.type} · {detailLine(method)}
        </p>
      </div>

      {/* Hover-revealed actions — always visible on touch devices (no
          hover state to reveal them otherwise) via group-focus-within. */}
      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100">
        <button
          onClick={onEdit}
          aria-label={`Edit ${method.label}`}
          className="glass rounded-full p-2 text-ink-3 transition-colors hover:text-glow"
        >
          <PencilIcon className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => {
            if (confirm(`Remove ${method.label}?`)) {
              const fd = new FormData();
              fd.set("id", method.id);
              del.run(fd);
            }
          }}
          disabled={del.pending}
          aria-label={`Remove ${method.label}`}
          className="glass rounded-full p-2 text-ink-3 transition-colors hover:text-overdue disabled:opacity-50"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </li>
  );
}

/** How the subscriber actually pays for things — reusable across every
 *  "Mark paid" so payments trace back to a specific card/account/wallet,
 *  useful for splitting personal vs business spend at ITR/GST time.
 *  Add/edit both happen in the same modal (PaymentMethodForm), matching
 *  the rest of the redesigned profile page. */
export function ProfilePaymentMethodsSection({ methods }: { methods: PaymentMethod[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(m: PaymentMethod) {
    setEditing(m);
    setOpen(true);
  }

  function onFormDone() {
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      {methods.length > 0 && (
        <ul className="mb-3 grid gap-3 sm:grid-cols-2">
          {methods.map((m) => (
            <Card key={m.id} method={m} onEdit={() => openEdit(m)} />
          ))}
        </ul>
      )}

      <button
        onClick={openAdd}
        className="glass w-full rounded-2xl p-4 text-center text-sm text-ink-2 transition-colors hover:border-glow/30 hover:text-ink"
      >
        {methods.length === 0 ? "Add your first payment method" : "+ Add another payment method"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit payment method" : "Add payment method"}
      >
        <PaymentMethodForm existing={editing ?? undefined} onDone={onFormDone} />
      </Modal>
    </div>
  );
}
