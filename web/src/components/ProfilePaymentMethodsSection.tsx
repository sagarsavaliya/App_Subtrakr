"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { Modal } from "@/components/Modal";
import { CustomSelect } from "@/components/CustomSelect";
import { PencilIcon, TrashIcon, PlusIcon } from "@/components/icons";

export type PaymentMethod = {
  id: string;
  entity_id: string;
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

type Entity = { id: string; name: string; type: string };

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

/** How the subscriber actually pays for things, scoped per entity — a
 *  "default card" means something different for Personal vs. a specific
 *  business, so methods are filtered by whichever entity is selected in
 *  the dropdown here, and a newly-added one belongs to that same entity.
 *  Add/edit both happen in the same modal (PaymentMethodForm). */
export function ProfilePaymentMethodsSection({
  methods,
  entities,
}: {
  methods: PaymentMethod[];
  entities: Entity[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentMethod | null>(null);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");

  const visible = methods.filter((m) => m.entity_id === entityId);

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
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink-2">Payment methods</h2>
        <div className="flex items-center gap-2">
          <div className="w-56 shrink-0">
            <CustomSelect
              name="entity_filter"
              defaultValue={entityId}
              options={entities.map((e) => ({ value: e.id, label: e.name }))}
              onChange={setEntityId}
            />
          </div>
          <button
            type="button"
            onClick={openAdd}
            disabled={!entityId}
            aria-label="Add payment method"
            className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:border-glow/30 hover:text-glow disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
      <p className="mb-3 text-xs text-ink-3">
        Used when you mark a subscription paid — helps trace spend back to a
        specific card, account, or wallet for GST/ITR filing. Pick an entity
        above to see or add methods for that business.
      </p>

      {visible.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((m) => (
            <Card key={m.id} method={m} onEdit={() => openEdit(m)} />
          ))}
        </ul>
      ) : (
        <div className="glass rounded-2xl p-4 text-center text-sm text-ink-2">
          No payment methods for this entity yet.
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Edit payment method" : "Add payment method"}
      >
        <PaymentMethodForm existing={editing ?? undefined} entityId={entityId} onDone={onFormDone} />
      </Modal>
    </div>
  );
}
