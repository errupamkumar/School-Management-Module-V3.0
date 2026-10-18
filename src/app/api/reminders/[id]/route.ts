import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route } from '@/server/api';

/** Cancel, resume or reschedule (owner, or a manager with the edit right). */
export const PATCH = route({ module: 'reminders' }, async (ctx, req, { id }) => {
  const r = await ctx.db.reminder.findUnique({ where: { id } });
  if (!r) throw notFound('Reminder');
  if (r.createdById !== ctx.user.id && !ctx.can('reminders', 'edit')) throw forbidden();
  const input = await body(req, z.object({ status: z.enum(['SCHEDULED', 'CANCELLED']).optional(), remindAt: z.string().datetime({ offset: true }).optional(), title: z.string().trim().min(2).max(120).optional(), message: z.string().trim().min(1).max(2000).optional() }));
  const data: Record<string, unknown> = { ...input };
  if (input.remindAt) {
    const at = new Date(input.remindAt);
    if (at.getTime() < Date.now() - 60_000) throw badRequest('Choose a time in the future.');
    data.remindAt = at;
  }
  if (input.status === 'SCHEDULED' && !input.remindAt && r.remindAt < new Date()) throw badRequest('Pick a new time to resume this reminder.');
  if (!Object.keys(data).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.reminder.update({ where: { id }, data });
  await ctx.audit('UPDATE', 'Reminder', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'reminders' }, async (ctx, _req, { id }) => {
  const r = await ctx.db.reminder.findUnique({ where: { id } });
  if (!r) throw notFound('Reminder');
  if (r.createdById !== ctx.user.id && !ctx.can('reminders', 'delete')) throw forbidden();
  await ctx.db.reminder.delete({ where: { id } });
  await ctx.audit('DELETE', 'Reminder', id, r.title);
  return { deleted: true };
});
