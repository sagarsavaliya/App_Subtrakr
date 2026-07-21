import { getSetting } from "./settings";

/** WhatsApp Cloud API sender — credentials come from the encrypted
 *  app_settings vault (admin UI), never from env or code. Templates
 *  themselves are approved separately in Meta Business Manager; this only
 *  fires the send call. */

const GRAPH_VERSION = "v21.0";

async function whatsappCreds(): Promise<{
  phoneNumberId: string;
  accessToken: string;
} | null> {
  const [phoneNumberId, accessToken] = await Promise.all([
    getSetting("whatsapp_phone_number_id"),
    getSetting("whatsapp_access_token"),
  ]);
  if (!phoneNumberId || !accessToken) return null;
  return { phoneNumberId, accessToken };
}

export async function whatsappConfigured(): Promise<boolean> {
  return (await whatsappCreds()) !== null;
}

/** Sends the subtrakr_otp Authentication template. [to] is E.164 without
 *  the leading "+" (Graph API convention). The code must appear in both
 *  the body parameter and the copy-code button's parameter — Meta's
 *  authentication template format requires it in both places. */
export async function sendOtpWhatsApp(to: string, code: string): Promise<boolean> {
  const creds = await whatsappCreds();
  if (!creds) return false;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${creds.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to,
          type: "template",
          template: {
            name: "subtrakr_otp",
            language: { code: "en_US" },
            components: [
              { type: "body", parameters: [{ type: "text", text: code }] },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [{ type: "text", text: code }],
              },
            ],
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("WhatsApp OTP send failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error("WhatsApp OTP send threw:", e);
    return false;
  }
}
