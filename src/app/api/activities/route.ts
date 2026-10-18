import { body, route } from '@/server/api';
import { displayName } from '@/server/common';
import { activitySchema, assertCanManage, isFamily, mapActivity } from '@/server/resources/activities';
import { guardianStudentIds } from '@/server/scope';

export const GET = route({ module: 'activities' }, async (ctx) => {
  const family = isFamily(ctx);
  const rows = await ctx.db.activity.findMany({
    where: family ? { isActive: true } : {},
    orderBy: [{ isActive: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    include: { _count: { select: { members: { where: { status: 'ENROLLED' } } } } },
  });
  const [incharges, waitlist] = await Promise.all([
    ctx.db.employee.findMany({ where: { id: { in: rows.map((r) => r.inchargeId).filter((x): x is string => !!x) } }, select: { id: true, firstName: true, lastName: true } }),
    ctx.db.activityMember.groupBy({ by: ['activityId'], where: { status: 'WAITLISTED' }, _count: true }),
  ]);
  // For families: which of their children are in each activity.
  const mineIds = family ? (ctx.user.role === 'PARENT' ? await guardianStudentIds(ctx) : [ctx.user.studentId ?? '__none__']) : [];
  const mine = family ? await ctx.db.activityMember.findMany({ where: { studentId: { in: mineIds }, status: { not: 'LEFT' } }, select: { activityId: true, studentId: true, status: true, achievement: true } }) : [];
  return rows.map((a) => {
    const e = incharges.find((x) => x.id === a.inchargeId);
    return {
      ...a,
      incharge: e ? displayName(e) : null,
      enrolled: a._count.members,
      waitlisted: waitlist.find((w) => w.activityId === a.id)?._count ?? 0,
      canManage: !family && (ctx.user.role !== 'TEACHER' || a.inchargeId === ctx.user.employeeId),
      mine: mine.filter((m) => m.activityId === a.id),
    };
  });
});

export const POST = route({ module: 'activities', action: 'create' }, async (ctx, req) => {
  await assertCanManage(ctx, null);
  const input = await body(req, activitySchema);
  const a = await ctx.db.activity.create({ data: { schoolId: ctx.user.schoolId, ...(await mapActivity(ctx, input)) } as never });
  await ctx.audit('CREATE', 'Activity', a.id, a.name);
  return a;
});
