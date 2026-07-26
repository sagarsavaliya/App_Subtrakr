"use client";

import { adminChangePlan } from "@/app/admin/actions";
import { ActionForm } from "@/components/ActionForm";
import { CustomSelect } from "@/components/CustomSelect";

type Plan = { id: string; name: string; code: string };

export function PlanOverrideForm({
  userId,
  plans,
  currentPlanId,
}: {
  userId: string;
  plans: Plan[];
  currentPlanId?: string;
}) {
  return (
    <ActionForm action={adminChangePlan} className="space-y-3">
      {(pending) => (
        <>
          <input type="hidden" name="user_id" value={userId} />
          <CustomSelect
            name="plan_id"
            defaultValue={currentPlanId}
            options={plans.map((p) => ({ value: p.id, label: p.name }))}
          />
          <button
            type="submit"
            disabled={pending}
            className="brand-gradient w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Set plan"}
          </button>
          <p className="text-xs text-ink-3">
            Manual override — bypasses Razorpay, holds until changed again.
          </p>
        </>
      )}
    </ActionForm>
  );
}
