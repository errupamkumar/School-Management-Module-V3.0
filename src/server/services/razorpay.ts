import crypto from 'node:crypto';
import { decryptField, hmacSha256Hex } from '../crypto';
import { env } from '../env';
import type { SchoolSettings } from '../settings';

export interface RazorpayCreds {
  keyId: string;
  secret: string;
}

/** School's own Razorpay account (fees settle to the school), falling back to platform env keys. */
export function razorpayCreds(settings: SchoolSettings): RazorpayCreds | null {
  const p = settings.payments;
  if (p.razorpayKeyId && p.razorpayKeySecretEnc) return { keyId: p.razorpayKeyId, secret: decryptField(p.razorpayKeySecretEnc) };
  if (env.razorpayKeyId() && env.razorpaySecret()) return { keyId: env.razorpayKeyId(), secret: env.razorpaySecret() };
  return null;
}

/** Local demo only: simulates the gateway. Never available in production builds. */
export function sandboxEnabled(): boolean {
  return process.env.NODE_ENV !== 'production' && process.env.PAYMENT_SANDBOX === '1';
}

export async function createOrder(creds: RazorpayCreds, amountPaise: number, receipt: string, notes: Record<string, string>): Promise<{ id: string }> {
  const res = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${creds.keyId}:${creds.secret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt: receipt.slice(0, 40), notes }),
    signal: AbortSignal.timeout(15_000),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!res.ok || !json.id) throw new Error(json.error?.description ?? `Razorpay error ${res.status}`);
  return { id: json.id };
}

export function sandboxOrderId(): string {
  return `order_SANDBOX${crypto.randomBytes(8).toString('hex')}`;
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  const expected = hmacSha256Hex(secret, `${orderId}|${paymentId}`);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = hmacSha256Hex(secret, rawBody);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
