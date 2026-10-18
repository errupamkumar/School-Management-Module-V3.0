import { route } from '@/server/api';

export const DELETE = route({ module: 'transport', action: 'delete' }, async (ctx, _req, { id }) => {
  const row = await ctx.db.studentTransport.findUniqueOrThrow({ where: { id } });
  await ctx.db.studentTransport.delete({ where: { id } });
  await ctx.audit('DELETE', 'StudentTransport', row.studentId, 'Removed from transport');
  return { deleted: true };
});
