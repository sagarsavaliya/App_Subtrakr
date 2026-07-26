"use client";

import { saveRazorpaySettings } from "@/app/admin/actions";
import { ActionForm } from "@/components/ActionForm";

type Status = { set: boolean; display: string };

/** A plain closure passed as ActionForm's function-children only works
 *  client-to-client — admin/settings/page.tsx is an async Server
 *  Component, and Next rejects a raw function crossing the server→client
 *  boundary ("Functions cannot be passed directly to Client Components"),
 *  which is exactly what crashed this page. Isolating the form in its own
 *  "use client" component fixes it: the page only ever passes serializable
 *  data (the Status objects) across the boundary now. */
export function RazorpaySettingsForm({
  keyId,
  keySecret,
  webhookSecret,
}: {
  keyId: Status;
  keySecret: Status;
  webhookSecret: Status;
}) {
  const inputClass =
    "glass w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  return (
    <ActionForm
      action={saveRazorpaySettings}
      successMessage="Razorpay settings saved."
      className="glass rounded-2xl p-5"
    >
      {(pending) => (
        <>
          <h2 className="mb-1 text-sm font-semibold">Update credentials</h2>
          <p className="mb-4 text-xs text-ink-3">Leave a field blank to keep its current value.</p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                Key ID (rzp_live_… or rzp_test_…)
              </label>
              <input
                name="key_id"
                placeholder={keyId.set ? keyId.display : "rzp_test_XXXXXXXX"}
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">Key secret</label>
              <input
                name="key_secret"
                type="password"
                placeholder={keySecret.set ? "unchanged" : "secret"}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">Webhook secret</label>
              <input
                name="webhook_secret"
                type="password"
                placeholder={webhookSecret.set ? "unchanged" : "whsec…"}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="brand-gradient mt-5 cursor-pointer rounded-lg px-5 py-2 text-sm font-bold text-[#08201a] transition-transform duration-150 hover:scale-105 hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save settings"}
          </button>
        </>
      )}
    </ActionForm>
  );
}
