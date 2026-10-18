import { z } from 'zod';
import { body, route } from '@/server/api';
import { maybeDispatchReminders } from '@/server/services/reminders';

export const GET = route({ authenticated: true }, async (ctx, req) => {
  // Reminders still go out without a cron: due ones are sent when users are active.
  void maybeDispatchReminders(ctx.user.schoolId);
  const all = req.nextUrl.searchParams.get('all') === '1';
  const [items, unread] = await Promise.all([
    ctx.db.notification.findMany({ where: { userId: ctx.user.id }, orderBy: { createdAt: 'desc' }, take: all ? 200 : 20 }),
    ctx.db.notification.count({ where: { userId: ctx.user.id, isRead: false } }),
  ]);
  return { items, unread };
});

export const PATCH = route({ authenticated: true }, async (ctx, req) => {
  const input = await body(req, z.object({ all: z.boolean().optional(), ids: z.array(z.string().max(40)).max(200).optional() }));
  const where = input.all ? { userId: ctx.user.id, isRead: false } : { userId: ctx.user.id, id: { in: input.ids ?? [] } };
  const res = await ctx.db.notification.updateMany({ where, data: { isRead: true } });
  return { updated: res.count };
});
