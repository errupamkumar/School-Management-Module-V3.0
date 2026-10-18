import { route } from '@/server/api';

export const DELETE = route({ module: 'fees', action: 'delete' }, async (ctx, _req, { id }) => {
  await ctx.db.feeConcession.findUniqueOrThrow({ where: { id } });
  await ctx.db.feeConcession.delete({ where: { id } });
  await ctx.audit('DELETE', 'FeeConcession', id);
  return { deleted: true };
});
