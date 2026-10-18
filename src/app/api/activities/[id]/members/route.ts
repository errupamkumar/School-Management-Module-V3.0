import { z } from 'zod';
import { badRequest, body, conflict, forbidden, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertCanManage, isFamily, promoteWaitlist } from '@/server/resources/activities';
import { assertStudentAccess } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

export const GET = route({ module: 'activities' }, async (ctx, _req, { id }) => {
  if (isFamily(ctx)) throw forbidden();
  const rows = await ctx.db.activityMember.findMany({ where: { activityId: id, status: { not: 'LEFT' } }, orderBy: [{ status: 'asc' }, { createdAt: 'asc' }] });
  const kids = await ctx.db.student.findMany({ where: { id: { in: rows.map((r) => r.studentId) } }, select: { id: true, firstName: true, lastName: true, admissionNo: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } } });
  return rows.map((r) => {
    const s = kids.find((k) => k.id === r.studentId);
    return { ...r, name: s ? displayName(s) : 'Unknown', admissionNo: s?.admissionNo, classLabel: s ? classLabel(s.class, s.section) : '', photoUrl: s?.photoUrl ?? null };
  });
});

/** Join (students for themselves) or enrol a student (staff). Full activities put new members on the waitlist. */
export const POST = route({ module: 'activities', action: 'create' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ studentId: z.string().optional() }));
  let studentId: string;
  if (ctx.user.role === 'STUDENT') {
    studentId = ctx.user.studentId ?? '';
    if (!studentId) throw forbidden();
  } else {
    await assertCanManage(ctx, id);
    if (!input.studentId) throw badRequest('Choose a student.');
    studentId = input.studentId;
    await assertStudentAccess(ctx, studentId);
  }
  const a = await ctx.db.activity.findUniqueOrThrow({ where: { id }, select: { name: true, capacity: true, isActive: true } });
  if (!a.isActive) throw conflict('This activity is not taking members right now.');
  const existing = await ctx.db.activityMember.findUnique({ where: { activityId_studentId: { activityId: id, studentId } } });
  if (existing && existing.status !== 'LEFT') throw conflict(existing.status === 'WAITLISTED' ? 'Already on the waitlist.' : 'Already a member.');
  const enrolled = await ctx.db.activityMember.count({ where: { activityId: id, status: 'ENROLLED' } });
  const status = a.capacity != null && enrolled >= a.capacity ? 'WAITLISTED' : 'ENROLLED';
  const m = existing
    ? await ctx.db.activityMember.update({ where: { id: existing.id }, data: { status, createdAt: new Date() } })
    : await ctx.db.activityMember.create({ data: { schoolId: ctx.user.schoolId, activityId: id, studentId, status } });
  await ctx.audit('CREATE', 'ActivityMember', m.id, `${a.name}: ${status.toLowerCase()}`);
  return m;
});

/** Update a member's status or achievement (staff). */
export const PATCH = route({ module: 'activities', action: 'edit' }, async (ctx, req, { id }) => {
  await assertCanManage(ctx, id);
  const input = await body(req, z.object({ memberId: z.string(), status: z.enum(['ENROLLED', 'WAITLISTED', 'LEFT']).optional(), achievement: z.string().trim().max(200).optional().nullable() }));
  const m = await ctx.db.activityMember.findFirstOrThrow({ where: { id: input.memberId, activityId: id } });
  const updated = await ctx.db.activityMember.update({ where: { id: m.id }, data: { ...(input.status ? { status: input.status } : {}), ...(input.achievement !== undefined ? { achievement: input.achievement || null } : {}) } });
  if (input.achievement && input.achievement !== m.achievement) {
    const s = await ctx.db.student.findUnique({ where: { id: m.studentId }, select: { userId: true, guardian: { select: { userId: true } } } });
    const act = await ctx.db.activity.findUniqueOrThrow({ where: { id }, select: { name: true } });
    await notifyUsers(ctx.db, ctx.user.schoolId, [s?.userId, s?.guardian?.userId], { title: `Achievement in ${act.name}`, body: input.achievement, link: '/activities' });
  }
  if (input.status === 'LEFT' && m.status === 'ENROLLED') await promoteWaitlist(ctx, id);
  await ctx.audit('UPDATE', 'ActivityMember', m.id, input.achievement ?? input.status ?? null);
  return updated;
});

/** Leave (students themselves) or remove (staff). */
export const DELETE = route({ module: 'activities' }, async (ctx, req, { id }) => {
  const q = query(req, z.object({ memberId: z.string().optional() }));
  let m;
  if (ctx.user.role === 'STUDENT') {
    m = await ctx.db.activityMember.findFirstOrThrow({ where: { activityId: id, studentId: ctx.user.studentId ?? '__none__', status: { not: 'LEFT' } } });
  } else {
    ctx.require('activities', 'edit');
    await assertCanManage(ctx, id);
    m = await ctx.db.activityMember.findFirstOrThrow({ where: { id: q.memberId ?? '__none__', activityId: id } });
  }
  await ctx.db.activityMember.update({ where: { id: m.id }, data: { status: 'LEFT' } });
  if (m.status === 'ENROLLED') await promoteWaitlist(ctx, id);
  await ctx.audit('UPDATE', 'ActivityMember', m.id, 'left');
  return { left: true };
});
