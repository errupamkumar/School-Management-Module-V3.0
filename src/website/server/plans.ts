/**
 * Live subscription plans for the website, read from the same table the
 * platform console edits. Returns null when the database is unreachable so
 * pages can render a "talk to us" fallback instead of failing.
 */
import { prisma } from '@/server/db';
import { MODULES, MODULE_MAP, isModuleKey, type ModuleGroup } from '@/lib/modules';

export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  pricePerStudent: number;
  maxStudents: number | null;
  maxCampuses: number | null;
  modules: string[];
  groups: { group: ModuleGroup; labels: string[] }[];
}

export async function getPublicPlans(): Promise<PublicPlan[] | null> {
  try {
    const rows = await prisma.subscriptionPlan.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
    return rows.map((p) => {
      const modules = (Array.isArray(p.modules) ? (p.modules as unknown[]) : []).filter((k): k is string => typeof k === 'string' && isModuleKey(k));
      const set = new Set(modules);
      const groups = new Map<ModuleGroup, string[]>();
      for (const m of MODULES) {
        if (!set.has(m.key)) continue;
        groups.set(m.group, [...(groups.get(m.group) ?? []), m.label]);
      }
      return {
        code: p.code,
        name: p.name,
        description: p.description,
        priceMonthly: Number(p.priceMonthly),
        pricePerStudent: Number(p.pricePerStudent),
        maxStudents: p.maxStudents,
        maxCampuses: p.maxCampuses,
        modules,
        groups: [...groups].map(([group, labels]) => ({ group, labels })),
      };
    });
  } catch (err) {
    console.error('[website] could not load plans', err);
    return null;
  }
}

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

export function planPrice(p: PublicPlan): { amount: string; unit: string } {
  if (p.priceMonthly > 0) return { amount: inr.format(p.priceMonthly), unit: '/ month' };
  if (p.pricePerStudent > 0) return { amount: inr.format(p.pricePerStudent), unit: '/ student / month' };
  return { amount: 'Custom', unit: 'talk to us' };
}

/** For a feature's modules: which plans include all of them, some of them, or none. */
export function planCoverage(plans: PublicPlan[], modules: string[]) {
  return plans.map((p) => {
    const have = modules.filter((m) => p.modules.includes(m));
    return { plan: p, level: have.length === modules.length ? ('full' as const) : have.length ? ('partial' as const) : ('none' as const), missing: modules.filter((m) => !have.includes(m)).map((m) => (isModuleKey(m) ? MODULE_MAP[m].label : m)) };
  });
}
