"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addSubscription } from "../actions";
import { ActionForm } from "@/components/ActionForm";
import { CustomSelect } from "@/components/CustomSelect";
import { ChipSelect } from "@/components/ChipSelect";
import { CustomDatePicker } from "@/components/CustomDatePicker";

const CATEGORIES = [
  ["entertainment", "Entertainment"],
  ["devTools", "Dev Tools"],
  ["telecom", "Telecom"],
  ["cloud", "Cloud"],
  ["saas", "SaaS"],
  ["utility", "Utility"],
  ["storage", "Storage"],
  ["security", "Security"],
  ["productivity", "Productivity"],
  ["other", "Other"],
];

const CYCLES = [
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
  ["quarterly", "Quarterly"],
  ["half_yearly", "Half-yearly"],
  ["yearly", "Yearly"],
];

type Entity = { id: string; name: string; type: string };
type PaymentMethod = { id: string; entity_id: string; label: string };

const inputClass =
  "glass w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40 [color-scheme:dark]";

export function NewSubscriptionForm({
  entities,
  paymentMethods,
}: {
  entities: Entity[];
  paymentMethods: PaymentMethod[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [entityId, setEntityId] = useState(entities[0]?.id ?? "");

  // Payment methods are entity-specific — only offer the ones that belong
  // to whichever entity is currently selected above, same scoping as the
  // Profile page's payment methods section.
  const entityMethods = paymentMethods.filter((m) => m.entity_id === entityId);

  return (
    <ActionForm
      action={addSubscription}
      onSuccess={() => router.push("/app")}
      className="glass space-y-4 rounded-3xl p-6"
    >
      {(pending) => (
        <>
          <div>
            <label className="mb-1 block text-xs text-ink-2">Service name</label>
            <input
              name="name"
              required
              placeholder="Netflix, AWS, Jio Fiber…"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-ink-2">Amount (₹)</label>
              <input
                name="amount"
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="649"
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                First charge date
              </label>
              <CustomDatePicker name="start_date" defaultValue={today} />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-2">
              Billing cycle
            </label>
            <ChipSelect
              name="billing_cycle"
              defaultValue="monthly"
              options={CYCLES.map(([value, label]) => ({ value, label }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs text-ink-2">Category</label>
              <CustomSelect
                name="category"
                defaultValue="other"
                options={CATEGORIES.map(([value, label]) => ({ value, label }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">Entity</label>
              <CustomSelect
                name="entity_id"
                defaultValue={entityId}
                options={entities.map((e) => ({ value: e.id, label: e.name }))}
                onChange={setEntityId}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-ink-2">
              Payment method (optional)
            </label>
            {/* key={entityId} forces a remount on entity change — this is
                an uncontrolled component (defaultValue only applies on
                mount), so without it a payment method picked for a
                previous entity would keep showing selected here even
                though it no longer belongs to the newly-chosen entity. */}
            <CustomSelect
              key={entityId}
              name="payment_method_id"
              defaultValue=""
              placeholder="Not tracked"
              options={[
                { value: "", label: "Not tracked" },
                ...entityMethods.map((m) => ({ value: m.id, label: m.label })),
              ]}
            />
          </div>

          <label className="flex items-center gap-3 text-sm text-ink-2">
            <input type="checkbox" name="is_auto_debit" className="h-4 w-4" />
            Auto-debit — charged automatically each cycle
          </label>

          <button
            type="submit"
            disabled={pending}
            className="brand-gradient glow-shadow w-full cursor-pointer rounded-xl py-3 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add subscription"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
