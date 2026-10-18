import { badRequest, body, platformRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { planSchema } from '@/server/resources/plans';
import { invalidatePermissions } from '@/server/permissions';

/** Editing a plan's modules applies to every school on it (cached permissions are cleared). */
export const PUT = platformRoute(async (ctx, req, { id }) => {
  const input = await body(req, planSchema.partial());
  if (input.maxStudents) {
    const over = await prisma.school.findMany({ where: { planId: id }, select: { id: true, name: true } });
    for (const s of over) {
      const n = await prisma.student.count({ where: { schoolId: s.id, status: 'ACTIVE' } });
      if (n > input.maxStudents) throw badRequest(`${s.name} already has ${n} active students — above the new limit.`);
    }
  }
  const p = await prisma.subscriptionPlan.update({ where: { id }, data: input });
  const schools = await prisma.school.findMany({ where: { planId: id }, select: { id: true } });
  schools.forEach((s) => invalidatePermissions(s.id));
  await ctx.audit('UPDATE', 'SubscriptionPlan', id, `${p.name}: ${Object.keys(input).join(', ')} (${schools.length} schools)`);
  return p;
});
