import webpush from 'web-push';
import { prisma } from '../db';
import { env } from '../env';
import { readSettings } from '../settings';

let configured: boolean | null = null;

/** True when VAPID keys are set; push is silently skipped otherwise. */
export function pushConfigured(): boolean {
  if (configured === null) {
    const pub = env.vapidPublicKey();
    const priv = env.vapidPrivateKey();
    configured = !!pub && !!priv;
    if (configured) webpush.setVapidDetails(env.vapidSubject(), pub, priv);
  }
  return configured;
}

const enabledCache = new Map<string, { at: number; on: boolean }>();
async function schoolPushOn(schoolId: string): Promise<boolean> {
  const hit = enabledCache.get(schoolId);
  if (hit && Date.now() - hit.at < 60_000) return hit.on;
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { settings: true } });
  const on = readSettings(s?.settings).notifications.pushEnabled;
  enabledCache.set(schoolId, { at: Date.now(), on });
  return on;
}

export interface PushPayload {
  title: string;
  body: string;
  link?: string | null;
}

/**
 * Sends a phone notification to every device the users installed the app on.
 * Never throws: push is best-effort on top of the in-app notification.
 * Subscriptions the push service reports as gone (404/410) are deleted.
 */
export async function sendPush(schoolId: string, userIds: string[], payload: PushPayload): Promise<number> {
  try {
    if (!userIds.length || !pushConfigured() || !(await schoolPushOn(schoolId))) return 0;
    const subs = await prisma.pushSubscription.findMany({ where: { schoolId, userId: { in: userIds } } });
    if (!subs.length) return 0;
    const body = JSON.stringify({ title: payload.title.slice(0, 120), body: payload.body.slice(0, 300), link: payload.link ?? '/notifications' });
    let sent = 0;
    const gone: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 6 * 3600, urgency: 'high' });
          sent++;
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) gone.push(s.id);
        }
      })
    );
    if (gone.length) await prisma.pushSubscription.deleteMany({ where: { id: { in: gone } } });
    if (sent) await prisma.pushSubscription.updateMany({ where: { id: { in: subs.filter((s) => !gone.includes(s.id)).map((s) => s.id) } }, data: { lastUsedAt: new Date() } });
    return sent;
  } catch (e) {
    console.error('[push] send failed', (e as Error).message);
    return 0;
  }
}
