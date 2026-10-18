import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { hasSchoolWideScope, ownClassSectionPairs } from '@/server/scope';
import { canContact } from '@/server/services/contacts';
import { notifyUsers } from '@/server/services/notify';

/** Parent–teacher / principal meetings involving the user (admins see all). */
export const GET = route({ module: 'meetings' }, async (ctx) => {
  const all = hasSchoolWideScope(ctx) && ctx.can('meetings', 'edit');
  const rows = await ctx.db.meeting.findMany({
    where: all ? {} : { OR: [{ requestedById: ctx.user.id }, { withUserId: ctx.user.id }] },
    orderBy: { scheduledAt: 'desc' },
    take: 200,
  });
  const students = await ctx.db.student.findMany({ where: { id: { in: rows.map((r) => r.studentId).filter(Boolean) as string[] } }, select: { id: true, firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } });
  return rows.map((r) => {
    const s = students.find((x) => x.id === r.studentId);
    return { ...r, student: s ? `${displayName(s)} (${classLabel(s.class, s.section)})` : null, mine: r.requestedById === ctx.user.id, iAmHost: r.withUserId === ctx.user.id };
  });
});

export const POST = route({ module: 'meetings', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      withUserId: z.string().min(1),
      studentId: z.string().optional().nullable(),
      topic: z.string().trim().min(3).max(150),
      agenda: z.string().trim().max(2000).optional().nullable(),
      mode: z.enum(['IN_PERSON', 'VIDEO', 'PHONE']).default('IN_PERSON'),
      scheduledAt: z.string().min(10),
      durationMins: z.coerce.number().int().min(5).max(120).default(15),
    })
  );
  if (!(await canContact(ctx, input.withUserId))) throw forbidden('You cannot book a meeting with this person.');
  const target = await ctx.db.user.findUniqueOrThrow({ where: { id: input.withUserId }, select: { id: true, name: true, role: true } });
  if (ctx.user.role === 'PARENT' && (target.role === 'PARENT' || target.role === 'STUDENT')) throw forbidden();
  const when = new Date(input.scheduledAt);
  if (Number.isNaN(when.getTime()) || when < new Date()) throw badRequest('Choose a future date and time.');
  if (input.studentId && ctx.user.role === 'PARENT') {
    const mine = (await ownClassSectionPairs(ctx)).map((p) => p.studentId);
    if (!mine.includes(input.studentId)) throw forbidden();
  }
  // Avoid double-booking the host.
  const clash = await ctx.db.meeting.findFirst({
    where: { withUserId: input.withUserId, status: { in: ['REQUESTED', 'CONFIRMED'] }, scheduledAt: { gte: new Date(when.getTime() - input.durationMins * 60_000), lte: new Date(when.getTime() + input.durationMins * 60_000) } },
  });
  if (clash) throw badRequest(`${target.name} already has a meeting around that time. Please pick another slot.`);
  const m = await ctx.db.meeting.create({
    data: { schoolId: ctx.user.schoolId, requestedById: ctx.user.id, requestedByName: ctx.user.name, withUserId: target.id, withUserName: target.name, studentId: input.studentId ?? null, topic: input.topic, agenda: input.agenda ?? null, mode: input.mode, scheduledAt: when, durationMins: input.durationMins },
  });
  await notifyUsers(ctx.db, ctx.user.schoolId, [target.id], { title: `Meeting request: ${input.topic}`, body: `${ctx.user.name} requested ${when.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })}`, link: '/meetings' });
  await ctx.audit('CREATE', 'Meeting', m.id, input.topic);
  return m;
});
