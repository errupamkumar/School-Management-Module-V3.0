import { z } from 'zod';
import { badRequest, body, platformRoute } from '@/server/api';
import { writeAudit } from '@/server/audit';
import { prisma } from '@/server/db';
import { invalidatePermissions } from '@/server/permissions';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** Change plan, status or dates. Every change is also written to the school's own audit log. */
export const PATCH = platformRoute(async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      status: z.enum(['TRIAL', 'ACTIVE', 'SUSPENDED', 'CANCELLED']).optional(),
      planId: z.string().optional(),
      trialEndsAt: ymd.optional().nullable(),
      subscriptionEndsAt: ymd.optional().nullable(),
      reason: z.string().trim().max(200).optional(),
    })
  );
  const school = await prisma.school.findUniqueOrThrow({ where: { id }, select: { name: true, status: true, plan: { select: { name: true } } } });
  if (input.planId) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: input.planId }, select: { isActive: true, maxStudents: true, name: true } });
    if (!plan?.isActive) throw badRequest('Choose an active plan.');
    const active = await prisma.student.count({ where: { schoolId: id, status: 'ACTIVE' } });
    if (plan.maxStudents != null && active > plan.maxStudents) throw badRequest(`${plan.name} allows ${plan.maxStudents} students; this school has ${active} active.`);
  }
  if ((input.status === 'SUSPENDED' || input.status === 'CANCELLED') && !input.reason) throw badRequest('Give a reason for suspending or cancelling.');
  const updated = await prisma.school.update({
    where: { id },
    data: {
      ...(input.status ? { status: input.status } : {}),
      ...(input.planId ? { planId: input.planId } : {}),
      ...(input.trialEndsAt !== undefined ? { trialEndsAt: input.trialEndsAt ? new Date(`${input.trialEndsAt}T23:59:59+05:30`) : null } : {}),
      ...(input.subscriptionEndsAt !== undefined ? { subscriptionEndsAt: input.subscriptionEndsAt ? new Date(`${input.subscriptionEndsAt}T23:59:59+05:30`) : null } : {}),
    },
    select: { status: true, trialEndsAt: true, subscriptionEndsAt: true, plan: { select: { name: true } } },
  });
  if (input.planId) invalidatePermissions(id);
  const summary = [
    input.status && input.status !== school.status ? `status ${school.status} → ${input.status}` : null,
    input.planId ? `plan ${school.plan?.name ?? '—'} → ${updated.plan?.name}` : null,
    input.trialEndsAt !== undefined ? `trial ends ${input.trialEndsAt ?? '—'}` : null,
    input.subscriptionEndsAt !== undefined ? `subscription ends ${input.subscriptionEndsAt ?? '—'}` : null,
    input.reason ? `reason: ${input.reason}` : null,
  ]
    .filter(Boolean)
    .join('; ');
  await ctx.audit('UPDATE', 'School', id, `${school.name}: ${summary}`);
  await writeAudit({ schoolId: id, userId: ctx.user.id, userName: `${ctx.user.name} (platform)`, role: 'PLATFORM_ADMIN', action: 'UPDATE', entity: 'Subscription', entityId: id, summary, ip: ctx.ip });
  return updated;
});
