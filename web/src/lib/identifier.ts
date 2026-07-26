/** Shared identifier-detection + phone normalization — used by both the
 *  login UI (to pick which icon/validation to show as the user types) and
 *  API routes (to decide which channel, WhatsApp or email, a raw typed
 *  value maps to). Keeping this in one place means the client's guess and
 *  the server's guess can never disagree. */

export type IdentifierType = "email" | "phone" | null;

export function detectIdentifierType(raw: string): IdentifierType {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/[a-zA-Z@]/.test(trimmed)) return "email";
  if (/^[\d+\s-]+$/.test(trimmed)) return "phone";
  return null;
}

export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.length === 10) return `+91${digits}`;
  return `+${digits}`;
}

export function isValidIndianMobile(raw: string): boolean {
  return /^\+91[6-9]\d{9}$/.test(normalizePhone(raw));
}

export function isValidEmail(raw: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw.trim());
}
