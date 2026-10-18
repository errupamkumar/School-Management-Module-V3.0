import { z } from 'zod';
import { body, forbidden, route } from '@/server/api';

export const PUT = route({ module: 'notices', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ title: z.string().trim().min(3).max(150).optional(), body: z.string().trim().min(3).max(10000).optional(), isPinned: z.boolean().optional(), expiresAt: z.string().nullable().optional() }));
  const n = await ctx.db.notice.findUniqueOrThrow({ where: { id } });
  if (ctx.user.role === 'TEACHER' && n.createdById !== ctx.user.id) throw forbidden();
  await ctx.db.notice.update({ where: { id }, data: { ...input, expiresAt: input.expiresAt === undefined ? undefined : input.expiresAt ? new Date(input.expiresAt) : null } });
  await ctx.audit('UPDATE', 'Notice', id, n.title);
  return { id };
});

export const DELETE = route({ module: 'notices', action: 'create' }, async (ctx, _req, { id }) => {
  const n = await ctx.db.notice.findUniqueOrThrow({ where: { id } });
  // Authors may remove their own notices; removing others' needs delete rights.
  if (n.createdById !== ctx.user.id && !ctx.can('notices', 'delete')) throw forbidden();
  await ctx.db.notice.delete({ where: { id } });
  await ctx.audit('DELETE', 'Notice', id, n.title);
  return { deleted: true };
});
