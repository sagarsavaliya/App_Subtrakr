"use client";

import { motion } from "framer-motion";
import { adminChangePlan } from "@/app/admin/actions";
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
    <form action={adminChangePlan} className="space-y-3">
      <input type="hidden" name="user_id" value={userId} />
      <CustomSelect
        name="plan_id"
        defaultValue={currentPlanId}
        options={plans.map((p) => ({ value: p.id, label: p.name }))}
      />
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="brand-gradient w-full cursor-pointer rounded-xl py-2.5 text-sm font-bold text-[#08201a] transition-opacity duration-200 hover:opacity-90"
      >
        Set plan
      </motion.button>
      <p className="text-xs text-ink-3">
        Manual override — bypasses Razorpay, holds until changed again.
      </p>
    </form>
  );
}
