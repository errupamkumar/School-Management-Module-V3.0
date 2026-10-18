import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { ok, pageQuery, paginate, query, route } from '@/server/api';

/** Read-only trail of who changed what (there is deliberately no edit/delete endpoint). */
export const GET = route({ module: 'audit_logs' }, async (ctx, req) => {
  const q = query(
    req,
    pageQuery.extend({
      action: z.string().max(30).optional(),
      entity: z.string().max(40).optional(),
      userId: z.string().max(40).optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  );
  const and: Prisma.AuditLogWhereInput[] = [];
  if (q.action) and.push({ action: q.action });
  if (q.entity) and.push({ entity: q.entity });
  if (q.userId) and.push({ userId: q.userId });
  if (q.from) and.push({ createdAt: { gte: new Date(`${q.from}T00:00:00+05:30`) } });
  if (q.to) and.push({ createdAt: { lt: new Date(new Date(`${q.to}T00:00:00+05:30`).getTime() + 86_400_000) } });
  if (q.search) and.push({ OR: [{ summary: { contains: q.search } }, { userName: { contains: q.search } }, { entityId: q.search }, { ip: q.search }] });
  const where = and.length ? { AND: and } : {};
  const [rows, total, facets] = await Promise.all([
    ctx.db.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(q.page, q.pageSize), select: { id: true, createdAt: true, userName: true, role: true, action: true, entity: true, entityId: true, summary: true, ip: true, userAgent: true } }),
    ctx.db.auditLog.count({ where }),
    q.page === 1 ? Promise.all([ctx.db.auditLog.groupBy({ by: ['action'], _count: true }), ctx.db.auditLog.groupBy({ by: ['entity'], _count: true })]) : null,
  ]);
  return ok(rows, {
    meta: {
      total,
      page: q.page,
      pageSize: q.pageSize,
      ...(facets ? { actions: facets[0].map((f) => f.action).sort(), entities: facets[1].map((f) => f.entity).sort() } : {}),
    },
  });
});
