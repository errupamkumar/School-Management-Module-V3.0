import { forbidden, route } from '@/server/api';

export const DELETE = route({ module: 'lms', action: 'delete' }, async (ctx, _req, { id }) => {
  const m = await ctx.db.studyMaterial.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER' && m.createdById !== ctx.user.id) throw forbidden('You can only delete material you uploaded.');
  await ctx.db.studyMaterial.delete({ where: { id } });
  await ctx.audit('DELETE', 'StudyMaterial', id, m.title);
  return { deleted: true };
});
