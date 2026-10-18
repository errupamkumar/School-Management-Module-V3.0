import crypto from 'node:crypto';
import { HttpError, publicRoute } from '@/server/api';
import { dispatchDueReminders } from '@/server/services/reminders';

/**
 * Scheduler hook: call every minute from any cron (Vercel Cron, GitHub Actions,
 * crontab + curl) with header `Authorization: Bearer <CRON_SECRET>`.
 * Without a cron, reminders still go out when users are active (lazy fallback).
 */
export const POST = publicRoute({ name: 'cron', limit: 120, windowSec: 600 }, async (req) => {
  const secret = process.env.CRON_SECRET?.trim();
  const given = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 16 || given.length !== secret.length || !crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHENTICATED');
  }
  const reminders = await dispatchDueReminders({ limit: 200 });
  return { reminders };
});
export const GET = POST;
