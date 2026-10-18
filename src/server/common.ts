import type { Ctx } from './api';
import { academicYearFor } from './services/fees';

/** The school's current academic year name (e.g. "2026-27"). */
export async function currentAcademicYear(ctx: Pick<Ctx, 'db'>): Promise<string> {
  const ay = await ctx.db.academicYear.findFirst({ where: { isCurrent: true }, select: { name: true } });
  return ay?.name ?? academicYearFor(new Date());
}

export function displayName(p: { firstName: string; lastName?: string | null }): string {
  return `${p.firstName} ${p.lastName ?? ''}`.trim();
}

export function classLabel(cls: { name: string }, sec?: { name: string } | null): string {
  const base = /^\d+$/.test(cls.name) ? `Class ${cls.name}` : cls.name;
  return sec ? `${base}-${sec.name}` : base;
}

/** Start of the given day in UTC, matching @db.Date storage. */
export function dayUTC(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function todayUTC(): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
}
