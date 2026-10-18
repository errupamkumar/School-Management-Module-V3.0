import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, conflict, forbidden, notFound, query, route, type Ctx } from '@/server/api';
import { assertStudentAccess } from '@/server/scope';
import { attemptDeadline, forStudent, gradeAttempt, GRACE_MS, mcqCorrectIndex, OBJECTIVE, readQuestions, shuffled } from '@/server/services/online-exams';

/** The published exam, checked against the student's class/section. */
async function examFor(ctx: Ctx, id: string, studentId: string) {
  const e = await ctx.db.onlineExam.findFirst({ where: { id, status: 'PUBLISHED' } });
  const s = await ctx.db.student.findUnique({ where: { id: studentId }, select: { classId: true, sectionId: true } });
  if (!e || !s || e.classId !== s.classId || (e.sectionId && e.sectionId !== s.sectionId)) throw notFound('Exam');
  return e;
}

/** Finalises an attempt with its saved answers (submit, or the deadline passed). */
async function finalise(ctx: Ctx, attempt: { id: string; answers: unknown }, exam: { questions: unknown; negativeMarks: Prisma.Decimal }) {
  const g = gradeAttempt(readQuestions(exam.questions), (attempt.answers ?? {}) as Record<string, string>, Number(exam.negativeMarks));
  return ctx.db.onlineExamAttempt.update({
    where: { id: attempt.id },
    data: { submittedAt: new Date(), autoScore: g.autoScore, score: g.needsManual ? null : g.autoScore, status: g.needsManual ? 'SUBMITTED' : 'GRADED' },
  });
}

/**
 * The student's attempt. Before the end: questions (no answer key), saved
 * answers and the deadline. After results are published (students and their
 * parents): score and the marking of each question.
 */
export const GET = route({ module: 'online_exams' }, async (ctx, req, { id }) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const studentId = ctx.user.role === 'STUDENT' ? ctx.user.studentId : q.studentId;
  if (!studentId) throw badRequest('Choose a child.');
  await assertStudentAccess(ctx, studentId);
  const exam = await examFor(ctx, id, studentId);
  let a = await ctx.db.onlineExamAttempt.findUnique({ where: { examId_studentId: { examId: id, studentId } } });
  if (!a) return { attempt: null, exam: { id: exam.id, title: exam.title, resultsPublished: exam.resultsPublished } };
  if (a.status === 'IN_PROGRESS' && Date.now() > a.deadline.getTime() + GRACE_MS) a = await finalise(ctx, a, exam);
  const questions = readQuestions(exam.questions);
  const ordered = (a.order as string[]).map((qid) => questions.find((x) => x.id === qid)).filter((x): x is NonNullable<typeof x> => !!x);
  if (a.status === 'IN_PROGRESS') {
    if (ctx.user.role !== 'STUDENT') return { attempt: { status: a.status, startedAt: a.startedAt, deadline: a.deadline }, exam: { id: exam.id, title: exam.title } };
    return { attempt: { status: a.status, deadline: a.deadline, answers: a.answers ?? {} }, questions: ordered.map(forStudent), exam: { id: exam.id, title: exam.title, totalMarks: exam.totalMarks, negativeMarks: exam.negativeMarks } };
  }
  if (!exam.resultsPublished) return { attempt: { status: a.status, submittedAt: a.submittedAt }, exam: { id: exam.id, title: exam.title, resultsPublished: false } };
  const answers = (a.answers ?? {}) as Record<string, string>;
  const manual = (a.manualMarks ?? {}) as Record<string, number>;
  const g = gradeAttempt(questions, answers, Number(exam.negativeMarks));
  return {
    attempt: { status: a.status, submittedAt: a.submittedAt, score: a.score, totalMarks: exam.totalMarks },
    exam: { id: exam.id, title: exam.title, resultsPublished: true },
    review: ordered.map((qq) => {
      const pq = g.perQuestion.find((p) => p.id === qq.id)!;
      const objective = OBJECTIVE.has(qq.type);
      return {
        ...forStudent(qq),
        given: answers[qq.id] ?? null,
        correct: pq.correct,
        awarded: objective ? pq.awarded : (manual[qq.id] ?? pq.awarded),
        key: qq.type === 'MCQ' ? null : qq.answer,
        keyIndex: qq.type === 'MCQ' ? mcqCorrectIndex(qq.options, qq.answer) : null,
      };
    }),
  };
});

