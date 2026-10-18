import { forbidden, route } from '@/server/api';

export const DELETE = route({ module: 'homework', action: 'delete' }, async (ctx, _req, { id }) => {
  const hw = await ctx.db.homework.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER' && hw.createdById !== ctx.user.id) throw forbidden('You can only delete homework you gave.');
  await ctx.db.homework.delete({ where: { id } });
  await ctx.audit('DELETE', 'Homework', id, hw.title);
  return { deleted: true };
});
