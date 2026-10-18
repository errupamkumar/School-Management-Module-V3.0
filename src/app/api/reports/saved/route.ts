import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { SOURCES } from '@/server/services/report-builder';

/** Saved custom reports: mine, plus ones shared with everyone who has Reports access. */
export const GET = route({ module: 'reports' }, async (ctx) => {
  const rows = await ctx.db.savedReport.findMany({ where: { OR: [{ createdById: ctx.user.id }, { shared: true }] }, orderBy: { name: 'asc' } });
  return rows.filter((r) => SOURCES[r.entity] && ctx.can(SOURCES[r.entity].module)).map((r) => ({ ...r, mine: r.createdById === ctx.user.id }));
});

export const POST = route({ module: 'reports' }, async (ctx, req) => {
  const input = await body(req, z.object({ name: z.string().trim().min(2).max(80), entity: z.string().max(30), columns: z.array(z.string().max(40)).min(1).max(40), filters: z.record(z.string(), z.string().max(60)).default({}), shared: z.boolean().default(false) }));
  if (!SOURCES[input.entity]) throw badRequest('Unknown data source.');
  const row = await ctx.db.savedReport.create({ data: { schoolId: ctx.user.schoolId, ...input, createdById: ctx.user.id, createdByName: ctx.user.name } });
  await ctx.audit('CREATE', 'SavedReport', row.id, input.name);
  return row;
});

export const DELETE = route({ module: 'reports' }, async (ctx, req) => {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  const r = await ctx.db.savedReport.findUnique({ where: { id } });
  if (!r) throw badRequest('Unknown report.');
  if (r.createdById !== ctx.user.id && ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') throw forbidden();
  await ctx.db.savedReport.delete({ where: { id } });
  await ctx.audit('DELETE', 'SavedReport', id, r.name);
  return { deleted: true };
});
