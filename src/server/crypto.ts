import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { dataKey } from './env';

const BCRYPT_COST = 12;

/** User-chosen passwords get the full cost; random temp passwords are high-entropy and use a lower one. */
export function hashPassword(plain: string, kind: 'chosen' | 'temporary' = 'chosen'): Promise<string> {
  return bcrypt.hash(plain, kind === 'chosen' ? BCRYPT_COST : 10);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// A real hash so failed lookups cost the same as failed password checks,
// which keeps login timing from revealing whether a username exists.
// Precomputed (cost 12, random plaintext): hashing at import would block every cold start for ~0.4 s.
const DUMMY_HASH = '$2b$12$vl/TSmMeOAkrNMxVsz1RpuJUOpJk/CHUiK4bDAlXrP78M.O9u7wEC';
export async function burnPasswordCheck(plain: string): Promise<void> {
  await bcrypt.compare(plain, DUMMY_HASH);
}

/** Human-friendly temporary password: no look-alike characters (0/O, 1/l/I). */
export function generateTempPassword(length = 10): string {
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = lower + upper + digits;
  const pick = (set: string) => set[crypto.randomInt(set.length)];
  const chars = [pick(lower), pick(upper), pick(digits)];
  while (chars.length < length) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function randomToken(bytes = 16): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/** AES-256-GCM. Output format: v1.<iv>.<tag>.<ciphertext> (base64url parts). */
export function encryptField(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', dataKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), enc.toString('base64url')].join('.');
}

export function decryptField(payload: string): string {
  const [version, iv, tag, data] = payload.split('.');
  if (version !== 'v1' || !iv || !tag || !data) throw new Error('Unsupported ciphertext');
  const decipher = crypto.createDecipheriv('aes-256-gcm', dataKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'hex');
  const bb = Buffer.from(b, 'hex');
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}
