import type { Ctx } from '../api';
import { forbidden } from '../api';
import { todayUTC } from '../common';

export const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'LEAVE', 'HOLIDAY'] as const;

/** Staff other than owner/admin can only edit attendance within the configured window. */
export function assertEditable(ctx: Ctx, date: Date) {
  const today = todayUTC();
  if (date > today) throw forbidden('Attendance cannot be marked for a future date.');
  if (ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'ADMIN') return;
  const days = Math.floor((today.getTime() - date.getTime()) / 86_400_000);
  if (days > ctx.school.settings.attendance.allowEditAfterDays) {
    throw forbidden(`Attendance older than ${ctx.school.settings.attendance.allowEditAfterDays} day(s) is locked. Ask the principal to correct it.`);
  }
}

export async function holidayOn(ctx: Ctx, date: Date): Promise<string | null> {
  const ev = await ctx.db.event.findFirst({
    where: { kind: 'HOLIDAY', startDate: { lte: date }, OR: [{ endDate: null, startDate: date }, { endDate: { gte: date } }] },
    select: { title: true },
  });
  return ev?.title ?? null;
}

export function isWorkingDay(ctx: Ctx, date: Date): boolean {
  const dow = ((date.getUTCDay() + 6) % 7) + 1; // 1 = Monday … 7 = Sunday
  return ctx.school.settings.workingDays.includes(dow);
}

export function monthRange(month: string): { from: Date; to: Date; days: number } {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(Date.UTC(y, m - 1, 1));
  const to = new Date(Date.UTC(y, m, 0));
  return { from, to, days: to.getUTCDate() };
}
