import { prisma, tenantDb } from '../db';
import { readSettings } from '../settings';
import { rateLimit } from '../rate-limit';
import { readAudience, audienceUserIds } from './audience';
import { notifyUsers } from './notify';

export type Repeat = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

/** Next run of a repeating reminder strictly after `now` (pure, unit-tested). */
export function nextRun(at: Date, repeat: Repeat, now: Date = new Date()): Date | null {
  if (repeat === 'NONE') return null;
  const d = new Date(at);
  let guard = 0;
  while (d <= now && guard++ < 1000) {
    if (repeat === 'DAILY') d.setUTCDate(d.getUTCDate() + 1);
    else if (repeat === 'WEEKLY') d.setUTCDate(d.getUTCDate() + 7);
    else {
      const day = at.getUTCDate();
      d.setUTCDate(1);
      d.setUTCMonth(d.getUTCMonth() + 1);
      const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      d.setUTCDate(Math.min(day, last));
    }
  }
  return d;
}

/**
 * Sends due reminders. Each one is claimed atomically (status + remindAt must
 * still match) so concurrent runners never send the same reminder twice.
 * Called by the cron endpoint and, as a fallback, lazily when users poll
 * notifications (at most once a minute per school).
 */
export async function dispatchDueReminders(opts: { schoolId?: string; limit?: number } = {}): Promise<{ sent: number }> {
  const now = new Date();
  const due = await prisma.reminder.findMany({
    where: { status: 'SCHEDULED', remindAt: { lte: now }, ...(opts.schoolId ? { schoolId: opts.schoolId } : {}) },
    orderBy: { remindAt: 'asc' },
    take: opts.limit ?? 50,
  });
  let sent = 0;
  for (const r of due) {
    const next = nextRun(r.remindAt, r.repeat as Repeat, now);
    const claimed = await prisma.reminder.updateMany({
      where: { id: r.id, status: 'SCHEDULED', remindAt: r.remindAt },
      data: next ? { remindAt: next, lastSentAt: now, sentCount: { increment: 1 } } : { status: 'SENT', lastSentAt: now, sentCount: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      const db = tenantDb(r.schoolId);
      const aud = r.audience as { self?: boolean } | null;
      const userIds = aud?.self ? [r.createdById] : await audienceUserIds(db, readAudience(r.audience));
      const channels = Array.isArray(r.channels) ? (r.channels as string[]) : ['APP'];
      if (channels.includes('APP')) await notifyUsers(db, r.schoolId, userIds, { title: `Reminder: ${r.title}`, body: r.message.slice(0, 500), link: '/reminders' });
      if (channels.includes('SMS') || channels.includes('EMAIL')) await sendExternal(r.schoolId, r.createdById, userIds, channels, r.title, r.message);
      sent++;
    } catch (e) {
      console.error('[reminders] send failed', r.id, e);
    }
  }
  return { sent };
}

/** SMS / email copies go through the normal outbox (and its gateway settings and log). */
async function sendExternal(schoolId: string, sentById: string, userIds: string[], channels: string[], title: string, message: string) {
  const [school, users] = await Promise.all([
    prisma.school.findUniqueOrThrow({ where: { id: schoolId }, select: { settings: true } }),
    prisma.user.findMany({ where: { schoolId, id: { in: userIds } }, select: { name: true, phone: true, email: true } }),
  ]);
  const settings = readSettings(school.settings);
  const rows: Array<{ channel: string; recipient: string; recipientName: string; subject: string | null; body: string; status: string; provider: string | null; error: string | null }> = [];
  for (const u of users) {
    if (channels.includes('SMS') && u.phone && /^[6-9]\d{9}$/.test(u.phone)) {
      const ok = settings.messaging.smsProvider !== 'NONE';
      rows.push({ channel: 'SMS', recipient: u.phone, recipientName: u.name, subject: null, body: `${title}: ${message}`.slice(0, 1000), status: ok ? 'QUEUED' : 'SKIPPED', provider: ok ? settings.messaging.smsProvider : null, error: ok ? null : 'SMS gateway not configured in School Settings' });
    }
    if (channels.includes('EMAIL') && u.email) {
      const ok = settings.messaging.emailProvider === 'SMTP' && !!settings.messaging.smtpHost;
      rows.push({ channel: 'EMAIL', recipient: u.email.toLowerCase(), recipientName: u.name, subject: `Reminder: ${title}`.slice(0, 190), body: message, status: ok ? 'QUEUED' : 'SKIPPED', provider: ok ? 'SMTP' : null, error: ok ? null : 'Email not configured in School Settings' });
    }
  }
  if (!rows.length) return;
  await prisma.outboundMessage.createMany({ data: rows.map((r) => ({ ...r, schoolId, sentById, batchId: `reminder-${Date.now()}` })) });
  const { dispatchQueued } = await import('./messaging');
  void dispatchQueued(schoolId).catch((e) => console.error('[reminders] outbox dispatch failed', e));
}

/** Lazy fallback when no cron is configured: run at most once a minute per school. */
export async function maybeDispatchReminders(schoolId: string): Promise<void> {
  try {
    const pending = await prisma.reminder.count({ where: { schoolId, status: 'SCHEDULED', remindAt: { lte: new Date() } } });
    if (!pending) return;
    const rl = await rateLimit(`reminders:${schoolId}`, 1, 60);
    if (!rl.ok) return;
    await dispatchDueReminders({ schoolId, limit: 20 });
  } catch (e) {
    console.error('[reminders] lazy dispatch failed', e);
  }
}
