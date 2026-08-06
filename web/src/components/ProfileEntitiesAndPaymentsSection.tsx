"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/format";
import { deletePaymentMethod } from "@/app/app/paymentMethodActions";
import { useServerAction } from "@/lib/useServerAction";
import { PaymentMethodForm } from "@/components/PaymentMethodForm";
import { Modal } from "@/components/Modal";
import { AddEntityForm } from "@/components/AddEntityForm";
import { ProfileEmailSection } from "@/components/ProfileEmailSection";
import { ProfilePhoneSection } from "@/components/ProfilePhoneSection";
import { BuildingIcon, PencilIcon, TrashIcon, PlusIcon } from "@/components/icons";

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

export type Entity = {
  id: string;
  name: string;
  type: string;
  gst_number?: string | null;
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

function PaymentMethodCard({
  method,
  onEdit,
}: {
  method: PaymentMethod;
  onEdit: () => void;
}) {
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

export function ProfileEntitiesAndPaymentsSection({
  userName,
  userCreatedAt,
  userEmail,
  userEmailConfirmed,
  userPhone,
  entities,
  methods,
  atLimit,
  limit,
}: {
  userName: string;
  userCreatedAt: string | null;
  userEmail: string | null;
  userEmailConfirmed: boolean;
  userPhone: string | null;
  entities: Entity[];
  methods: PaymentMethod[];
  atLimit: boolean;
  limit: number | null;
}) {
  const router = useRouter();
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    entities[0]?.id ?? ""
  );
  const [openPaymentModal, setOpenPaymentModal] = useState(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);

  // Deduplicate entities by ID and name+type to prevent duplicate cards on frontend
  const uniqueEntities = Array.from(
    new Map(
      entities
        .filter((e) => e && e.name)
        .map((e) => [`${e.id || ''}-${e.name.trim().toLowerCase()}-${e.type}`, e])
    ).values()
  );

  useEffect(() => {
    if (!uniqueEntities.some((e) => e.id === selectedEntityId)) {
      setSelectedEntityId(uniqueEntities[0]?.id ?? "");
    }
  }, [uniqueEntities, selectedEntityId]);

  const visibleMethods = methods.filter((m) => m.entity_id === selectedEntityId);
  const selectedEntity = uniqueEntities.find((e) => e.id === selectedEntityId);

  function openAddPayment() {
    setEditingMethod(null);
    setOpenPaymentModal(true);
  }

  function openEditPayment(m: PaymentMethod) {
    setEditingMethod(m);
    setOpenPaymentModal(true);
  }

  function onPaymentFormDone() {
    setOpenPaymentModal(false);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      {/* ── 1. ENTITIES SECTION (Top, immediately below page title) ── */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-2">Entities</h2>
          <AddEntityForm atLimit={atLimit} limit={limit} />
        </div>

        {uniqueEntities.length === 0 ? (
          <div className="glass rounded-2xl p-6 text-center text-sm text-ink-3">
            No entities found. Create your first entity.
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {uniqueEntities.map((e) => {
              const isSelected = e.id === selectedEntityId;
              return (
                <div
                  key={e.id}
                  onClick={() => setSelectedEntityId(e.id)}
                  className={`glass relative flex cursor-pointer items-center justify-between gap-3 rounded-2xl p-4 transition-all duration-200 ${
                    isSelected
                      ? "border-glow/60 bg-glow/10 shadow-[0_4px_20px_rgba(45,212,191,0.12)] ring-1 ring-glow/40"
                      : "hover:border-ink-3/40 hover:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${
                        e.type === "personal"
                          ? "bg-personal/15 text-personal"
                          : "bg-accent-a/15 text-glow"
                      }`}
                    >
                      {e.type === "company" ? (
                        <BuildingIcon className="h-5 w-5" />
                      ) : (
                        e.name.slice(0, 1).toUpperCase()
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-ink-3">
                        {e.gst_number ? `GSTIN ${e.gst_number}` : e.type}
                      </p>
                    </div>
                  </div>

                  <input
                    type="radio"
                    name="selected_entity"
                    value={e.id ?? ""}
                    checked={isSelected}
                    onChange={() => setSelectedEntityId(e.id)}
                    aria-label={`Select ${e.name}`}
                    className="h-4 w-4 shrink-0 cursor-pointer accent-glow"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 2. PROFILE INFORMATION CARD (Middle, below Entities) ── */}
      <div className="glass flex flex-col gap-5 rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div className="brand-gradient flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-xl font-bold text-[#08201a]">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-lg font-semibold">{userName}</p>
              {selectedEntity && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-glow/15 px-2.5 py-0.5 text-xs font-semibold text-glow border border-glow/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-glow animate-pulse" />
                  {selectedEntity.name} ({selectedEntity.type === "company" ? "Business" : "Personal"})
                </span>
              )}
            </div>
            <p className="mt-0.5 text-xs text-ink-3">
              {userCreatedAt ? `Member since ${formatDate(userCreatedAt)}` : ""}
              {selectedEntity?.gst_number ? ` · GSTIN ${selectedEntity.gst_number}` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <ProfileEmailSection
            initialEmail={userEmail}
            initialConfirmed={userEmailConfirmed}
          />
          <ProfilePhoneSection initialPhone={userPhone} />
        </div>
      </div>

      {/* ── 3. PAYMENT METHODS SECTION (Bottom, below Profile Information) ── */}
      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-ink-2">
            Payment methods {selectedEntity ? `· ${selectedEntity.name}` : ""}
          </h2>
          <button
            type="button"
            onClick={openAddPayment}
            disabled={!selectedEntityId}
            aria-label="Add payment method"
            className="glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-2 transition-colors hover:border-glow/30 hover:text-glow disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-3 text-xs text-ink-3">
          Used when you mark a subscription paid — helps trace spend back to a
          specific card, account, or wallet for GST/ITR filing.
        </p>

        {visibleMethods.length > 0 ? (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {visibleMethods.map((m) => (
              <PaymentMethodCard
                key={m.id}
                method={m}
                onEdit={() => openEditPayment(m)}
              />
            ))}
          </ul>
        ) : (
          <div className="glass rounded-2xl p-4 text-center text-sm text-ink-2">
            No payment methods for this entity yet.
          </div>
        )}

        <Modal
          open={openPaymentModal}
          onClose={() => setOpenPaymentModal(false)}
          title={editingMethod ? "Edit payment method" : "Add payment method"}
        >
          <PaymentMethodForm
            existing={editingMethod ?? undefined}
            entityId={selectedEntityId}
            onDone={onPaymentFormDone}
          />
        </Modal>
      </div>
    </div>
  );
}
