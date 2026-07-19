import crypto from "crypto";
import { createAdminClient } from "./supabase/admin";

/** Encrypted app_settings vault (Razorpay keys etc.), managed only via the
 *  super-admin UI — never in git or env. Secrets are AES-256-GCM encrypted
 *  with SETTINGS_ENCRYPTION_KEY (server env only); ciphertext lives in the
 *  `value` column as "enc1:<iv>:<tag>:<data>" base64 — pgcrypto's BYTEA
 *  column is avoided because PostgREST's bytea round-tripping is awkward. */

const PREFIX = "enc1";

function key(): Buffer {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error("SETTINGS_ENCRYPTION_KEY missing or not 32 bytes hex");
  }
  return Buffer.from(hex, "hex");
}

export function encryptValue(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    data.toString("base64"),
  ].join(":");
}

export function decryptValue(stored: string): string {
  const [prefix, ivB64, tagB64, dataB64] = stored.split(":");
  if (prefix !== PREFIX) throw new Error("Not an encrypted value");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export async function getSetting(settingKey: string): Promise<string | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("app_settings")
    .select("value, is_secret")
    .eq("key", settingKey)
    .maybeSingle();
  if (!data?.value) return null;
  return data.is_secret ? decryptValue(data.value) : data.value;
}

export async function setSetting(
  settingKey: string,
  value: string,
  { secret = false, description }: { secret?: boolean; description?: string } = {},
): Promise<void> {
  const db = createAdminClient();
  const { error } = await db.from("app_settings").upsert(
    {
      key: settingKey,
      value: secret ? encryptValue(value) : value,
      is_secret: secret,
      description,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  if (error) throw error;
}

/** True when a value exists — never returns the secret itself. */
export async function hasSetting(settingKey: string): Promise<boolean> {
  const db = createAdminClient();
  const { data } = await db
    .from("app_settings")
    .select("id")
    .eq("key", settingKey)
    .maybeSingle();
  return !!data;
}
