import { z } from 'zod';
import { query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { paybooksAttendanceCsv, paybooksEmployeesCsv } from '@/server/services/exporters';

/**
 * Payroll export for Paybooks (or any payroll service that takes the same
 * layout): the employee master, or one month's attendance with loss-of-pay
 * days. Needs Payroll edit rights because it contains bank and PAN details.
 *   ?kind=employees | ?kind=attendance&month=YYYY-MM
 */
export const GET = route({ module: 'payroll', action: 'edit' }, async (ctx, req) => {
  const q = query(req, z.object({ kind: z.enum(['employees', 'attendance']).default('employees'), month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/).optional() }));
  const employees = await ctx.db.employee.findMany({ where: { status: 'ACTIVE' }, orderBy: { employeeCode: 'asc' } });
  let csv: string;
  let filename: string;
  if (q.kind === 'employees') {
    csv = paybooksEmployeesCsv(employees.map((e) => ({ ...e, gender: e.gender, basicSalary: Number(e.basicSalary), allowances: Number(e.allowances), deductions: Number(e.deductions) })));
    filename = `paybooks-employees-${ctx.school.code}.csv`;
  } else {
    const month = q.month ?? new Date().toISOString().slice(0, 7);
    const [y, m] = month.split('-').map(Number);
    const from = new Date(Date.UTC(y, m - 1, 1));
    const to = new Date(Date.UTC(y, m, 1));
    const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
    const att = await ctx.db.employeeAttendance.groupBy({ by: ['employeeId', 'status'], where: { date: { gte: from, lt: to } }, _count: true });
    const n = (id: string, s: string) => att.find((a) => a.employeeId === id && a.status === s)?._count ?? 0;
    csv = paybooksAttendanceCsv(
      month,
      days,
      employees.map((e) => ({ employeeCode: e.employeeCode, name: displayName(e), present: n(e.id, 'PRESENT') + n(e.id, 'LATE'), halfDays: n(e.id, 'HALF_DAY'), leave: n(e.id, 'LEAVE'), absent: n(e.id, 'ABSENT'), holidays: n(e.id, 'HOLIDAY') }))
    );
    filename = `paybooks-attendance-${ctx.school.code}-${month}.csv`;
  }
  await ctx.audit('EXPORT', 'Payroll', null, filename);
  return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'no-store' } });
});
