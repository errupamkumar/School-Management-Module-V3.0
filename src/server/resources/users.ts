import type { Role } from '@prisma/client';
import { forbidden, type Ctx } from '../api';
import { hasSchoolWideScope, studentWhere } from '../scope';
import type { ModuleKey } from '@/lib/modules';

/** Which module governs accounts of a given role. */
export function moduleForRole(role: Role): ModuleKey {
  if (role === 'STUDENT') return 'students';
  if (role === 'PARENT') return 'guardians';
  return 'employees';
}

/**
 * Guards administrative actions on another user's account. Owners can only be
 * managed by owners; admins only by owners; nobody manages themselves here.
 */
export async function assertCanManage(ctx: Ctx, target: { id: string; role: Role }, action: 'view' | 'edit') {
  if (target.id === ctx.user.id) throw forbidden('Use “My account” to change your own login.');
  if (target.role === 'PLATFORM_ADMIN') throw forbidden();
  if ((target.role === 'SUPER_ADMIN' || target.role === 'ADMIN') && ctx.user.role !== 'SUPER_ADMIN') {
    throw forbidden('Only the school owner can manage administrator accounts.');
  }
  if (!ctx.can(moduleForRole(target.role), action)) throw forbidden();
  // Section-scoped staff (teachers) may only manage their own students' and families' logins.
  if (!hasSchoolWideScope(ctx) && (target.role === 'STUDENT' || target.role === 'PARENT')) {
    const scope = await studentWhere(ctx);
    const n = await ctx.db.student.count({ where: { AND: [scope, target.role === 'STUDENT' ? { userId: target.id } : { guardian: { userId: target.id } }] } });
    if (!n) throw forbidden();
  }
}
