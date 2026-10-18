import type { Role } from '@prisma/client';
import { prisma } from './db';
import {
  FULL_PERM,
  MODULES,
  MODULE_MAP,
  NO_PERM,
  defaultPerm,
  grantCeiling,
  isModuleKey,
  type ModuleKey,
  type Perm,
  type PermissionMap,
  type SchoolRole,
} from '@/lib/modules';

interface CacheEntry {
  at: number;
  enabled: Set<ModuleKey>;
  overrides: Map<string, Perm>; // `${role}:${module}`
}

const TTL_MS = 30_000;
const cache = new Map<string, CacheEntry>();

/** Call after any change to modules, permissions or the school's plan. */
export function invalidatePermissions(schoolId: string): void {
  cache.delete(schoolId);
}

async function load(schoolId: string): Promise<CacheEntry> {
  const hit = cache.get(schoolId);
  if (hit && Date.now() - hit.at < TTL_MS) return hit;

  const [school, toggles, overrides] = await Promise.all([
    prisma.school.findUnique({ where: { id: schoolId }, select: { plan: { select: { modules: true } } } }),
    prisma.schoolModule.findMany({ where: { schoolId } }),
    prisma.rolePermission.findMany({ where: { schoolId } }),
  ]);

  const planModules = Array.isArray(school?.plan?.modules) ? (school!.plan!.modules as string[]) : null;
  const disabled = new Set(toggles.filter((t) => !t.enabled).map((t) => t.module));
  const enabled = new Set<ModuleKey>();
  for (const m of MODULES) {
    const inPlan = MODULE_MAP[m.key].core || !planModules || planModules.includes(m.key);
    const switchedOn = MODULE_MAP[m.key].core || !disabled.has(m.key);
    if (inPlan && switchedOn) enabled.add(m.key);
  }

  const map = new Map<string, Perm>();
  for (const o of overrides) {
    if (!isModuleKey(o.module)) continue;
    map.set(`${o.role}:${o.module}`, { view: o.canView, create: o.canCreate, edit: o.canEdit, delete: o.canDelete });
  }

  const entry = { at: Date.now(), enabled, overrides: map };
  cache.set(schoolId, entry);
  return entry;
}

export async function enabledModules(schoolId: string): Promise<Set<ModuleKey>> {
  return (await load(schoolId)).enabled;
}

export async function resolvePermissions(schoolId: string, role: Role): Promise<PermissionMap> {
  const { enabled, overrides } = await load(schoolId);
  const out: PermissionMap = {};
  for (const m of MODULES) {
    if (!enabled.has(m.key)) {
      out[m.key] = NO_PERM;
      continue;
    }
    if (role === 'SUPER_ADMIN') {
      out[m.key] = FULL_PERM;
      continue;
    }
    if (role === 'PLATFORM_ADMIN') {
      out[m.key] = NO_PERM;
      continue;
    }
    const override = overrides.get(`${role}:${m.key}`);
    const raw = override ?? defaultPerm(m.key, role as SchoolRole);
    // Overrides saved before a ceiling existed (or written directly) can never exceed it.
    const cap = grantCeiling(m.key, role as SchoolRole);
    const perm = { view: raw.view && cap.view, create: raw.create && cap.create, edit: raw.edit && cap.edit, delete: raw.delete && cap.delete };
    // Any write right implies the ability to see the module.
    out[m.key] = { ...perm, view: perm.view || perm.create || perm.edit || perm.delete };
  }
  return out;
}
