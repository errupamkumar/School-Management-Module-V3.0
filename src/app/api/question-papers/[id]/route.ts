import { route } from '@/server/api';
import { classLabel } from '@/server/common';

/** Paper with questions resolved in order (for preview and printing). */
export const GET = route({ module: 'question_bank' }, async (ctx, _req, { id }) => {
  const paper = await ctx.db.questionPaper.findUniqueOrThrow({ where: { id } });
  const sections = paper.sections as Array<{ title: string; questionIds: string[] }>;
  const questions = await ctx.db.question.findMany({ where: { id: { in: sections.flatMap((s) => s.questionIds) } } });
  const [cls, subject, school] = await Promise.all([
    ctx.db.class.findUnique({ where: { id: paper.classId }, select: { name: true } }),
    ctx.db.subject.findUnique({ where: { id: paper.subjectId }, select: { name: true } }),
    ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, board: true, affiliationNo: true } }),
  ]);
  return {
    ...paper,
    classLabel: cls ? classLabel(cls) : '',
    subject: subject?.name ?? '',
    school,
    sections: sections.map((s) => ({ title: s.title, questions: s.questionIds.map((qid) => questions.find((q) => q.id === qid)).filter(Boolean) })),
  };
});

export const DELETE = route({ module: 'question_bank', action: 'delete' }, async (ctx, _req, { id }) => {
  await ctx.db.questionPaper.findUniqueOrThrow({ where: { id } });
  await ctx.db.questionPaper.delete({ where: { id } });
  await ctx.audit('DELETE', 'QuestionPaper', id);
  return { deleted: true };
});
