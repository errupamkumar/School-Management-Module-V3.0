import { z } from 'zod';
import { badRequest, body, forbidden, query, route } from '@/server/api';
import { audienceSchema, checkAudience, readAudience } from '@/server/services/audience';
import { maybeDispatchReminders } from '@/server/services/reminders';

/** My reminders, plus every reminder for managers (?scope=all). */
export const GET = route({ module: 'reminders' }, async (ctx, req) => {
  void maybeDispatchReminders(ctx.user.schoolId);
  const q = query(req, z.object({ scope: z.enum(['mine', 'all']).default('mine'), status: z.enum(['SCHEDULED', 'SENT', 'CANCELLED', 'ALL']).default('ALL') }));
  const all = q.scope === 'all' && ctx.can('reminders', 'edit');
  const rows = await ctx.db.reminder.findMany({
    where: { ...(all ? {} : { createdById: ctx.user.id }), ...(q.status !== 'ALL' ? { status: q.status } : {}) },
    orderBy: [{ status: 'asc' }, { remindAt: 'asc' }],
    take: 500,
  });
  return rows.map((r) => ({ ...r, mine: r.createdById === ctx.user.id }));
});

/**
 * Personal reminders need the create right; reminding other people (roles or
 * classes) needs the edit right. SMS and email copies use the school's gateways.
 */
export const POST = route({ module: 'reminders', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      title: z.string().trim().min(2).max(120),
      message: z.string().trim().min(1).max(2000),
      remindAt: z.string().datetime({ offset: true }),
      repeat: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY']).default('NONE'),
      forSelf: z.boolean().default(true),
      audience: audienceSchema.optional(),
      channels: z.array(z.enum(['APP', 'SMS', 'EMAIL'])).min(1).max(3).default(['APP']),
    })
  );
  const remindAt = new Date(input.remindAt);
  if (remindAt.getTime() < Date.now() - 60_000) throw badRequest('Choose a time in the future.');
  if (remindAt.getTime() > Date.now() + 400 * 86_400_000) throw badRequest('Reminders can be set up to about a year ahead.');
  let audience: unknown = { self: true };
  if (!input.forSelf) {
    if (!ctx.can('reminders', 'edit')) throw forbidden('You can set reminders for yourself. Ask an admin for the right to remind others.');
    if (!input.audience) throw badRequest('Choose who to remind.');
    audience = await checkAudience(ctx, input.audience);
  }
  const row = await ctx.db.reminder.create({
    data: { schoolId: ctx.user.schoolId, title: input.title, message: input.message, remindAt, repeat: input.repeat, audience: audience as object, channels: [...new Set(input.channels)], createdById: ctx.user.id, createdByName: ctx.user.name },
  });
  await ctx.audit('CREATE', 'Reminder', row.id, `${input.title} @ ${remindAt.toISOString()} (${input.forSelf ? 'self' : readAudience(audience).roles.join(', ')})`);
  return row;
});
