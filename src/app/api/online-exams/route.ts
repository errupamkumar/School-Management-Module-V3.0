import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, owned, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { assertSectionAccess, hasSchoolWideScope, ownClassSectionPairs, teacherSectionIds } from '@/server/scope';
import { mcqCorrectIndex, OBJECTIVE, type ExamQuestion } from '@/server/services/online-exams';

const FAMILY = ['PARENT', 'STUDENT'];

/**
 * Staff: exams they can manage. Students: published exams for their class with
 * their attempt state. Parents: their children's exams and published scores.
 */
export const GET = route({ module: 'online_exams' }, async (ctx) => {
  const family = FAMILY.includes(ctx.user.role);
  let where: Prisma.OnlineExamWhereInput = {};
  let pairs: Array<{ classId: string; sectionId: string; studentId: string }> = [];
  if (family) {
    pairs = await ownClassSectionPairs(ctx);
    where = { status: 'PUBLISHED', OR: pairs.map((p) => ({ classId: p.classId, OR: [{ sectionId: null }, { sectionId: p.sectionId }] })) };
    if (!pairs.length) return [];
  } else if (!hasSchoolWideScope(ctx) && ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    const classIds = (await ctx.db.section.findMany({ where: { id: { in: secs } }, select: { classId: true } })).map((s) => s.classId);
    where = { OR: [{ createdById: ctx.user.id }, { sectionId: { in: secs } }, { sectionId: null, classId: { in: classIds } }] };
  }
  const rows = await ctx.db.onlineExam.findMany({ where, orderBy: { startsAt: 'desc' }, take: 300, select: { id: true, title: true, instructions: true, classId: true, sectionId: true, subjectId: true, startsAt: true, endsAt: true, durationMins: true, totalMarks: true, negativeMarks: true, status: true, resultsPublished: true, createdByName: true, questions: true, _count: { select: { attempts: true } } } });
  const [classes, subjects] = await Promise.all([
    ctx.db.class.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.classId))] } }, select: { id: true, name: true, sections: { select: { id: true, name: true } } } }),
    ctx.db.subject.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.subjectId))] } }, select: { id: true, name: true } }),
  ]);
  const attempts = family ? await ctx.db.onlineExamAttempt.findMany({ where: { examId: { in: rows.map((r) => r.id) }, studentId: { in: pairs.map((p) => p.studentId) } }, select: { examId: true, studentId: true, status: true, score: true, submittedAt: true, deadline: true } }) : [];
  const now = new Date();
  return rows.map(({ questions, ...r }) => {
    const c = classes.find((x) => x.id === r.classId);
    const sec = c?.sections.find((s) => s.id === r.sectionId);
    const mine = attempts.filter((a) => a.examId === r.id).map((a) => ({ ...a, score: r.resultsPublished ? a.score : null }));
    return {
      ...r,
      questionCount: Array.isArray(questions) ? questions.length : 0,
      classLabel: c ? classLabel(c, sec) : '',
      subjectName: subjects.find((s) => s.id === r.subjectId)?.name ?? '',
      window: now < r.startsAt ? 'UPCOMING' : now > r.endsAt ? 'CLOSED' : 'LIVE',
      attempts: family ? mine : undefined,
    };
  });
});

const examInput = z.object({
  title: z.string().trim().min(3).max(150),
  instructions: z.string().trim().max(3000).optional().nullable(),
  classId: z.string().min(1),
  sectionId: z.string().optional().nullable(),
  subjectId: z.string().min(1),
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  durationMins: z.coerce.number().int().min(5).max(360),
  questionIds: z.array(z.string().min(1)).min(1, 'Pick at least one question').max(200),
  negativeMarks: z.coerce.number().min(0).max(10).default(0),
  shuffle: z.boolean().default(true),
});

export const POST = route({ module: 'online_exams', action: 'create' }, async (ctx, req) => {
  if (FAMILY.includes(ctx.user.role)) throw badRequest('Students take exams from the exam list.');
  const input = await body(req, examInput);
  await owned(ctx.db.class, input.classId, 'Class');
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  if (input.sectionId) {
    const sec = await ctx.db.section.findFirst({ where: { id: input.sectionId, classId: input.classId } });
    if (!sec) throw badRequest('That section is not in the chosen class.');
    await assertSectionAccess(ctx, input.sectionId);
  } else if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    if (!(await ctx.db.section.count({ where: { id: { in: secs }, classId: input.classId } }))) throw badRequest('Choose one of your sections.');
  }
  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (endsAt <= startsAt) throw badRequest('The exam must end after it starts.');
  if (endsAt.getTime() - startsAt.getTime() < input.durationMins * 60_000) throw badRequest('The window is shorter than the exam duration.');
  const bank = await ctx.db.question.findMany({ where: { id: { in: input.questionIds } } });
  if (bank.length !== new Set(input.questionIds).size) throw badRequest('Some questions were not found.');
  const questions: ExamQuestion[] = input.questionIds.map((id) => {
    const q = bank.find((b) => b.id === id)!;
    return { id: q.id, type: q.type as ExamQuestion['type'], text: q.text, options: Array.isArray(q.options) ? (q.options as string[]) : [], answer: q.answer, marks: Number(q.marks) };
  });
  const broken = questions.filter((q) => q.type === 'MCQ' && mcqCorrectIndex(q.options, q.answer) === null);
  if (broken.length) throw badRequest(`${broken.length} MCQ(s) have no answer matching an option. Set the answer to the option text or letter (A, B, C…).`);
  const total = questions.reduce((a, q) => a + q.marks, 0);
  const row = await ctx.db.onlineExam.create({
    data: {
      schoolId: ctx.user.schoolId,
      title: input.title,
      instructions: input.instructions ?? null,
      classId: input.classId,
      sectionId: input.sectionId || null,
      subjectId: input.subjectId,
      startsAt,
      endsAt,
      durationMins: input.durationMins,
      questions: questions as unknown as Prisma.InputJsonValue,
      totalMarks: total,
      negativeMarks: input.negativeMarks,
      shuffle: input.shuffle,
      createdById: ctx.user.id,
      createdByName: ctx.user.name,
    },
  });
  await ctx.audit('CREATE', 'OnlineExam', row.id, `${input.title}: ${questions.length} questions, ${total} marks (${questions.filter((q) => OBJECTIVE.has(q.type)).length} auto-marked)`);
  return row;
});

