import crypto from "crypto";
import { getSetting } from "./settings";

/** Thin Razorpay REST wrapper — key_id/key_secret come from the encrypted
 *  app_settings vault (admin UI), never from env or code. */

export async function razorpayKeys(): Promise<{
  keyId: string;
  keySecret: string;
} | null> {
  const [keyId, keySecret] = await Promise.all([
    getSetting("razorpay_key_id"),
    getSetting("razorpay_key_secret"),
  ]);
  if (!keyId || !keySecret) return null;
  return { keyId, keySecret };
}

export async function createOrder(params: {
  amountPaise: number;
  receipt: string;
  notes?: Record<string, string>;
}): Promise<{ orderId: string; keyId: string } | null> {
  const keys = await razorpayKeys();
  if (!keys) return null;

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " +
        Buffer.from(`${keys.keyId}:${keys.keySecret}`).toString("base64"),
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency: "INR",
      receipt: params.receipt,
      notes: params.notes ?? {},
    }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${res.status} ${await res.text()}`);
  }
  const order = (await res.json()) as { id: string };
  return { orderId: order.id, keyId: keys.keyId };
}

/** Razorpay checkout success handler signature check:
 *  HMAC-SHA256(order_id + "|" + payment_id, key_secret). */
export function verifyPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", params.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(params.signature),
  );
}

/** Webhook body signature check: HMAC-SHA256(rawBody, webhook_secret). */
export function verifyWebhookSignature(params: {
  rawBody: string;
  signature: string;
  webhookSecret: string;
}): boolean {
  const expected = crypto
    .createHmac("sha256", params.webhookSecret)
    .update(params.rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(params.signature),
    );
  } catch {
    return false;
  }
}
