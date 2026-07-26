"use client";

import { downgradePlan } from "@/app/app/actions";
import { useServerAction } from "@/lib/useServerAction";

export function DowngradeButton({
  planCode,
  planName,
  daysRemaining,
}: {
  planCode: string;
  planName: string;
  daysRemaining: number | null;
}) {
  const { run, pending } = useServerAction(downgradePlan, {
    successMessage: `Moved to ${planName}.`,
  });

  function onClick() {
    const remainingNote =
      daysRemaining !== null && daysRemaining > 0
        ? ` You have ${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left on your current paid period — downgrading now takes effect immediately, with no refund for the unused time, but you also won't be charged your current plan's price again.`
        : "";
    if (!confirm(`Move to ${planName} now?${remainingNote}`)) return;
    const fd = new FormData();
    fd.set("plan_code", planCode);
    run(fd);
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="glass w-full cursor-pointer rounded-xl py-2.5 text-sm font-semibold text-ink-2 transition-colors duration-200 hover:border-white/20 hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? "Working…" : `Downgrade to ${planName}`}
    </button>
  );
}
