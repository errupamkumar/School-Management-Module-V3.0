import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ok, paginate, pageQuery, query, route } from '@/server/api';

export const GET = route({ module: 'sms' }, async (ctx, req) => {
  const q = query(req, pageQuery.extend({ channel: z.enum(['SMS', 'WHATSAPP']).optional(), status: z.string().max(20).optional() }));
  const where: Prisma.OutboundMessageWhereInput = {
    ...(q.channel ? { channel: q.channel } : {}),
    ...(q.status ? { status: q.status } : {}),
    ...(q.search ? { OR: [{ recipient: { contains: q.search } }, { recipientName: { contains: q.search } }, { body: { contains: q.search } }] } : {}),
  };
  const [rows, total, stats] = await Promise.all([
    ctx.db.outboundMessage.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(q.page, q.pageSize) }),
    ctx.db.outboundMessage.count({ where }),
    ctx.db.outboundMessage.groupBy({ by: ['status'], _count: true }),
  ]);
  return ok(rows, { meta: { total, page: q.page, pageSize: q.pageSize, stats: Object.fromEntries(stats.map((s) => [s.status, s._count])) } });
});
