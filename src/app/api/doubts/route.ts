import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { body, forbidden, owned, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { studentWhere } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

/** Doubt desk: students ask, teachers of their sections answer. Visibility follows the student scope. */
export const GET = route({ module: 'study_tools' }, async (ctx, req) => {
  const q = query(req, z.object({ status: z.enum(['OPEN', 'ANSWERED', 'CLOSED', 'ALL']).default('ALL'), studentId: z.string().optional() }));
  const students = await ctx.db.student.findMany({ where: { AND: [await studentWhere(ctx), q.studentId ? { id: q.studentId } : {}] }, select: { id: true } });
  const where: Prisma.DoubtWhereInput = { studentId: { in: students.map((s) => s.id) }, ...(q.status !== 'ALL' ? { status: q.status } : {}) };
  const rows = await ctx.db.doubt.findMany({ where, orderBy: [{ status: 'asc' }, { createdAt: 'desc' }], take: 200 });
  const [kids, subjects] = await Promise.all([
    ctx.db.student.findMany({ where: { id: { in: rows.map((r) => r.studentId) } }, select: { id: true, firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } }),
    ctx.db.subject.findMany({ where: { id: { in: rows.map((r) => r.subjectId).filter((x): x is string => !!x) } }, select: { id: true, name: true } }),
  ]);
  return rows.map((r) => {
    const k = kids.find((x) => x.id === r.studentId);
    return { ...r, studentName: k ? displayName(k) : '', classLabel: k ? classLabel(k.class, k.section) : '', subject: subjects.find((s) => s.id === r.subjectId)?.name ?? null, mine: r.askedById === ctx.user.id };
  });
});

export const POST = route({ module: 'study_tools', action: 'create' }, async (ctx, req) => {
  if (ctx.user.role !== 'STUDENT' || !ctx.user.studentId) throw forbidden('Only students can ask on the doubt desk.');
  const input = await body(req, z.object({ subjectId: z.string().optional().nullable(), question: z.string().trim().min(10, 'Describe the doubt in a little more detail').max(2000) }));
  if (input.subjectId) await owned(ctx.db.subject, input.subjectId, 'subject');
  const open = await ctx.db.doubt.count({ where: { studentId: ctx.user.studentId, status: 'OPEN' } });
  if (open >= 10) throw forbidden('You already have 10 open doubts. Close answered ones first.');
  const d = await ctx.db.doubt.create({ data: { schoolId: ctx.user.schoolId, studentId: ctx.user.studentId, askedById: ctx.user.id, subjectId: input.subjectId || null, question: input.question } });
  // Tell the class teacher and subject teachers of the student's section.
  const s = await ctx.db.student.findUniqueOrThrow({ where: { id: ctx.user.studentId }, select: { sectionId: true, section: { select: { classTeacher: { select: { userId: true } } } } } });
  const teachers = await ctx.db.teacherAssignment.findMany({ where: { sectionId: s.sectionId, ...(input.subjectId ? { subjectId: input.subjectId } : {}) }, select: { employee: { select: { userId: true } } } });
  await notifyUsers(ctx.db, ctx.user.schoolId, [s.section.classTeacher?.userId, ...teachers.map((t) => t.employee.userId)], { title: 'New doubt from a student', body: input.question.slice(0, 140), link: '/study-tools' });
  return d;
});
