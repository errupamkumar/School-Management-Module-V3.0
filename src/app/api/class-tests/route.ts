import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, owned, query, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { hasSchoolWideScope, ownClassSectionPairs, teacherSectionIds } from '@/server/scope';
import { toDate, zDate } from '@/server/crud';

export const GET = route({ module: 'class_tests' }, async (ctx, req) => {
  const q = query(req, z.object({ classId: z.string().optional(), sectionId: z.string().optional(), subjectId: z.string().optional(), studentId: z.string().optional() }));
  const and: Prisma.ClassTestWhereInput[] = [];
  if (q.classId) and.push({ classId: q.classId });
  if (q.sectionId) and.push({ OR: [{ sectionId: q.sectionId }, { sectionId: null }] });
  if (q.subjectId) and.push({ subjectId: q.subjectId });
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    const classIds = (await ctx.db.section.findMany({ where: { id: { in: secs } }, select: { classId: true } })).map((s) => s.classId);
    and.push({ OR: [{ sectionId: { in: secs } }, { sectionId: null, classId: { in: classIds } }] });
  } else if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    const pair = q.studentId ? pairs.find((p) => p.studentId === q.studentId) : pairs[0];
    if (!pair) throw forbidden();
    and.push({ classId: pair.classId, OR: [{ sectionId: null }, { sectionId: pair.sectionId }] });
    const tests = await ctx.db.classTest.findMany({ where: { AND: and }, orderBy: { testDate: 'desc' }, take: 100, include: { marks: { where: { studentId: pair.studentId } } } });
    const subjects = await ctx.db.subject.findMany({ select: { id: true, name: true } });
    return tests.map((t) => ({ id: t.id, title: t.title, testDate: t.testDate, maxMarks: t.maxMarks, subject: subjects.find((s) => s.id === t.subjectId)?.name, mine: t.marks[0] ?? null }));
  } else if (!hasSchoolWideScope(ctx)) throw forbidden();

  const tests = await ctx.db.classTest.findMany({ where: and.length ? { AND: and } : {}, orderBy: { testDate: 'desc' }, take: 300, include: { marks: { select: { marks: true, isAbsent: true } } } });
  const [subjects, classes] = await Promise.all([ctx.db.subject.findMany({ select: { id: true, name: true } }), ctx.db.class.findMany({ select: { id: true, name: true, sections: { select: { id: true, name: true } } } })]);
  return tests.map((t) => {
    const cls = classes.find((c) => c.id === t.classId);
    const sec = cls?.sections.find((s) => s.id === t.sectionId);
    const scored = t.marks.filter((m) => !m.isAbsent && m.marks !== null).map((m) => Number(m.marks));
    return {
      id: t.id,
      title: t.title,
      testDate: t.testDate,
      maxMarks: t.maxMarks,
      classId: t.classId,
      sectionId: t.sectionId,
      subjectId: t.subjectId,
      subject: subjects.find((s) => s.id === t.subjectId)?.name,
      classLabel: cls ? classLabel(cls, sec) : '',
      entered: t.marks.length,
      average: scored.length ? Math.round((scored.reduce((a, b) => a + b, 0) / scored.length) * 10) / 10 : null,
      createdById: t.createdById,
    };
  });
});

export const POST = route({ module: 'class_tests', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ classId: z.string().min(1), sectionId: z.string().optional().nullable(), subjectId: z.string().min(1), title: z.string().trim().min(2).max(100), testDate: zDate, maxMarks: z.coerce.number().min(1).max(500) }));
  await owned(ctx.db.class, input.classId, 'Class');
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  if (input.sectionId) {
    const sec = await ctx.db.section.findUnique({ where: { id: input.sectionId } });
    if (!sec || sec.classId !== input.classId) throw badRequest('Section does not belong to the class.');
    if (ctx.user.role === 'TEACHER' && !(await teacherSectionIds(ctx)).includes(input.sectionId)) throw forbidden('You do not teach this section.');
  } else if (ctx.user.role === 'TEACHER') throw badRequest('Choose one of your sections.');
  const t = await ctx.db.classTest.create({ data: { schoolId: ctx.user.schoolId, classId: input.classId, sectionId: input.sectionId || null, subjectId: input.subjectId, title: input.title, testDate: toDate(input.testDate)!, maxMarks: input.maxMarks, createdById: ctx.user.id } });
  await ctx.audit('CREATE', 'ClassTest', t.id, input.title);
  return t;
});

