import { prisma } from './db';

/**
 * Fixed-window rate limiter backed by MySQL, so limits hold across multiple
 * app instances. Returns whether the call is allowed and when the window resets.
 */
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSec * 1000);
  // Single statement: start a new window if the old one expired, else increment.
  await prisma.$executeRaw`
    INSERT INTO RateLimit (\`key\`, count, resetAt) VALUES (${key}, 1, ${resetAt})
    ON DUPLICATE KEY UPDATE
      count = IF(resetAt <= ${now}, 1, count + 1),
      resetAt = IF(resetAt <= ${now}, ${resetAt}, resetAt)`;
  const row = await prisma.rateLimit.findUnique({ where: { key } });
  const count = row?.count ?? 1;
  const retryAfterSec = row ? Math.max(1, Math.ceil((row.resetAt.getTime() - now.getTime()) / 1000)) : windowSec;
  if (Math.random() < 0.01) {
    // Opportunistic cleanup keeps the table small without a cron job.
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } }).catch(() => {});
  }
  return { ok: count <= limit, retryAfterSec };
}

export function clientIp(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip')?.trim() || 'unknown';
}
