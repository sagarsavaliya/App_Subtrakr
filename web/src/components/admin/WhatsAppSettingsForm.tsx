"use client";

import { saveWhatsAppSettings } from "@/app/admin/actions";
import { ActionForm } from "@/components/ActionForm";

type Status = { set: boolean; display: string };

/** See RazorpaySettingsForm's comment — same fix, same reason: the
 *  function-children form of ActionForm can't be passed down from the
 *  async Server Component page, only rendered from within a "use client"
 *  component like this one. */
export function WhatsAppSettingsForm({
  waPhoneNumberId,
  waAccessToken,
  waBusinessAccountId,
}: {
  waPhoneNumberId: Status;
  waAccessToken: Status;
  waBusinessAccountId: Status;
}) {
  const inputClass =
    "glass w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  return (
    <ActionForm
      action={saveWhatsAppSettings}
      successMessage="WhatsApp settings saved."
      className="glass rounded-2xl p-5"
    >
      {(pending) => (
        <>
          <h2 className="mb-1 text-sm font-semibold">Update credentials</h2>
          <p className="mb-4 text-xs text-ink-3">
            From Meta Business Settings → System Users, generate a permanent token scoped to
            whatsapp_business_messaging. Leave a field blank to keep its current value.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-ink-2">Phone number ID</label>
              <input
                name="phone_number_id"
                placeholder={waPhoneNumberId.set ? waPhoneNumberId.display : "1234567890123456"}
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">Access token</label>
              <input
                name="access_token"
                type="password"
                placeholder={waAccessToken.set ? "unchanged" : "EAAG…"}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                Business account ID (optional, reference only)
              </label>
              <input
                name="business_account_id"
                placeholder={
                  waBusinessAccountId.set ? waBusinessAccountId.display : "1234567890123456"
                }
                className={inputClass}
                autoComplete="off"
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
