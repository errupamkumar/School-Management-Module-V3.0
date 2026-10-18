import { z } from 'zod';
import { body, HttpError, route } from '@/server/api';
import { prisma } from '@/server/db';
import { env } from '@/server/env';
import { pushConfigured } from '@/server/services/push';

/** What the app needs to subscribe this device: the public VAPID key and whether the school allows push. */
export const GET = route({ authenticated: true }, async (ctx) => {
  const subscribed = await ctx.db.pushSubscription.count({ where: { userId: ctx.user.id } });
  return { available: pushConfigured() && ctx.school.settings.notifications.pushEnabled, publicKey: pushConfigured() ? env.vapidPublicKey() : null, devices: subscribed };
});

const sub = z.object({ endpoint: z.url().max(512), keys: z.object({ p256dh: z.string().min(20).max(200), auth: z.string().min(8).max(100) }) });

/** Save (or move to this user) a device's push subscription. */
export const POST = route({ authenticated: true }, async (ctx, req) => {
  if (!pushConfigured() || !ctx.school.settings.notifications.pushEnabled) throw new HttpError(403, 'Phone notifications are not enabled for your school.', 'PUSH_OFF');
  const input = await body(req, sub);
  if (!input.endpoint.startsWith('https://')) throw new HttpError(400, 'Invalid push endpoint.', 'BAD_REQUEST');
  const data = { schoolId: ctx.user.schoolId, userId: ctx.user.id, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null };
  // An endpoint belongs to one browser; a shared phone that switches accounts hands it to the newest sign-in.
  await prisma.$transaction([prisma.pushSubscription.deleteMany({ where: { endpoint: input.endpoint } }), prisma.pushSubscription.create({ data: { ...data, endpoint: input.endpoint } })]);
  return { subscribed: true };
});

/** Stop notifications on this device. */
export const DELETE = route({ authenticated: true }, async (ctx, req) => {
  const input = await body(req, z.object({ endpoint: z.string().max(512) }));
  const { count } = await ctx.db.pushSubscription.deleteMany({ where: { userId: ctx.user.id, endpoint: input.endpoint } });
  return { removed: count };
});
