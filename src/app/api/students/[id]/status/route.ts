import { z } from 'zod';
import { body, route } from '@/server/api';
import { toDate, zDate } from '@/server/crud';
import { assertStudentCapacity } from '@/server/services/people';

/** Mark a student as left / transferred / passed out, or re-activate. Logins follow the status. */
export const POST = route({ module: 'students', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'DROPPED']),
      leftOn: zDate.optional().nullable(),
      reason: z.string().trim().max(300).optional().nullable(),
    })
  );
  const s = await ctx.db.student.findUniqueOrThrow({ where: { id }, select: { userId: true, guardianId: true, admissionNo: true, status: true } });
  const active = input.status === 'ACTIVE';
  if (active && s.status !== 'ACTIVE') await assertStudentCapacity(ctx.db, ctx.user.schoolId);
  await ctx.db.$transaction(async (tx) => {
    await tx.student.update({
      where: { id },
      data: { status: input.status, leftOn: active ? null : toDate(input.leftOn) ?? new Date(), leavingReason: active ? null : input.reason ?? null },
    });
    if (s.userId) await tx.user.update({ where: { id: s.userId }, data: { isActive: active, ...(active ? {} : { sessionVersion: { increment: 1 } }) } });
    // A parent login stays active while any child is still enrolled.
    if (s.guardianId) {
      const g = await tx.guardian.findUnique({ where: { id: s.guardianId }, select: { userId: true } });
      if (g?.userId) {
        const stillEnrolled = await tx.student.count({ where: { guardianId: s.guardianId, status: 'ACTIVE' } });
        await tx.user.update({ where: { id: g.userId }, data: { isActive: stillEnrolled > 0 } });
      }
    }
  });
  await ctx.audit('UPDATE', 'Student', id, `Status → ${input.status}${input.reason ? ` (${input.reason})` : ''}`);
  return { status: input.status };
});
