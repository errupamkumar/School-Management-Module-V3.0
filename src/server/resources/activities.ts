import { z } from 'zod';
import { forbidden, owned, type Ctx } from '../api';
import { hasSchoolWideScope } from '../scope';
import { notifyUsers } from '../services/notify';

export const activitySchema = z.object({
  name: z.string().trim().min(2).max(80),
  category: z.enum(['SPORTS', 'ARTS', 'CLUB', 'STEM', 'COMMUNITY']),
  description: z.string().trim().max(2000).optional().nullable(),
  inchargeId: z.string().optional().nullable(),
  schedule: z.string().trim().max(120).optional().nullable(),
  capacity: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const isFamily = (ctx: Ctx) => ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';

/** Staff manage activities; teachers only the ones they are in charge of. */
export async function assertCanManage(ctx: Ctx, activityId: string | null) {
  if (isFamily(ctx)) throw forbidden();
  if (hasSchoolWideScope(ctx)) return;
  if (!activityId) return;
  const a = await ctx.db.activity.findUniqueOrThrow({ where: { id: activityId }, select: { inchargeId: true } });
  if (!ctx.user.employeeId || a.inchargeId !== ctx.user.employeeId) throw forbidden('Only the teacher in charge can manage this activity.');
}

export async function mapActivity(ctx: Ctx, input: Partial<z.infer<typeof activitySchema>>) {
  const data = { ...input };
  // Teachers always own what they create or edit.
  if (!hasSchoolWideScope(ctx)) data.inchargeId = ctx.user.employeeId ?? null;
  else if (data.inchargeId) await owned(ctx.db.employee, data.inchargeId, 'employee');
  return data;
}

/** Fill free seats from the waitlist in sign-up order and tell the families. */
export async function promoteWaitlist(ctx: Ctx, activityId: string) {
  const a = await ctx.db.activity.findUniqueOrThrow({ where: { id: activityId }, select: { name: true, capacity: true } });
  const enrolled = await ctx.db.activityMember.count({ where: { activityId, status: 'ENROLLED' } });
  const free = a.capacity == null ? Infinity : a.capacity - enrolled;
  if (free <= 0) return [];
  const next = await ctx.db.activityMember.findMany({ where: { activityId, status: 'WAITLISTED' }, orderBy: { createdAt: 'asc' }, take: Number.isFinite(free) ? free : undefined, select: { id: true, studentId: true } });
  if (!next.length) return next;
  await ctx.db.activityMember.updateMany({ where: { id: { in: next.map((n) => n.id) } }, data: { status: 'ENROLLED' } });
  const users = await ctx.db.student.findMany({ where: { id: { in: next.map((n) => n.studentId) } }, select: { userId: true, guardian: { select: { userId: true } } } });
  await notifyUsers(ctx.db, ctx.user.schoolId, users.flatMap((u) => [u.userId, u.guardian?.userId]), { title: `Seat confirmed: ${a.name}`, body: 'A seat opened up, so the enrolment from the waitlist is now confirmed.', link: '/activities' });
  return next;
}
