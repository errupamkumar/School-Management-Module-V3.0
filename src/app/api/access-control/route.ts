import { MODULES } from '@/lib/modules';
import { route } from '@/server/api';
import { EDITABLE_ROLES, canEditRole, configuredMatrix, planModules } from '@/server/access';

/** Module switches and the role × module permission matrix. */
export const GET = route({ module: 'access_control' }, async (ctx) => {
  const [plan, toggles, matrix, school] = await Promise.all([
    planModules(ctx),
    ctx.db.schoolModule.findMany(),
    configuredMatrix(ctx),
    ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { plan: { select: { name: true } } } }),
  ]);
  const off = new Set(toggles.filter((t) => !t.enabled).map((t) => t.module));
  return {
    planName: school.plan?.name ?? null,
    modules: MODULES.map((m) => {
      const core = 'core' in m && !!m.core;
      const inPlan = core || !plan || plan.includes(m.key);
      return { key: m.key, label: m.label, labelHi: m.labelHi, group: m.group, description: m.description, core, inPlan, enabled: inPlan && (core || !off.has(m.key)) };
    }),
    roles: EDITABLE_ROLES.map((r) => ({ role: r, editable: canEditRole(ctx, r) && ctx.can('access_control', 'edit') })),
    matrix,
  };
});
