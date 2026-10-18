import { z } from 'zod';
import { badRequest, body, forbidden, route, type Ctx } from '@/server/api';
import { displayName } from '@/server/common';
import { hasSchoolWideScope, teacherSectionIds } from '@/server/scope';

async function loadTest(ctx: Ctx, id: string) {
  const t = await ctx.db.classTest.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    if (!t.sectionId || !secs.includes(t.sectionId)) throw forbidden('You do not teach this section.');
  } else if (!hasSchoolWideScope(ctx)) throw forbidden();
  return t;
}

export const GET = route({ module: 'class_tests' }, async (ctx, _req, { id }) => {
  const t = await loadTest(ctx, id);
  const [students, marks] = await Promise.all([
    ctx.db.student.findMany({ where: { classId: t.classId, ...(t.sectionId ? { sectionId: t.sectionId } : {}), status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, rollNo: true } }),
    ctx.db.classTestMark.findMany({ where: { testId: id } }),
  ]);
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  return { test: t, rows: students.map((s) => ({ studentId: s.id, name: displayName(s), rollNo: s.rollNo, marks: marks.find((m) => m.studentId === s.id)?.marks ?? null, isAbsent: marks.find((m) => m.studentId === s.id)?.isAbsent ?? false })) };
});

export const PUT = route({ module: 'class_tests', action: 'create' }, async (ctx, req, { id }) => {
  const t = await loadTest(ctx, id);
  const input = await body(req, z.object({ entries: z.array(z.object({ studentId: z.string(), marks: z.coerce.number().min(0).nullable(), isAbsent: z.boolean().default(false) })).min(1).max(200) }));
  if (input.entries.some((e) => !e.isAbsent && e.marks !== null && e.marks > Number(t.maxMarks))) throw badRequest(`Marks cannot exceed ${Number(t.maxMarks)}.`);
  const valid = await ctx.db.student.count({ where: { id: { in: input.entries.map((e) => e.studentId) }, classId: t.classId, ...(t.sectionId ? { sectionId: t.sectionId } : {}) } });
  if (valid !== new Set(input.entries.map((e) => e.studentId)).size) throw badRequest('Some students are not in this class.');
  await ctx.db.$transaction(
    input.entries.map((e) =>
      ctx.db.classTestMark.upsert({
        where: { testId_studentId: { testId: id, studentId: e.studentId } },
        update: { marks: e.isAbsent ? null : e.marks, isAbsent: e.isAbsent },
        create: { schoolId: ctx.user.schoolId, testId: id, studentId: e.studentId, marks: e.isAbsent ? null : e.marks, isAbsent: e.isAbsent },
      })
    )
  );
  await ctx.audit('UPDATE', 'ClassTestMark', id, `${input.entries.length} marks`);
  return { saved: input.entries.length };
});
