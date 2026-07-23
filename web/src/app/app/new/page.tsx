import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addSubscription } from "../actions";
import { CustomSelect } from "@/components/CustomSelect";

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

export default async function NewSubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: entities } = await supabase
    .from("entities")
    .select("id, name, type")
    .order("type");

  const today = new Date().toISOString().slice(0, 10);
  const inputClass =
    "glass w-full rounded-xl px-4 py-3 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40 [color-scheme:dark]";

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Add subscription</h1>
        <Link href="/app" className="text-sm text-ink-2 hover:text-ink">
          Cancel
        </Link>
      </div>

      {error && (
        <p className="glass mb-4 rounded-2xl border-overdue/40 p-4 text-sm text-overdue">
          That didn&apos;t save — check the fields and try again.
        </p>
      )}

      <form action={addSubscription} className="glass space-y-4 rounded-3xl p-6">
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
              Billing cycle
            </label>
            <CustomSelect
              name="billing_cycle"
              defaultValue="monthly"
              options={CYCLES.map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-ink-2">
              First charge date
            </label>
            <input
              name="start_date"
              type="date"
              defaultValue={today}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-ink-2">Category</label>
            <CustomSelect
              name="category"
              defaultValue="other"
              options={CATEGORIES.map(([value, label]) => ({ value, label }))}
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-ink-2">Entity</label>
          <CustomSelect
            name="entity_id"
            defaultValue={entities?.[0]?.id}
            options={(entities ?? []).map((e) => ({ value: e.id, label: e.name }))}
          />
        </div>

        <label className="flex items-center gap-3 text-sm text-ink-2">
          <input type="checkbox" name="is_auto_debit" className="h-4 w-4" />
          Auto-debit — charged automatically each cycle
        </label>

        <button
          type="submit"
          className="brand-gradient glow-shadow w-full rounded-xl py-3 text-sm font-bold text-[#08201a] transition hover:opacity-90"
        >
          Add subscription
        </button>
      </form>
    </div>
  );
}
