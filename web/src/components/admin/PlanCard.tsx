"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { updatePlan, deletePlan } from "@/app/admin/actions";
import { useServerAction } from "@/lib/useServerAction";
import { TrashIcon } from "@/components/icons";
import { formatINR } from "@/lib/format";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_entities: number | null;
  max_subscriptions: number | null;
  is_active: boolean;
};

const inputClass =
  "glass w-full rounded-lg px-3 py-2 text-sm outline-none focus:border-glow/40";

export function PlanCard({ plan, canDelete }: { plan: Plan; canDelete: boolean }) {
  const [editing, setEditing] = useState(false);
  const update = useServerAction(updatePlan, { onSuccess: () => setEditing(false) });
  const del = useServerAction(deletePlan);

  function onDeleteClick() {
    if (
      confirm(
        `Delete the ${plan.name} plan? This can't be undone, and fails safely if any subscriber is currently on it.`,
      )
    ) {
      const fd = new FormData();
      fd.set("id", plan.id);
      del.run(fd);
    }
  }

  return (
    <motion.div
      layout
      className={`glass rounded-2xl p-5 transition-opacity ${!plan.is_active ? "opacity-60" : ""}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!editing ? (
          <motion.div
            key="view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
                {plan.code}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                  plan.is_active ? "bg-glow/15 text-glow" : "bg-white/10 text-ink-3"
                }`}
              >
                {plan.is_active ? "Active" : "Inactive"}
              </span>
            </div>
            <h3 className="text-lg font-semibold">{plan.name}</h3>
            <p className="mt-1 min-h-10 text-sm text-ink-2">{plan.description}</p>
            <p className="mt-4 font-mono text-2xl font-bold">
              {plan.price_monthly > 0 ? formatINR(plan.price_monthly) : "₹0"}
              <span className="text-sm font-normal text-ink-3">/mo</span>
            </p>
            {plan.price_yearly > 0 && (
              <p className="text-xs text-ink-3">or {formatINR(plan.price_yearly)}/yr</p>
            )}
            <ul className="mt-4 space-y-1 text-xs text-ink-2">
              <li>
                {plan.max_entities
                  ? `${plan.max_entities} ${plan.max_entities === 1 ? "entity" : "entities"}`
                  : "Unlimited entities"}
              </li>
              <li>
                {plan.max_subscriptions
                  ? `Up to ${plan.max_subscriptions} subscriptions`
                  : "Unlimited subscriptions"}
              </li>
            </ul>
            <div className="mt-5 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setEditing(true)}
                className="glass flex-1 cursor-pointer rounded-xl py-2 text-sm text-ink-2 transition-colors duration-200 hover:text-ink"
              >
                Edit
              </motion.button>
              {canDelete && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onDeleteClick}
                  disabled={del.pending}
                  className="glass flex cursor-pointer items-center justify-center rounded-xl p-2.5 text-ink-3 transition-colors duration-200 hover:text-overdue disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={`Delete ${plan.name}`}
                >
                  <TrashIcon className="h-4 w-4" />
                </motion.button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="edit"
            onSubmit={(e) => {
              e.preventDefault();
              update.run(new FormData(e.currentTarget));
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <input type="hidden" name="id" value={plan.id} />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-xs uppercase tracking-widest text-ink-3">
                {plan.code}
              </p>
              <label className="flex items-center gap-2 text-xs text-ink-2">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={plan.is_active}
                  className="h-4 w-4"
                />
                Active
              </label>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-ink-2">Name</label>
                <input name="name" defaultValue={plan.name} className={inputClass} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-ink-2">Description</label>
                <input
                  name="description"
                  defaultValue={plan.description ?? ""}
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-ink-2">Monthly (₹)</label>
                  <input
                    name="price_monthly"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={Number(plan.price_monthly)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-ink-2">Yearly (₹)</label>
                  <input
                    name="price_yearly"
                    type="number"
                    min="0"
                    step="1"
                    defaultValue={Number(plan.price_yearly)}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                disabled={update.pending}
                className="brand-gradient flex-1 cursor-pointer rounded-xl py-2 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {update.pending ? "Saving…" : "Save"}
              </motion.button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="cursor-pointer rounded-xl px-4 text-sm text-ink-3 hover:text-ink-2"
              >
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
