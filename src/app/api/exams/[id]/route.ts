import { z } from 'zod';
import { badRequest, body, conflict, route } from '@/server/api';
import { toDate, zDate } from '@/server/crud';

export const PUT = route({ module: 'exams', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ name: z.string().trim().min(2).max(80).optional(), term: z.string().trim().max(20).optional().nullable(), startDate: zDate.optional(), endDate: zDate.optional() }));
  const exam = await ctx.db.exam.findUniqueOrThrow({ where: { id } });
  const start = input.startDate ?? exam.startDate.toISOString().slice(0, 10);
  const end = input.endDate ?? exam.endDate.toISOString().slice(0, 10);
  if (end < start) throw badRequest('End date must be after start date.');
  await ctx.db.exam.update({ where: { id }, data: { ...input, startDate: toDate(input.startDate) ?? undefined, endDate: toDate(input.endDate) ?? undefined } });
  await ctx.audit('UPDATE', 'Exam', id, JSON.stringify(input));
  return { id };
});

export const DELETE = route({ module: 'exams', action: 'delete' }, async (ctx, _req, { id }) => {
  const marks = await ctx.db.examMark.count({ where: { examId: id } });
  if (marks) throw conflict(`This exam has ${marks} marks entered. Delete is blocked to protect results.`);
  await ctx.db.exam.delete({ where: { id } });
  await ctx.audit('DELETE', 'Exam', id);
  return { deleted: true };
});
