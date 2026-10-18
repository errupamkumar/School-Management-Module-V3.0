import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route, type Ctx } from '@/server/api';
import { displayName } from '@/server/common';
import { assertSectionAccess, hasSchoolWideScope, teacherSectionIds } from '@/server/scope';
import { gradeAttempt, GRACE_MS, OBJECTIVE, readQuestions } from '@/server/services/online-exams';

async function managed(ctx: Ctx, id: string) {
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') throw forbidden();
  const e = await ctx.db.onlineExam.findUnique({ where: { id } });
  if (!e) throw notFound('Exam');
  if (!hasSchoolWideScope(ctx) && e.createdById !== ctx.user.id) {
    if (e.sectionId) await assertSectionAccess(ctx, e.sectionId);
    else if (!(await ctx.db.section.count({ where: { id: { in: await teacherSectionIds(ctx) }, classId: e.classId } }))) throw notFound('Exam');
  }
  return e;
}

/** Answer sheets with scores; expired in-progress attempts are closed on the way. */
export const GET = route({ module: 'online_exams' }, async (ctx, _req, { id }) => {
  const e = await managed(ctx, id);
  const questions = readQuestions(e.questions);
  const expired = await ctx.db.onlineExamAttempt.findMany({ where: { examId: id, status: 'IN_PROGRESS', deadline: { lt: new Date(Date.now() - GRACE_MS) } } });
  for (const a of expired) {
    const g = gradeAttempt(questions, (a.answers ?? {}) as Record<string, string>, Number(e.negativeMarks));
    await ctx.db.onlineExamAttempt.update({ where: { id: a.id }, data: { submittedAt: a.deadline, autoScore: g.autoScore, score: g.needsManual ? null : g.autoScore, status: g.needsManual ? 'SUBMITTED' : 'GRADED' } });
  }
  const [attempts, roster] = await Promise.all([
    ctx.db.onlineExamAttempt.findMany({ where: { examId: id }, include: { student: { select: { firstName: true, lastName: true, admissionNo: true, rollNo: true } } }, orderBy: { startedAt: 'asc' } }),
    ctx.db.student.count({ where: { status: 'ACTIVE', classId: e.classId, ...(e.sectionId ? { sectionId: e.sectionId } : {}) } }),
  ]);
  const descriptive = questions.filter((q) => !OBJECTIVE.has(q.type));
  return {
    roster,
    totalMarks: e.totalMarks,
    descriptive: descriptive.map((q) => ({ id: q.id, text: q.text, marks: q.marks, key: q.answer })),
    attempts: attempts.map((a) => ({
      id: a.id,
      studentName: displayName(a.student),
      admissionNo: a.student.admissionNo,
      rollNo: a.student.rollNo,
      status: a.status,
      startedAt: a.startedAt,
      submittedAt: a.submittedAt,
      autoScore: a.autoScore,
      score: a.score,
      manualMarks: a.manualMarks ?? {},
      // Descriptive answers for marking.
      written: Object.fromEntries(descriptive.map((q) => [q.id, ((a.answers ?? {}) as Record<string, string>)[q.id] ?? ''])),
    })),
  };
});

/** Teacher marks the descriptive answers; total = auto marks + teacher marks. */
export const PATCH = route({ module: 'online_exams', action: 'edit' }, async (ctx, req, { id }) => {
  const e = await managed(ctx, id);
  const input = await body(req, z.object({ attemptId: z.string().min(1), marks: z.record(z.string(), z.coerce.number().min(0)) }));
  const a = await ctx.db.onlineExamAttempt.findFirst({ where: { id: input.attemptId, examId: id } });
  if (!a) throw notFound('Attempt');
  if (a.status === 'IN_PROGRESS') throw badRequest('The student is still writing.');
  const questions = readQuestions(e.questions);
  const manual: Record<string, number> = { ...((a.manualMarks ?? {}) as Record<string, number>) };
  for (const [qid, m] of Object.entries(input.marks)) {
    const q = questions.find((x) => x.id === qid);
    if (!q || OBJECTIVE.has(q.type)) throw badRequest('Only written answers are marked by hand.');
    if (m > q.marks) throw badRequest(`At most ${q.marks} marks for that question.`);
    manual[qid] = m;
  }
  const pending = questions.filter((q) => !OBJECTIVE.has(q.type) && ((a.answers ?? {}) as Record<string, string>)[q.id]?.trim() && manual[q.id] === undefined);
  const score = Number(a.autoScore ?? 0) + Object.values(manual).reduce((x, y) => x + y, 0);
  const row = await ctx.db.onlineExamAttempt.update({ where: { id: a.id }, data: { manualMarks: manual, score: pending.length ? null : Math.round(score * 100) / 100, status: pending.length ? 'SUBMITTED' : 'GRADED' } });
  await ctx.audit('UPDATE', 'OnlineExamAttempt', a.id, `Marked ${Object.keys(input.marks).length} answers (${pending.length} left)`);
  return row;
});
