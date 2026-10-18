import { conflict, notFound, route } from '@/server/api';

export const GET = route({ module: 'gate' }, async (ctx, _req, { id }) => {
  const [v, school] = await Promise.all([
    ctx.db.visitor.findUnique({ where: { id } }),
    ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true, affiliationNo: true, board: true } }),
  ]);
  if (!v) throw notFound('Visitor');
  return { ...v, school };
});

/** Check the visitor out. */
export const PATCH = route({ module: 'gate', action: 'edit' }, async (ctx, _req, { id }) => {
  const v = await ctx.db.visitor.findUnique({ where: { id } });
  if (!v) throw notFound('Visitor');
  if (v.outAt) throw conflict('Already checked out.');
  const row = await ctx.db.visitor.update({ where: { id }, data: { outAt: new Date() } });
  await ctx.audit('UPDATE', 'Visitor', id, `${v.passNo} checked out`);
  return row;
});
