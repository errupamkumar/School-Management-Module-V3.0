import { z } from 'zod';
import { badRequest, body, owned, route } from '@/server/api';
import { classLabel } from '@/server/common';

const sectionSchema = z.object({ title: z.string().trim().min(1).max(80), questionIds: z.array(z.string()).min(1).max(100) });

const paperSchema = z.object({
  title: z.string().trim().min(2).max(120),
  classId: z.string().min(1),
  subjectId: z.string().min(1),
  durationMins: z.coerce.number().int().min(10).max(600).default(180),
  instructions: z.string().trim().max(2000).optional().nullable(),
  sections: z.array(sectionSchema).min(1).max(10),
});

export const GET = route({ module: 'question_bank' }, async (ctx) => {
  const rows = await ctx.db.questionPaper.findMany({ orderBy: { createdAt: 'desc' }, take: 200 });
  const [classes, subjects] = await Promise.all([ctx.db.class.findMany({ select: { id: true, name: true } }), ctx.db.subject.findMany({ select: { id: true, name: true } })]);
  return rows.map((r) => {
    const c = classes.find((x) => x.id === r.classId);
    return { ...r, classLabel: c ? classLabel(c) : '', subject: subjects.find((s) => s.id === r.subjectId)?.name ?? '', questionCount: (r.sections as Array<{ questionIds: string[] }>).reduce((a, s) => a + s.questionIds.length, 0) };
  });
});

export const POST = route({ module: 'question_bank', action: 'create' }, async (ctx, req) => {
  const input = await body(req, paperSchema);
  await owned(ctx.db.class, input.classId, 'Class');
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  const ids = input.sections.flatMap((s) => s.questionIds);
  const questions = await ctx.db.question.findMany({ where: { id: { in: ids } }, select: { id: true, marks: true } });
  if (questions.length !== new Set(ids).size) throw badRequest('Some questions were not found.');
  const totalMarks = questions.reduce((a, q) => a + Number(q.marks), 0);
  const paper = await ctx.db.questionPaper.create({ data: { schoolId: ctx.user.schoolId, ...input, instructions: input.instructions ?? null, totalMarks, createdById: ctx.user.id } });
  await ctx.audit('CREATE', 'QuestionPaper', paper.id, `${input.title} (${totalMarks} marks)`);
  return paper;
});
