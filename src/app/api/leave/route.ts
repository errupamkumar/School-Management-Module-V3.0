import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, route } from '@/server/api';
import { dayUTC, displayName, classLabel } from '@/server/common';
import { classTeacherSectionIds, hasSchoolWideScope, ownClassSectionPairs } from '@/server/scope';
import { notifyRoles, notifyUsers } from '@/server/services/notify';

/**
 * ?view=mine     my own applications (staff) / my children's (parents)
 * ?view=approve  applications I can approve: admins → all; class teachers → their students
 */
export const GET = route({ module: 'leave' }, async (ctx, req) => {
  const view = req.nextUrl.searchParams.get('view') ?? 'mine';
  let where: Prisma.LeaveRequestWhereInput;
  if (view === 'approve') {
    if (ctx.can('leave', 'edit') && hasSchoolWideScope(ctx)) where = {};
    else if (ctx.user.role === 'TEACHER') {
      const sections = await classTeacherSectionIds(ctx);
      const ids = (await ctx.db.student.findMany({ where: { sectionId: { in: sections } }, select: { id: true } })).map((s) => s.id);
      where = { studentId: { in: ids } };
    } else throw forbidden();
  } else {
    where = { applicantId: ctx.user.id };
  }
  const rows = await ctx.db.leaveRequest.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 300 });
  const [students, employees, applicants] = await Promise.all([
    ctx.db.student.findMany({ where: { id: { in: rows.map((r) => r.studentId).filter(Boolean) as string[] } }, select: { id: true, firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } }),
    ctx.db.employee.findMany({ where: { id: { in: rows.map((r) => r.employeeId).filter(Boolean) as string[] } }, select: { id: true, firstName: true, lastName: true, designation: true } }),
    ctx.db.user.findMany({ where: { id: { in: rows.map((r) => r.applicantId) } }, select: { id: true, name: true } }),
  ]);
  return rows.map((r) => {
    const s = students.find((x) => x.id === r.studentId);
    const e = employees.find((x) => x.id === r.employeeId);
    const days = Math.round((r.toDate.getTime() - r.fromDate.getTime()) / 86_400_000) + 1;
    return { ...r, days, forName: s ? displayName(s) : e ? displayName(e) : '—', forDetail: s ? classLabel(s.class, s.section) : e?.designation ?? '', kind: s ? 'STUDENT' : 'STAFF', applicantName: applicants.find((a) => a.id === r.applicantId)?.name ?? '' };
  });
});

export const POST = route({ module: 'leave', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      leaveType: z.enum(['SICK', 'CASUAL', 'EARNED', 'FAMILY', 'MATERNITY', 'OTHER']),
      fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      reason: z.string().trim().min(3).max(1000),
      studentId: z.string().optional().nullable(),
    })
  );
  if (input.toDate < input.fromDate) throw badRequest('“To” date is before “from” date.');
  let studentId: string | null = null;
  let employeeId: string | null = null;
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    const p = input.studentId ? pairs.find((x) => x.studentId === input.studentId) : pairs[0];
    if (!p) throw forbidden();
    studentId = p.studentId;
  } else {
    if (!ctx.user.employeeId) throw badRequest('Only employees can apply for staff leave.');
    employeeId = ctx.user.employeeId;
  }
  const overlap = await ctx.db.leaveRequest.count({ where: { ...(studentId ? { studentId } : { employeeId }), status: { in: ['PENDING', 'APPROVED'] }, fromDate: { lte: dayUTC(input.toDate) }, toDate: { gte: dayUTC(input.fromDate) } } });
  if (overlap) throw badRequest('There is already a leave application for these dates.');
  const row = await ctx.db.leaveRequest.create({ data: { schoolId: ctx.user.schoolId, applicantId: ctx.user.id, studentId, employeeId, leaveType: input.leaveType, fromDate: dayUTC(input.fromDate), toDate: dayUTC(input.toDate), reason: input.reason } });
  if (studentId) {
    const s = await ctx.db.student.findUnique({ where: { id: studentId }, select: { section: { select: { classTeacher: { select: { userId: true } } } } } });
    await notifyUsers(ctx.db, ctx.user.schoolId, [s?.section.classTeacher?.userId], { title: 'Leave application', body: `${ctx.user.name}: ${input.fromDate} to ${input.toDate}`, link: '/leave' });
  } else {
    await notifyRoles(ctx.db, ctx.user.schoolId, ['ADMIN'], { title: 'Staff leave application', body: `${ctx.user.name}: ${input.fromDate} to ${input.toDate}`, link: '/leave' });
  }
  await ctx.audit('CREATE', 'LeaveRequest', row.id, `${input.leaveType} ${input.fromDate}→${input.toDate}`);
  return row;
});
