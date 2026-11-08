import { z } from 'zod';
import { platformRoute, query } from '@/server/api';
import { prisma } from '@/server/db';
import { LEAD_STATUSES } from '@/website/lead-schema';

export const GET = platformRoute(async (_ctx, req) => {
  const q = query(req, z.object({ status: z.enum(LEAD_STATUSES).optional(), search: z.string().trim().max(100).optional() }));
  return prisma.websiteLead.findMany({
    where: {
      status: q.status,
      ...(q.search ? { OR: [{ schoolName: { contains: q.search } }, { contactName: { contains: q.search } }, { email: { contains: q.search } }, { phone: { contains: q.search } }, { city: { contains: q.search } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
});
