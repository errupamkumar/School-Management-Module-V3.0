import { z } from 'zod';
import { MODULE_MAP, isModuleKey } from '@/lib/modules';
import { badRequest, body, forbidden, route } from '@/server/api';
import { planModules } from '@/server/access';
import { invalidatePermissions } from '@/server/permissions';

/** Switch whole modules on/off for everyone in the school. */
export const PUT = route({ module: 'access_control', action: 'edit' }, async (ctx, req) => {
  const input = await body(req, z.object({ changes: z.array(z.object({ module: z.string(), enabled: z.boolean() })).min(1).max(60) }));
  const plan = await planModules(ctx);
  for (const c of input.changes) {
    if (!isModuleKey(c.module)) throw badRequest(`Unknown module ${c.module}.`);
    const def = MODULE_MAP[c.module];
    if (def.core) throw badRequest(`${def.label} is a core module and cannot be switched off.`);
    if (c.enabled && plan && !plan.includes(c.module)) throw forbidden(`${def.label} is not included in your subscription plan.`);
  }
  await ctx.db.$transaction(
    input.changes.map((c) =>
      ctx.db.schoolModule.upsert({
        where: { schoolId_module: { schoolId: ctx.user.schoolId, module: c.module } },
        update: { enabled: c.enabled },
        create: { schoolId: ctx.user.schoolId, module: c.module, enabled: c.enabled },
      })
    )
  );
  invalidatePermissions(ctx.user.schoolId);
  await ctx.audit('UPDATE', 'SchoolModule', null, input.changes.map((c) => `${MODULE_MAP[c.module as keyof typeof MODULE_MAP].label} ${c.enabled ? 'on' : 'off'}`).join(', '));
  return { updated: input.changes.length };
});