/** Start (or resume) the exam: only students, only inside the window, one attempt each. */
export const POST = route({ module: 'online_exams', action: 'create' }, async (ctx, _req, { id }) => {
  if (ctx.user.role !== 'STUDENT' || !ctx.user.studentId) throw forbidden('Only the student can take the exam.');
  const exam = await examFor(ctx, id, ctx.user.studentId);
  const now = new Date();
  const existing = await ctx.db.onlineExamAttempt.findUnique({ where: { examId_studentId: { examId: id, studentId: ctx.user.studentId } } });
  if (existing) {
    if (existing.status !== 'IN_PROGRESS') throw conflict('You have already submitted this exam.');
    return { resumed: true };
  }
  if (now < exam.startsAt) throw badRequest('The exam has not started yet.');
  if (now >= exam.endsAt) throw badRequest('The exam has closed.');
  const ids = readQuestions(exam.questions).map((x) => x.id);
  await ctx.db.onlineExamAttempt.create({
    data: { schoolId: ctx.user.schoolId, examId: id, studentId: ctx.user.studentId, order: exam.shuffle ? shuffled(ids) : ids, answers: {}, startedAt: now, deadline: attemptDeadline(now, exam.durationMins, exam.endsAt) },
  });
  await ctx.audit('CREATE', 'OnlineExamAttempt', id, `Started "${exam.title}"`);
  return { started: true };
});

/** Autosave answers while the clock runs. */
export const PUT = route({ module: 'online_exams', action: 'create' }, async (ctx, req, { id }) => {
  if (ctx.user.role !== 'STUDENT' || !ctx.user.studentId) throw forbidden();
  const input = await body(req, z.object({ answers: z.record(z.string().max(40), z.string().max(5000)) }));
  const a = await ctx.db.onlineExamAttempt.findUnique({ where: { examId_studentId: { examId: id, studentId: ctx.user.studentId } } });
  if (!a || a.status !== 'IN_PROGRESS') throw conflict('This attempt is closed.');
  if (Date.now() > a.deadline.getTime() + GRACE_MS) throw conflict('Time is up.');
  const exam = await examFor(ctx, id, ctx.user.studentId);
  const valid = new Set(readQuestions(exam.questions).map((x) => x.id));
  const answers = Object.fromEntries(Object.entries(input.answers).filter(([k]) => valid.has(k)));
  await ctx.db.onlineExamAttempt.update({ where: { id: a.id }, data: { answers: { ...((a.answers as object) ?? {}), ...answers } } });
  return { saved: Object.keys(answers).length };
});

/** Final submit. Objective answers are marked now; descriptive ones go to the teacher. */
export const PATCH = route({ module: 'online_exams', action: 'create' }, async (ctx, req, { id }) => {
  if (ctx.user.role !== 'STUDENT' || !ctx.user.studentId) throw forbidden();
  const input = await body(req, z.object({ answers: z.record(z.string().max(40), z.string().max(5000)).optional() }));
  const a = await ctx.db.onlineExamAttempt.findUnique({ where: { examId_studentId: { examId: id, studentId: ctx.user.studentId } } });
  if (!a || a.status !== 'IN_PROGRESS') throw conflict('This attempt is already submitted.');
  const exam = await examFor(ctx, id, ctx.user.studentId);
  const late = Date.now() > a.deadline.getTime() + GRACE_MS;
  let answers = (a.answers ?? {}) as Record<string, string>;
  if (input.answers && !late) {
    const valid = new Set(readQuestions(exam.questions).map((x) => x.id));
    answers = { ...answers, ...Object.fromEntries(Object.entries(input.answers).filter(([k]) => valid.has(k))) };
    await ctx.db.onlineExamAttempt.update({ where: { id: a.id }, data: { answers } });
  }
  const done = await finalise(ctx, { id: a.id, answers }, exam);
  await ctx.audit('UPDATE', 'OnlineExamAttempt', a.id, `Submitted "${exam.title}"${late ? ' (after time — saved answers only)' : ''}`);
  return { status: done.status, submittedAt: done.submittedAt };
});
