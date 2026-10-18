import { z } from 'zod';
import { MODULES } from '@/lib/modules';
import { body, platformRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { planSchema } from '@/server/resources/plans';

export const GET = platformRoute(async () => {
  const plans = await prisma.subscriptionPlan.findMany({ orderBy: { sortOrder: 'asc' }, include: { _count: { select: { schools: true } } } });
  return { plans, catalog: MODULES.map((m) => ({ key: m.key, label: m.label, group: m.group, core: 'core' in m && !!m.core })) };
});

export const POST = platformRoute(async (ctx, req) => {
  const input = await body(req, planSchema.extend({ code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]{2,20}$/) }));
  const p = await prisma.subscriptionPlan.create({ data: input });
  await ctx.audit('CREATE', 'SubscriptionPlan', p.id, `${p.name} (${p.modules && Array.isArray(p.modules) ? p.modules.length : 0} modules)`);
  return p;
});
