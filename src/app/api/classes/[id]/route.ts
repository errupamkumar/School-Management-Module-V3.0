import { z } from 'zod';
import { body, conflict, route } from '@/server/api';
import { fromPaise } from '@/server/services/money';
import { money } from '@/lib/validators';

export const PUT = route({ module: 'academics', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().min(1).max(30).optional(),
      numericOrder: z.coerce.number().int().min(0).max(100).optional(),
      monthlyFee: money.optional(),
      isActive: z.boolean().optional(),
    })
  );
  await ctx.db.class.findUniqueOrThrow({ where: { id } });
  const cls = await ctx.db.class.update({
    where: { id },
    data: { ...input, monthlyFee: input.monthlyFee !== undefined ? fromPaise(Math.round(input.monthlyFee * 100)) : undefined },
  });
  await ctx.audit('UPDATE', 'Class', id, JSON.stringify(input));
  return cls;
});

export const DELETE = route({ module: 'academics', action: 'delete' }, async (ctx, _req, { id }) => {
  const students = await ctx.db.student.count({ where: { classId: id } });
  if (students) throw conflict(`This class has ${students} student record(s). Move them before deleting, or mark the class inactive.`);
  await ctx.db.class.delete({ where: { id } });
  await ctx.audit('DELETE', 'Class', id);
  return { deleted: true };
});
