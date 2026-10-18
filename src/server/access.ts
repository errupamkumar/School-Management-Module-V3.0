import { MODULES, ROLES, defaultPerm, grantCeiling, type ModuleKey, type Perm, type SchoolRole } from '@/lib/modules';
import type { Ctx } from './api';

/** Roles shown in the permission matrix (the owner is always unrestricted). */
export const EDITABLE_ROLES = ROLES.filter((r) => r !== 'SUPER_ADMIN') as Exclude<SchoolRole, 'SUPER_ADMIN'>[];

/** Only the owner may change the Principal/Admin row, so an admin cannot widen their own rights. */
export function canEditRole(ctx: Ctx, role: SchoolRole): boolean {
  if (role === 'SUPER_ADMIN') return false;
  if (role === 'ADMIN') return ctx.user.role === 'SUPER_ADMIN';
  return true;
}

export async function planModules(ctx: Ctx): Promise<string[] | null> {
  const s = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { plan: { select: { name: true, modules: true } } } });
  return Array.isArray(s.plan?.modules) ? (s.plan!.modules as string[]) : null;
}

/** Configured (not effective) rights per role and module: override ?? default. */
export async function configuredMatrix(ctx: Ctx) {
  const overrides = await ctx.db.rolePermission.findMany();
  const byKey = new Map(overrides.map((o) => [`${o.role}:${o.module}`, { view: o.canView, create: o.canCreate, edit: o.canEdit, delete: o.canDelete } satisfies Perm]));
  const matrix: Record<string, Record<string, Perm & { overridden: boolean; ceiling: Perm }>> = {};
  for (const role of EDITABLE_ROLES) {
    matrix[role] = {};
    for (const m of MODULES) {
      const o = byKey.get(`${role}:${m.key}`);
      matrix[role][m.key] = { ...(o ?? defaultPerm(m.key, role)), overridden: !!o, ceiling: grantCeiling(m.key as ModuleKey, role) };
    }
  }
  return matrix;
}
