import { z } from 'zod';
import { body, conflict, owned, route } from '@/server/api';

export const PUT = route({ module: 'academics', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().toUpperCase().min(1).max(10).optional(),
      capacity: z.coerce.number().int().min(1).max(200).optional(),
      room: z.string().trim().max(30).optional().nullable(),
      classTeacherId: z.string().optional().nullable(),
    })
  );
  await ctx.db.section.findUniqueOrThrow({ where: { id } });
  await owned(ctx.db.employee, input.classTeacherId, 'Teacher');
  const section = await ctx.db.section.update({ where: { id }, data: { ...input, classTeacherId: input.classTeacherId === undefined ? undefined : input.classTeacherId || null } });
  await ctx.audit('UPDATE', 'Section', id, JSON.stringify(input));
  return section;
});

export const DELETE = route({ module: 'academics', action: 'delete' }, async (ctx, _req, { id }) => {
  const students = await ctx.db.student.count({ where: { sectionId: id } });
  if (students) throw conflict(`This section has ${students} student record(s) and cannot be deleted.`);
  await ctx.db.section.delete({ where: { id } });
  await ctx.audit('DELETE', 'Section', id);
  return { deleted: true };
});
