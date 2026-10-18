import { forbidden, route } from '@/server/api';

export const DELETE = route({ module: 'live_classes', action: 'delete' }, async (ctx, _req, { id }) => {
  const l = await ctx.db.liveClass.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER' && l.hostId !== ctx.user.id) throw forbidden('You can only cancel classes you scheduled.');
  await ctx.db.liveClass.delete({ where: { id } });
  await ctx.audit('DELETE', 'LiveClass', id, l.title);
  return { deleted: true };
});
