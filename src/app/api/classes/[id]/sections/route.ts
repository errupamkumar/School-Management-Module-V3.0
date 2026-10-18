import { z } from 'zod';
import { body, owned, route } from '@/server/api';

export const POST = route({ module: 'academics', action: 'create' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().toUpperCase().min(1, 'Section name is required').max(10),
      capacity: z.coerce.number().int().min(1).max(200).default(40),
      room: z.string().trim().max(30).optional().nullable(),
      classTeacherId: z.string().optional().nullable(),
    })
  );
  await owned(ctx.db.class, id, 'Class');
  await owned(ctx.db.employee, input.classTeacherId, 'Teacher');
  const section = await ctx.db.section.create({ data: { schoolId: ctx.user.schoolId, classId: id, ...input, classTeacherId: input.classTeacherId || null } });
  await ctx.audit('CREATE', 'Section', section.id, `${input.name}`);
  return section;
});
