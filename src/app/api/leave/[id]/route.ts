import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { classTeacherSectionIds, hasSchoolWideScope } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

export const PATCH = route({ module: 'leave' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ status: z.enum(['APPROVED', 'REJECTED', 'CANCELLED']), reviewNote: z.string().trim().max(500).optional().nullable() }));
  const l = await ctx.db.leaveRequest.findUniqueOrThrow({ where: { id } });
  if (input.status === 'CANCELLED') {
    if (l.applicantId !== ctx.user.id) throw forbidden('Only the applicant can withdraw an application.');
    if (l.status !== 'PENDING') throw badRequest('Only pending applications can be withdrawn.');
  } else {
    const admin = ctx.can('leave', 'edit') && hasSchoolWideScope(ctx);
    let classTeacher = false;
    if (!admin && ctx.user.role === 'TEACHER' && l.studentId && ctx.can('leave', 'edit')) {
      const s = await ctx.db.student.findUnique({ where: { id: l.studentId }, select: { sectionId: true } });
      classTeacher = !!s && (await classTeacherSectionIds(ctx)).includes(s.sectionId);
    }
    if (!admin && !classTeacher) throw forbidden('You cannot review this application.');
    if (l.applicantId === ctx.user.id) throw forbidden('You cannot approve your own leave.');
    if (l.status !== 'PENDING') throw badRequest('This application has already been reviewed.');
  }
  const updated = await ctx.db.leaveRequest.update({ where: { id }, data: { status: input.status, reviewNote: input.reviewNote ?? null, reviewedById: input.status === 'CANCELLED' ? null : ctx.user.id } });
  if (input.status !== 'CANCELLED') await notifyUsers(ctx.db, ctx.user.schoolId, [l.applicantId], { title: `Leave ${input.status.toLowerCase()}`, body: input.reviewNote ?? `${l.fromDate.toISOString().slice(0, 10)} to ${l.toDate.toISOString().slice(0, 10)}`, link: '/leave' });
  await ctx.audit('UPDATE', 'LeaveRequest', id, `${input.status}${input.reviewNote ? `: ${input.reviewNote}` : ''}`);
  return updated;
});
