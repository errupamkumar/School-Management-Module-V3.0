import { z } from 'zod';
import { badRequest, body, forbidden, owned, route } from '@/server/api';
import { ownClassSectionPairs } from '@/server/scope';

/** Student (or parent on the child's behalf) submits homework online. */
export const POST = route({ module: 'homework' }, async (ctx, req, { id }) => {
  if (ctx.user.role !== 'STUDENT' && ctx.user.role !== 'PARENT') throw forbidden('Only students and parents submit homework.');
  const input = await body(req, z.object({ studentId: z.string().optional(), content: z.string().trim().max(5000).optional().nullable(), attachmentId: z.string().optional().nullable() }));
  if (!input.content && !input.attachmentId) throw badRequest('Write an answer or attach a file.');
  const hw = await ctx.db.homework.findUniqueOrThrow({ where: { id } });
  const pairs = await ownClassSectionPairs(ctx);
  const p = input.studentId ? pairs.find((x) => x.studentId === input.studentId) : pairs[0];
  if (!p || p.classId !== hw.classId || (hw.sectionId && hw.sectionId !== p.sectionId)) throw forbidden('This homework is not for your class.');
  if (input.attachmentId) await owned(ctx.db.storedFile, input.attachmentId, 'Attachment');
  const existing = await ctx.db.homeworkSubmission.findUnique({ where: { homeworkId_studentId: { homeworkId: id, studentId: p.studentId } } });
  if (existing?.status === 'CHECKED') throw badRequest('This homework has already been checked.');
  const sub = await ctx.db.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId: id, studentId: p.studentId } },
    update: { content: input.content ?? null, attachmentId: input.attachmentId ?? null, status: 'SUBMITTED', submittedAt: new Date() },
    create: { schoolId: ctx.user.schoolId, homeworkId: id, studentId: p.studentId, content: input.content ?? null, attachmentId: input.attachmentId ?? null },
  });
  return sub;
});
