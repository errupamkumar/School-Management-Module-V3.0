import { forbidden, route } from '@/server/api';

export const DELETE = route({ module: 'behaviour', action: 'create' }, async (ctx, _req, { id }) => {
  const o = await ctx.db.observation.findUniqueOrThrow({ where: { id } });
  // Authors may retract their own (e.g. one shared with parents by mistake); removing others' needs delete rights.
  if (o.createdById !== ctx.user.id && !ctx.can('behaviour', 'delete')) throw forbidden('You can only delete your own observations.');
  if (ctx.user.role === 'TEACHER' && o.createdById !== ctx.user.id) throw forbidden('You can only delete your own observations.');
  await ctx.db.observation.delete({ where: { id } });
  await ctx.audit('DELETE', 'Observation', id);
  return { deleted: true };
});
