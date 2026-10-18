import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { assertSectionAccess, assertStudentAccess, hasSchoolWideScope } from '@/server/scope';
import { computeClassResults } from '@/server/services/exams';

/** Class / section result sheet, or one student's result (family portal: published exams only). */
export const GET = route({ module: 'exams' }, async (ctx, req, { id }) => {
  const q = query(req, z.object({ classId: z.string().optional(), sectionId: z.string().optional(), studentId: z.string().optional() }));
  const exam = await ctx.db.exam.findUniqueOrThrow({ where: { id } });
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  if (family && !exam.isPublished) throw forbidden('Results are not published yet.');

  if (q.studentId) {
    await assertStudentAccess(ctx, q.studentId);
    const s = await ctx.db.student.findUniqueOrThrow({ where: { id: q.studentId }, select: { classId: true } });
    const res = await computeClassResults(ctx.db, ctx.school.settings, id, s.classId);
    const mine = res.results.find((r) => r.studentId === q.studentId) ?? null;
    return { exam, subjects: res.subjects, result: mine, classSize: res.results.length, showRank: ctx.school.settings.exams.showRank };
  }

  if (family) throw forbidden();
  let classId = q.classId;
  if (q.sectionId) {
    await assertSectionAccess(ctx, q.sectionId);
    classId = (await ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, select: { classId: true } })).classId;
  } else if (!hasSchoolWideScope(ctx)) {
    throw forbidden('Choose one of your sections.');
  }
  if (!classId) throw forbidden('Choose a class.');
  const cls = await ctx.db.class.findUniqueOrThrow({ where: { id: classId }, select: { name: true } });
  const res = await computeClassResults(ctx.db, ctx.school.settings, id, classId, { sectionId: q.sectionId });
  const complete = res.results.filter((r) => r.result !== 'INCOMPLETE');
  return {
    exam,
    classLabel: classLabel(cls),
    subjects: res.subjects,
    results: res.results,
    summary: {
      students: res.results.length,
      passed: complete.filter((r) => r.result === 'PASS').length,
      failed: complete.filter((r) => r.result === 'FAIL').length,
      incomplete: res.results.length - complete.length,
      average: complete.length ? Math.round((complete.reduce((a, r) => a + r.percentage, 0) / complete.length) * 10) / 10 : null,
      topper: complete.sort((a, b) => b.percentage - a.percentage)[0]?.name ?? null,
      subjectAverages: res.subjects.map((s) => {
        const vals = res.results.map((r) => r.subjects.find((x) => x.subjectId === s.id)).filter((x) => x && x.marks !== null) as Array<{ marks: number }>;
        return { subject: s.name, average: vals.length ? Math.round((vals.reduce((a, v) => a + v.marks, 0) / vals.length / s.maxMarks) * 1000) / 10 : null };
      }),
    },
  };
});
