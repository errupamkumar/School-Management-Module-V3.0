import { forbidden, route } from '@/server/api';

export const DELETE = route({ module: 'class_tests', action: 'delete' }, async (ctx, _req, { id }) => {
  const t = await ctx.db.classTest.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER' && t.createdById !== ctx.user.id) throw forbidden('You can only delete tests you created.');
  await ctx.db.classTest.delete({ where: { id } });
  await ctx.audit('DELETE', 'ClassTest', id, t.title);
  return { deleted: true };
});
