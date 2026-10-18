import { z } from 'zod';
import { badRequest, body, forbidden, query, route } from '@/server/api';
import { dayUTC, displayName } from '@/server/common';
import { ATTENDANCE_STATUSES, assertEditable, holidayOn, isWorkingDay, monthRange } from '@/server/services/attendance';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM').optional().nullable().or(z.literal('').transform(() => null));

/**
 * ?date=YYYY-MM-DD           roster for marking (admins)
 * ?month=YYYY-MM             monthly register; non-admins get only their own row
 */
export const GET = route({ module: 'staff_attendance' }, async (ctx, req) => {
  const sp = req.nextUrl.searchParams;
  if (sp.get('month')) {
    const q = query(req, z.object({ month: z.string().regex(/^\d{4}-\d{2}$/) }));
    const { from, to, days } = monthRange(q.month);
    const own = !ctx.can('staff_attendance', 'create');
    if (own && !ctx.user.employeeId) throw forbidden();
    const [employees, rows] = await Promise.all([
      ctx.db.employee.findMany({ where: own ? { id: ctx.user.employeeId! } : { status: 'ACTIVE' }, orderBy: { firstName: 'asc' }, select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true } }),
      ctx.db.employeeAttendance.findMany({ where: { date: { gte: from, lte: to }, ...(own ? { employeeId: ctx.user.employeeId! } : {}) } }),
    ]);
    const CODE: Record<string, string> = { PRESENT: 'P', ABSENT: 'A', LATE: 'L', HALF_DAY: 'H', LEAVE: 'LV', HOLIDAY: 'HO' };
    const dayList = Array.from({ length: days }, (_, i) => new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), i + 1)));
    return {
      month: q.month,
      days: dayList.map((d) => ({ day: d.getUTCDate(), working: isWorkingDay(ctx, d) })),
      employees: employees.map((e) => {
        const mine = rows.filter((r) => r.employeeId === e.id);
        const present = mine.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
        return {
          employeeId: e.id,
          name: displayName(e),
          code: e.employeeCode,
          designation: e.designation,
          marks: dayList.map((d) => {
            const r = mine.find((x) => x.date.getTime() === d.getTime());
            return r ? { code: CODE[r.status], in: r.inTime, out: r.outTime } : null;
          }),
          present,
          absent: mine.filter((r) => r.status === 'ABSENT').length,
          leave: mine.filter((r) => r.status === 'LEAVE').length,
          late: mine.filter((r) => r.status === 'LATE').length,
        };
      }),
    };
  }

  if (!ctx.can('staff_attendance', 'create')) throw forbidden();
  const q = query(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  const date = dayUTC(q.date);
  const [employees, marks, leaves, holiday] = await Promise.all([
    ctx.db.employee.findMany({ where: { status: 'ACTIVE', joiningDate: { lte: date } }, orderBy: [{ isTeaching: 'desc' }, { firstName: 'asc' }], select: { id: true, firstName: true, lastName: true, employeeCode: true, designation: true, photoUrl: true } }),
    ctx.db.employeeAttendance.findMany({ where: { date } }),
    ctx.db.leaveRequest.findMany({ where: { status: 'APPROVED', employeeId: { not: null }, fromDate: { lte: date }, toDate: { gte: date } }, select: { employeeId: true } }),
    holidayOn(ctx, date),
  ]);
  const onLeave = new Set(leaves.map((l) => l.employeeId));
  return {
    date: q.date,
    holiday,
    isWorkingDay: isWorkingDay(ctx, date),
    marked: marks.length > 0,
    roster: employees.map((e) => {
      const m = marks.find((x) => x.employeeId === e.id);
      return { employeeId: e.id, name: displayName(e), code: e.employeeCode, designation: e.designation, photoUrl: e.photoUrl, status: m?.status ?? (onLeave.has(e.id) ? 'LEAVE' : null), inTime: m?.inTime ?? null, outTime: m?.outTime ?? null, remarks: m?.remarks ?? null };
    }),
  };
});

export const PUT = route({ module: 'staff_attendance', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      entries: z.array(z.object({ employeeId: z.string().min(1), status: z.enum(ATTENDANCE_STATUSES), inTime: time, outTime: time, remarks: z.string().trim().max(200).optional().nullable() })).min(1).max(1000),
    })
  );
  const date = dayUTC(input.date);
  assertEditable(ctx, date);
  const ids = input.entries.map((e) => e.employeeId);
  const valid = await ctx.db.employee.count({ where: { id: { in: ids } } });
  if (valid !== new Set(ids).size) throw badRequest('Unknown employee in list.');
  await ctx.db.$transaction(
    input.entries.map((e) =>
      ctx.db.employeeAttendance.upsert({
        where: { employeeId_date: { employeeId: e.employeeId, date } },
        update: { status: e.status, inTime: e.inTime ?? null, outTime: e.outTime ?? null, remarks: e.remarks ?? null, markedById: ctx.user.id },
        create: { schoolId: ctx.user.schoolId, employeeId: e.employeeId, date, status: e.status, inTime: e.inTime ?? null, outTime: e.outTime ?? null, remarks: e.remarks ?? null, markedById: ctx.user.id },
      })
    )
  );
  await ctx.audit('UPDATE', 'StaffAttendance', null, `${input.date}: ${input.entries.length} staff marked`);
  return { saved: input.entries.length };
});
