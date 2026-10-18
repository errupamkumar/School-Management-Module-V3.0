import { z } from 'zod';
import { MODULE_MAP, ROLES, ROLE_LABELS, defaultPerm, grantCeiling, isModuleKey, type ModuleKey, type SchoolRole } from '@/lib/modules';
import { badRequest, body, forbidden, query, route } from '@/server/api';
import { canEditRole } from '@/server/access';
import { invalidatePermissions } from '@/server/permissions';

const perm = z.object({ view: z.boolean(), create: z.boolean(), edit: z.boolean(), delete: z.boolean() });
const roleEnum = z.enum(ROLES);

/** Save per-role overrides. A cell equal to the default removes the override. */
export const PUT = route({ module: 'access_control', action: 'edit' }, async (ctx, req) => {
  const input = await body(req, z.object({ changes: z.array(z.object({ role: roleEnum, module: z.string(), perm })).min(1).max(500) }));
  const ops = [];
  for (const c of input.changes) {
    if (!isModuleKey(c.module)) throw badRequest(`Unknown module ${c.module}.`);
    if (!canEditRole(ctx, c.role)) throw forbidden(c.role === 'ADMIN' ? 'Only the owner can change Principal/Admin permissions.' : 'This role cannot be changed.');
    const mod = c.module as ModuleKey;
    const ceiling = grantCeiling(mod, c.role as SchoolRole);
    for (const a of ['view', 'create', 'edit', 'delete'] as const) {
      if (c.perm[a] && !ceiling[a]) throw badRequest(`${ROLE_LABELS[c.role]} cannot be given “${a}” on ${MODULE_MAP[mod].label}.`);
    }
    // Write rights imply view.
    const p = { ...c.perm, view: c.perm.view || c.perm.create || c.perm.edit || c.perm.delete };
    const def = defaultPerm(mod, c.role as SchoolRole);
    const key = { schoolId_role_module: { schoolId: ctx.user.schoolId, role: c.role, module: mod } };
    if (p.view === def.view && p.create === def.create && p.edit === def.edit && p.delete === def.delete) {
      ops.push(ctx.db.rolePermission.deleteMany({ where: { role: c.role, module: mod } }));
    } else {
      const data = { canView: p.view, canCreate: p.create, canEdit: p.edit, canDelete: p.delete };
      ops.push(ctx.db.rolePermission.upsert({ where: key, update: data, create: { schoolId: ctx.user.schoolId, role: c.role, module: mod, ...data } }));
    }
  }
  await ctx.db.$transaction(ops);
  invalidatePermissions(ctx.user.schoolId);
  const roles = [...new Set(input.changes.map((c) => ROLE_LABELS[c.role]))].join(', ');
  await ctx.audit('UPDATE', 'RolePermission', null, `${input.changes.length} permission(s) changed for ${roles}`);
  return { updated: input.changes.length };
});

/** Reset one role to the product defaults. */
export const DELETE = route({ module: 'access_control', action: 'edit' }, async (ctx, req) => {
  const q = query(req, z.object({ role: roleEnum }));
  if (!canEditRole(ctx, q.role)) throw forbidden();
  const { count } = await ctx.db.rolePermission.deleteMany({ where: { role: q.role } });
  invalidatePermissions(ctx.user.schoolId);
  await ctx.audit('UPDATE', 'RolePermission', null, `${ROLE_LABELS[q.role]} reset to defaults (${count} overrides removed)`);
  return { removed: count };
});
