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
  /** The WABA ID(s) the access token is actually scoped to, per Meta's own
   *  token-debug endpoint — resolves "which ID do I even put in that
   *  field" without hunting through Business Manager, and flags a
   *  mismatch against whatever was manually saved. */
  tokenScopedWabaIds?: string[];
  /** Which WABA ID the template lookup actually succeeded with — shown
   *  when it differs from the saved whatsapp_business_account_id so the
   *  admin knows exactly what to correct. */
  templateResolvedWabaId?: string;
  /** Why the /debug_token lookup itself didn't resolve a WABA id — surfaced
   *  instead of silently swallowed, since a permission/token-type problem
   *  here looks identical to "no data" otherwise. */
  tokenDebugError?: string;
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

  // Ask Meta what the token itself is actually scoped to, rather than
  // trusting a manually-typed Business Account ID — a system-user token's
  // granular_scopes lists the exact WABA id(s) it can manage, which is the
  // one thing Meta's own UI doesn't surface in one obvious place.
  try {
    // encodeURIComponent is load-bearing: permanent System User tokens can
    // contain "/", "+", "=" — unencoded, those corrupt the query string and
    // Meta ends up debugging a garbled token, producing a false "no scope"
    // result even though the same token works fine everywhere it's sent as
    // an Authorization header instead (query strings and headers are not
    // interchangeable without encoding).
    const encodedToken = encodeURIComponent(creds.accessToken);
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/debug_token?input_token=${encodedToken}&access_token=${encodedToken}`,
    );
    const body = await res.json();
    if (!res.ok) {
      result.tokenDebugError = body?.error?.message ?? `HTTP ${res.status}`;
    } else {
      const scopes = body?.data?.granular_scopes as
        | { scope: string; target_ids?: string[] }[]
        | undefined;
      const waba = scopes?.find(
        (s) =>
          s.scope === "whatsapp_business_management" ||
          s.scope === "whatsapp_business_messaging",
      );
      if (waba?.target_ids?.length) {
        result.tokenScopedWabaIds = waba.target_ids;
      } else {
        result.tokenDebugError =
          "Token debug succeeded but listed no whatsapp_business_management/messaging scope — is this a System User token with WhatsApp assigned as an asset?";
      }
    }
  } catch (e) {
    result.tokenDebugError =
      e instanceof Error ? e.message : "debug_token request failed";
  }

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

  const savedBusinessAccountId = await getSetting("whatsapp_business_account_id");
  // Try the saved ID first (if any), then fall back to whatever WABA id(s)
  // the token itself is actually scoped to — the saved value is very
  // commonly the wrong node (App ID, Business Manager ID, Phone Number ID)
  // since Meta's own UI doesn't clearly label which ID is which.
  const candidates = Array.from(
    new Set(
      [savedBusinessAccountId, ...(result.tokenScopedWabaIds ?? [])].filter(
        (id): id is string => !!id,
      ),
    ),
  );

  if (candidates.length === 0) {
    result.template.error =
      "No Business Account ID saved, and the token's debug info didn't reveal one either — add it above.";
  } else {
    result.template.checked = true;
    let lastError: string | undefined;
    for (const candidateId of candidates) {
      try {
        const res = await fetch(
          `https://graph.facebook.com/${GRAPH_VERSION}/${candidateId}/message_templates?name=subtrakr_otp`,
          { headers: { Authorization: `Bearer ${creds.accessToken}` } },
        );
        const body = await res.json();
        if (!res.ok) {
          lastError = body?.error?.message ?? `HTTP ${res.status}`;
          continue;
        }
        if (!body.data?.length) {
          lastError = `No template named subtrakr_otp found on ${candidateId}.`;
          continue;
        }
        result.template.ok = true;
        result.template.variants = body.data.map(
          (t: { language: string; status: string; category: string }) => ({
            language: t.language,
            status: t.status,
            category: t.category,
          }),
        );
        // Surface which ID actually worked so the saved setting can be
        // corrected if it wasn't the same one.
        if (candidateId !== savedBusinessAccountId) {
          result.templateResolvedWabaId = candidateId;
        }
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : "Request failed";
      }
    }
    if (!result.template.ok) {
      result.template.error = lastError;
    }
  }

  return result;
}

// In-memory cache for the template's actual approved language — avoids an
// extra Graph API call on every single OTP send. Short TTL so a template
// edit/re-approval in Meta Business Manager is picked up without a deploy.
let cachedTemplateLanguage: { code: string; fetchedAt: number } | null = null;
const TEMPLATE_LANGUAGE_CACHE_MS = 5 * 60_000;

/** The send call previously hardcoded language "en_US" — Meta's UI gives
 *  no language picker for this account (confirmed: always shows English,
 *  no choice), and the template's actual approved code is "en", not
 *  "en_US" (confirmed against the live template). A mismatch fails the
 *  send with an opaque Meta error. This resolves the real approved code
 *  instead of guessing, falling back to the confirmed "en" only if the
 *  lookup itself is unavailable. */
async function resolveTemplateLanguage(accessToken: string): Promise<string> {
  const FALLBACK = "en";
  if (
    cachedTemplateLanguage &&
    Date.now() - cachedTemplateLanguage.fetchedAt < TEMPLATE_LANGUAGE_CACHE_MS
  ) {
    return cachedTemplateLanguage.code;
  }

  const businessAccountId = await getSetting("whatsapp_business_account_id");
  if (!businessAccountId) return FALLBACK;

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${businessAccountId}/message_templates?name=subtrakr_otp`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const body = await res.json();
    if (!res.ok) return FALLBACK;
    const approved = (body.data as { language: string; status: string }[] | undefined)?.find(
      (t) => t.status === "APPROVED",
    );
    if (!approved) return FALLBACK;
    cachedTemplateLanguage = { code: approved.language, fetchedAt: Date.now() };
    return approved.language;
  } catch {
    return FALLBACK;
  }
}

/** Sends the subtrakr_otp Authentication template. [to] is E.164 without
 *  the leading "+" (Graph API convention). The code must appear in both
 *  the body parameter and the copy-code button's parameter — Meta's
 *  authentication template format requires it in both places. Returns the
 *  real Meta error text on failure so callers can log it with enough
 *  detail to actually debug, instead of a bare boolean. */
export async function sendOtpWhatsApp(
  to: string,
  code: string,
): Promise<{ ok: boolean; error?: string }> {
  const creds = await whatsappCreds();
  if (!creds) return { ok: false, error: "WhatsApp credentials not configured." };

  const language = await resolveTemplateLanguage(creds.accessToken);

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
            language: { code: language },
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
      const bodyText = await res.text();
      console.error("WhatsApp OTP send failed:", res.status, bodyText);
      let error = `HTTP ${res.status}`;
      try {
        error = JSON.parse(bodyText)?.error?.message ?? error;
      } catch {
        // Non-JSON body — the raw log line above still has the detail.
      }
      return { ok: false, error };
    }
    return { ok: true };
  } catch (e) {
    console.error("WhatsApp OTP send threw:", e);
    return { ok: false, error: e instanceof Error ? e.message : "Request failed" };
  }
}
