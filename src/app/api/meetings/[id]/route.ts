import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { hasSchoolWideScope } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

/** Host confirms/declines/completes; requester may cancel or reschedule while pending. */
export const PATCH = route({ module: 'meetings' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      status: z.enum(['CONFIRMED', 'DECLINED', 'COMPLETED', 'CANCELLED']).optional(),
      scheduledAt: z.string().optional(),
      meetingUrl: z.url().optional().nullable(),
      outcome: z.string().trim().max(2000).optional().nullable(),
    })
  );
  const m = await ctx.db.meeting.findUniqueOrThrow({ where: { id } });
  const isHost = m.withUserId === ctx.user.id || (hasSchoolWideScope(ctx) && ctx.can('meetings', 'edit'));
  const isRequester = m.requestedById === ctx.user.id;
  if (!isHost && !isRequester) throw forbidden();
  if (input.status && ['CONFIRMED', 'DECLINED', 'COMPLETED'].includes(input.status) && !isHost) throw forbidden('Only the host can confirm, decline or complete.');
  if (input.status === 'CANCELLED' && !isRequester && !isHost) throw forbidden();
  if ((m.status === 'COMPLETED' || m.status === 'CANCELLED') && input.status !== 'COMPLETED') throw badRequest('This meeting is closed.');
  if (input.meetingUrl && !/^https:\/\//.test(input.meetingUrl)) throw badRequest('Meeting link must use https.');
  const updated = await ctx.db.meeting.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt), status: isHost ? 'CONFIRMED' : 'REQUESTED' } : {}),
      ...(input.meetingUrl !== undefined ? { meetingUrl: input.meetingUrl } : {}),
      ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
    },
  });
  const other = isRequester ? m.withUserId : m.requestedById;
  await notifyUsers(ctx.db, ctx.user.schoolId, [other], { title: `Meeting ${updated.status.toLowerCase()}: ${m.topic}`, body: `${ctx.user.name} updated the meeting.`, link: '/meetings' });
  await ctx.audit('UPDATE', 'Meeting', id, JSON.stringify(input));
  return updated;
});
