import { z } from 'zod';
import { badRequest, body, owned, route } from '@/server/api';

/** Replace the subject list of a class (with full/pass marks). */
export const PUT = route({ module: 'academics', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      subjects: z
        .array(
          z.object({
            subjectId: z.string().min(1),
            fullMarks: z.coerce.number().int().min(1).max(1000).default(100),
            passMarks: z.coerce.number().int().min(0).max(1000).default(33),
          })
        )
        .max(40),
    })
  );
  await owned(ctx.db.class, id, 'Class');
  const ids = input.subjects.map((s) => s.subjectId);
  const found = await ctx.db.subject.count({ where: { id: { in: ids } } });
  if (found !== new Set(ids).size) throw badRequest('One or more subjects were not found.');
  for (const s of input.subjects) if (s.passMarks > s.fullMarks) throw badRequest('Pass marks cannot exceed full marks.');

  await ctx.db.$transaction([
    ctx.db.classSubject.deleteMany({ where: { classId: id, subjectId: { notIn: ids } } }),
    ...input.subjects.map((s) =>
      ctx.db.classSubject.upsert({
        where: { classId_subjectId: { classId: id, subjectId: s.subjectId } },
        update: { fullMarks: s.fullMarks, passMarks: s.passMarks },
        create: { schoolId: ctx.user.schoolId, classId: id, subjectId: s.subjectId, fullMarks: s.fullMarks, passMarks: s.passMarks },
      })
    ),
  ]);
  await ctx.audit('UPDATE', 'ClassSubjects', id, `${ids.length} subjects`);
  return { count: ids.length };
});
