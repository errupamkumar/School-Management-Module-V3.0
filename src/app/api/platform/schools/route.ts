import { z } from 'zod';
import { badRequest, body, platformRoute, query } from '@/server/api';
import { prisma } from '@/server/db';
import { provisionSchool } from '@/server/services/provision';

export const GET = platformRoute(async (_ctx, req) => {
  const q = query(req, z.object({ search: z.string().trim().max(80).optional(), status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional() }));
  const rows = await prisma.school.findMany({
    where: { ...(q.status ? { status: q.status } : {}), ...(q.search ? { OR: [{ name: { contains: q.search } }, { code: { contains: q.search } }, { city: { contains: q.search } }] } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 500,
    select: { id: true, code: true, name: true, city: true, state: true, board: true, phone: true, email: true, status: true, trialEndsAt: true, subscriptionEndsAt: true, createdAt: true, planId: true, plan: { select: { name: true, maxStudents: true } } },
  });
  const ids = rows.map((r) => r.id);
  const [students, staff, lastSeen] = await Promise.all([
    prisma.student.groupBy({ by: ['schoolId'], where: { schoolId: { in: ids }, status: 'ACTIVE' }, _count: true }),
    prisma.employee.groupBy({ by: ['schoolId'], where: { schoolId: { in: ids }, status: 'ACTIVE' }, _count: true }),
    prisma.user.groupBy({ by: ['schoolId'], where: { schoolId: { in: ids } }, _max: { lastLoginAt: true } }),
  ]);
  return rows.map((r) => ({
    ...r,
    students: students.find((s) => s.schoolId === r.id)?._count ?? 0,
    staff: staff.find((s) => s.schoolId === r.id)?._count ?? 0,
    lastLoginAt: lastSeen.find((s) => s.schoolId === r.id)?._max.lastLoginAt ?? null,
  }));
});

const onboardSchema = z.object({
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,12}$/, 'School code: 3–12 letters or digits (used on the login screen)'),
  name: z.string().trim().min(3).max(120),
  city: z.string().trim().max(60).optional().nullable(),
  state: z.string().trim().max(60).optional().nullable(),
  board: z.enum(['CBSE', 'ICSE', 'STATE', 'IB', 'CAMBRIDGE', 'NIOS', 'OTHER']).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(120).optional().nullable().or(z.literal('').transform(() => null)),
  planId: z.string().min(1),
  status: z.enum(['TRIAL', 'ACTIVE']).default('TRIAL'),
  trialDays: z.coerce.number().int().min(1).max(90).default(14),
  subscriptionEndsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  owner: z.object({
    name: z.string().trim().min(2).max(80),
    username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,30}$/).default('owner'),
    email: z.string().trim().email().max(120).optional().nullable().or(z.literal('').transform(() => null)),
    phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit Indian mobile number').optional().nullable().or(z.literal('').transform(() => null)),
  }),
});

/** Onboard a school: returns the owner's one-time credentials (shown once). */
export const POST = platformRoute(async (ctx, req) => {
  const input = await body(req, onboardSchema);
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId }, select: { isActive: true, name: true } });
  if (!plan?.isActive) throw badRequest('Choose an active plan.');
  const res = await provisionSchool({ ...input, subscriptionEndsAt: input.subscriptionEndsAt ? new Date(input.subscriptionEndsAt) : null });
  await ctx.audit('CREATE', 'School', res.schoolId, `Onboarded ${input.name} (${res.code}) on ${plan.name}, ${input.status === 'TRIAL' ? `${input.trialDays}-day trial` : 'active'}`);
  return res;
});
