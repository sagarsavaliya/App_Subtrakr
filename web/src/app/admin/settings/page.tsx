import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminIdentity } from "@/lib/adminAuth";
import { saveRazorpaySettings, saveWhatsAppSettings } from "../actions";
import { WhatsAppTestButton } from "@/components/WhatsAppTestButton";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const admin = await getAdminIdentity();
  const db = createAdminClient();
  const { data: rows } = await db
    .from("app_settings")
    .select("key, value, is_secret, updated_at");

  const status = (key: string) => {
    const row = rows?.find((r) => r.key === key);
    if (!row?.value) return { set: false, display: "Not set" };
    return {
      set: true,
      // Secrets are never echoed back — only the non-secret key id is shown.
      display: row.is_secret
        ? "•••••••• (saved)"
        : row.value,
    };
  };

  const keyId = status("razorpay_key_id");
  const keySecret = status("razorpay_key_secret");
  const webhookSecret = status("razorpay_webhook_secret");
  const waPhoneNumberId = status("whatsapp_phone_number_id");
  const waAccessToken = status("whatsapp_access_token");
  const waBusinessAccountId = status("whatsapp_business_account_id");
  const canEdit = admin?.role === "super_admin";

  const inputClass =
    "glass w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-glow/40";

  return (
    <div className="max-w-2xl">
      <h1 className="mb-2 text-xl font-semibold">Settings</h1>
      <p className="mb-6 text-sm text-ink-2">
        Payment gateway credentials live encrypted in the database — never in
        git, code, or env files. Saved secrets are never displayed again.
      </p>

      <div className="glass mb-6 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold">Razorpay status</h2>
        <ul className="space-y-2 text-sm">
          {[
            ["Key ID", keyId],
            ["Key secret", keySecret],
            ["Webhook secret", webhookSecret],
          ].map(([label, s]) => {
            const st = s as { set: boolean; display: string };
            return (
              <li key={label as string} className="flex justify-between">
                <span className="text-ink-2">{label as string}</span>
                <span className={st.set ? "text-glow" : "text-due"}>
                  {st.display}
                </span>
              </li>
            );
          })}
        </ul>
        {!keyId.set && (
          <p className="mt-3 text-xs text-ink-3">
            Until all three are set, the billing page shows &quot;payments
            being set up&quot; and upgrades stay disabled.
          </p>
        )}
      </div>

      {canEdit ? (
        <form action={saveRazorpaySettings} className="glass rounded-2xl p-5">
          <h2 className="mb-1 text-sm font-semibold">Update credentials</h2>
          <p className="mb-4 text-xs text-ink-3">
            Leave a field blank to keep its current value.
          </p>
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
              <label className="mb-1 block text-xs text-ink-2">
                Webhook secret
              </label>
              <input
                name="webhook_secret"
                type="password"
                placeholder={webhookSecret.set ? "unchanged" : "whsec…"}
                className={inputClass}
                autoComplete="new-password"
              />
            </div>
          </div>
          <button className="brand-gradient mt-5 rounded-lg px-5 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90">
            Save settings
          </button>
        </form>
      ) : (
        <p className="glass rounded-2xl p-5 text-sm text-ink-2">
          Only a super admin can change these settings.
        </p>
      )}

      <div className="glass mt-6 rounded-2xl p-5 text-xs text-ink-3">
        <p className="mb-1 font-semibold text-ink-2">Webhook URL for the Razorpay dashboard:</p>
        <code className="font-mono">https://subtrakr.me/api/billing/webhook</code>
        <p className="mt-2">Subscribe to the payment.captured event.</p>
      </div>

      <h1 className="mb-2 mt-10 text-xl font-semibold">WhatsApp messaging</h1>
      <p className="mb-6 text-sm text-ink-2">
        Powers phone-number verification at signup (subtrakr_otp) and, once
        wired up, renewal/payment notifications. Same encrypted vault as
        Razorpay.
      </p>

      <div className="glass mb-6 rounded-2xl p-5">
        <h2 className="mb-3 text-sm font-semibold">WhatsApp status</h2>
        <ul className="space-y-2 text-sm">
          {[
            ["Phone number ID", waPhoneNumberId],
            ["Access token", waAccessToken],
            ["Business account ID", waBusinessAccountId],
          ].map(([label, s]) => {
            const st = s as { set: boolean; display: string };
            return (
              <li key={label as string} className="flex justify-between">
                <span className="text-ink-2">{label as string}</span>
                <span className={st.set ? "text-glow" : "text-due"}>
                  {st.display}
                </span>
              </li>
            );
          })}
        </ul>
        {!(waPhoneNumberId.set && waAccessToken.set) && (
          <p className="mt-3 text-xs text-ink-3">
            Until both the phone number ID and access token are set, signup
            OTP requests fail with &quot;verification isn&apos;t set up
            yet&quot;.
          </p>
        )}
        <WhatsAppTestButton />
      </div>

      {canEdit ? (
        <form action={saveWhatsAppSettings} className="glass rounded-2xl p-5">
          <h2 className="mb-1 text-sm font-semibold">Update credentials</h2>
          <p className="mb-4 text-xs text-ink-3">
            From Meta Business Settings → System Users, generate a permanent
            token scoped to whatsapp_business_messaging. Leave a field blank
            to keep its current value.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                Phone number ID
              </label>
              <input
                name="phone_number_id"
                placeholder={
                  waPhoneNumberId.set ? waPhoneNumberId.display : "1234567890123456"
                }
                className={inputClass}
                autoComplete="off"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-ink-2">
                Access token
              </label>
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
          <button className="brand-gradient mt-5 rounded-lg px-5 py-2 text-sm font-bold text-[#08201a] transition hover:opacity-90">
            Save settings
          </button>
        </form>
      ) : (
        <p className="glass rounded-2xl p-5 text-sm text-ink-2">
          Only a super admin can change these settings.
        </p>
      )}
    </div>
  );
}
