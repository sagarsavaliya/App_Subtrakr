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

export type WhatsAppDiagnostic = {
  phoneNumber: {
    ok: boolean;
    verifiedName?: string;
    displayPhoneNumber?: string;
    qualityRating?: string;
    codeVerificationStatus?: string;
    error?: string;
  };
  template: {
    checked: boolean;
    ok: boolean;
    variants?: { language: string; status: string; category: string }[];
    error?: string;
  };
};

/** Calls Meta's own API with the saved credentials — resolves exactly what
 *  a send failure otherwise leaves ambiguous (wrong token, wrong phone
 *  number ID, or the template's actual approved language code, which
 *  Meta's UI doesn't always make obvious at creation time). */
export async function testWhatsAppConnection(): Promise<
  WhatsAppDiagnostic | { notConfigured: true }
> {
  const creds = await whatsappCreds();
  if (!creds) return { notConfigured: true };

  const result: WhatsAppDiagnostic = {
    phoneNumber: { ok: false },
    template: { checked: false, ok: false },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${creds.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating,code_verification_status`,
      { headers: { Authorization: `Bearer ${creds.accessToken}` } },
    );
    const body = await res.json();
    if (!res.ok) {
      result.phoneNumber.error = body?.error?.message ?? `HTTP ${res.status}`;
    } else {
      result.phoneNumber.ok = true;
      result.phoneNumber.verifiedName = body.verified_name;
      result.phoneNumber.displayPhoneNumber = body.display_phone_number;
      result.phoneNumber.qualityRating = body.quality_rating;
      result.phoneNumber.codeVerificationStatus = body.code_verification_status;
    }
  } catch (e) {
    result.phoneNumber.error = e instanceof Error ? e.message : "Request failed";
  }

  const businessAccountId = await getSetting("whatsapp_business_account_id");
  if (!businessAccountId) {
    result.template.error =
      "Business account ID isn't set — add it above to check the template's approval status and language.";
  } else {
    result.template.checked = true;
    try {
      const res = await fetch(
        `https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/message_templates?name=subtrakr_otp`,
        { headers: { Authorization: `Bearer ${creds.accessToken}` } },
      );
      const body = await res.json();
      if (!res.ok) {
        result.template.error = body?.error?.message ?? `HTTP ${res.status}`;
      } else if (!body.data?.length) {
        result.template.error =
          "No template named subtrakr_otp found on this Business Account ID.";
      } else {
        result.template.ok = true;
        result.template.variants = body.data.map(
          (t: { language: string; status: string; category: string }) => ({
            language: t.language,
            status: t.status,
            category: t.category,
          }),
        );
      }
    } catch (e) {
      result.template.error = e instanceof Error ? e.message : "Request failed";
    }
  }

  return result;
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
