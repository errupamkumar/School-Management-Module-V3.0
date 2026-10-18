import crypto from 'node:crypto';

const isProd = process.env.NODE_ENV === 'production';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

/**
 * The JWT signing secret. Production refuses to start without one: a shared
 * fallback secret would let anyone mint a valid session cookie.
 */
export function authSecret(): string {
  const value = process.env.NEXTAUTH_SECRET?.trim();
  if (value && value.length >= 32) return value;
  if (isProd) {
    throw new Error('NEXTAUTH_SECRET must be set to at least 32 random characters in production');
  }
  if (value) return value;
  // Development only: stable per-machine secret so sessions survive restarts.
  return crypto.createHash('sha256').update(`dev-only:${process.cwd()}`).digest('hex');
}

/** 32-byte key for field-level encryption (Aadhaar, gateway credentials). */
export function dataKey(): Buffer {
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (raw) {
    const key = Buffer.from(raw, 'base64');
    if (key.length !== 32) throw new Error('DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
    return key;
  }
  if (isProd) throw new Error('DATA_ENCRYPTION_KEY is required in production');
  return crypto.createHash('sha256').update(`data-key:${authSecret()}`).digest();
}

export const env = {
  isProd,
  storageDir: () => process.env.STORAGE_DIR?.trim() || `${process.cwd()}/storage`,
  maxUploadBytes: () => Number(process.env.MAX_FILE_SIZE || 5 * 1024 * 1024),
  geminiKey: () => process.env.GEMINI_API_KEY?.trim() || '',
  /** Comma-separated, tried in order when a model is overloaded. */
  geminiModel: () => process.env.GEMINI_MODEL?.trim() || 'gemini-flash-latest,gemini-flash-lite-latest',
  anthropicKey: () => process.env.ANTHROPIC_API_KEY?.trim() || '',
  /** Claude model for the assistant; e.g. claude-sonnet-5-5 or claude-haiku-5-5 to lower cost. */
  anthropicModel: () => process.env.AI_MODEL?.trim() || 'claude-opus-5-5',
  razorpayKeyId: () => process.env.RAZORPAY_KEY_ID?.trim() || '',
  razorpaySecret: () => process.env.RAZORPAY_KEY_SECRET?.trim() || '',
  razorpayWebhookSecret: () => process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || '',
  /** Web Push (installable app notifications). Generate once with `npx web-push generate-vapid-keys`. */
  vapidPublicKey: () => process.env.VAPID_PUBLIC_KEY?.trim() || '',
  vapidPrivateKey: () => process.env.VAPID_PRIVATE_KEY?.trim() || '',
  vapidSubject: () => process.env.VAPID_SUBJECT?.trim() || 'mailto:support@vidyalaya.app',
  required,
};
