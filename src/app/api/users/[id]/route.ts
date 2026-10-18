import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { assertCanManage } from '@/server/resources/users';
import { resetLogin } from '@/server/services/people';
import { STAFF_ROLES } from '@/lib/modules';

/** Activate/deactivate an account or change a staff member's role. */
export const PATCH = route({ anyOf: [{ module: 'students', action: 'edit' }, { module: 'guardians', action: 'edit' }, { module: 'employees', action: 'edit' }] }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ isActive: z.boolean().optional(), role: z.enum(STAFF_ROLES as [string, ...string[]]).optional(), unlock: z.boolean().optional() }));
  const target = await ctx.db.user.findUniqueOrThrow({ where: { id }, select: { id: true, role: true } });
  await assertCanManage(ctx, target, 'edit');
  if (input.role) {
    if (!STAFF_ROLES.includes(target.role as never)) throw badRequest('Only staff roles can be changed.');
    if (input.role === 'SUPER_ADMIN' && ctx.user.role !== 'SUPER_ADMIN') throw forbidden('Only the owner can grant owner access.');
    if (input.role === 'ADMIN' && ctx.user.role !== 'SUPER_ADMIN') throw forbidden('Only the owner can grant administrator access.');
  }
  await ctx.db.user.update({
    where: { id },
    data: {
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.role ? { role: input.role as never } : {}),
      ...(input.unlock ? { lockedUntil: null, failedLoginCount: 0 } : {}),
      // Any privilege change signs the user out everywhere so it takes effect immediately.
      ...(input.isActive === false || input.role ? { sessionVersion: { increment: 1 } } : {}),
    },
  });
  await ctx.audit('UPDATE', 'User', id, JSON.stringify(input));
  return { updated: true };
});

/** Issue a new temporary password (shown once) and sign the user out everywhere. */
export const POST = route({ anyOf: [{ module: 'students', action: 'edit' }, { module: 'guardians', action: 'edit' }, { module: 'employees', action: 'edit' }] }, async (ctx, _req, { id }) => {
  const target = await ctx.db.user.findUniqueOrThrow({ where: { id }, select: { id: true, role: true } });
  await assertCanManage(ctx, target, 'edit');
  const credential = await resetLogin(ctx.db, id);
  await ctx.audit('PASSWORD_RESET', 'User', id, `Temporary password issued for ${credential.username}`);
  return credential;
});
