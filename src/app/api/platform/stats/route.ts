import { platformRoute } from '@/server/api';
import { prisma } from '@/server/db';

/** Business overview for the SaaS operator. */
export const GET = platformRoute(async () => {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const soon = new Date(now.getTime() + 7 * 86_400_000);
  const [byStatus, schools, students, staff, newThisMonth, trialsEnding, plans] = await Promise.all([
    prisma.school.groupBy({ by: ['status'], _count: true }),
    prisma.school.findMany({ where: { status: 'ACTIVE' }, select: { id: true, plan: { select: { priceMonthly: true, pricePerStudent: true } } } }),
    prisma.student.groupBy({ by: ['schoolId'], where: { status: 'ACTIVE' }, _count: true }),
    prisma.employee.count({ where: { status: 'ACTIVE' } }),
    prisma.school.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.school.findMany({ where: { status: 'TRIAL', trialEndsAt: { gte: now, lte: soon } }, select: { id: true, code: true, name: true, trialEndsAt: true }, orderBy: { trialEndsAt: 'asc' } }),
    prisma.subscriptionPlan.findMany({ select: { id: true, name: true, _count: { select: { schools: true } } }, orderBy: { sortOrder: 'asc' } }),
  ]);
  const studentsBySchool = new Map(students.map((s) => [s.schoolId, s._count]));
  // Monthly recurring revenue from paying schools: flat price + per-student price.
  const mrr = schools.reduce((a, s) => a + Number(s.plan?.priceMonthly ?? 0) + Number(s.plan?.pricePerStudent ?? 0) * (studentsBySchool.get(s.id) ?? 0), 0);
  return {
    schools: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
    totalStudents: students.reduce((a, s) => a + s._count, 0),
    totalStaff: staff,
    newThisMonth,
    mrr: Math.round(mrr),
    trialsEnding,
    plans: plans.map((p) => ({ id: p.id, name: p.name, schools: p._count.schools })),
  };
});
