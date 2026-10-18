import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { classLabel, dayUTC, displayName } from '@/server/common';
import { assertSectionAccess, assertStudentAccess, hasSchoolWideScope, teacherSectionIds } from '@/server/scope';
import { holidayOn, isWorkingDay, monthRange } from '@/server/services/attendance';

const month = z.string().regex(/^\d{4}-\d{2}$/, 'Use YYYY-MM');

/**
 * ?view=register&sectionId&month   monthly register (students × days)
 * ?view=summary&date               class-wise summary for a day
 * ?view=student&studentId&month    one student's month (family portal)
 */
export const GET = route({ module: 'attendance' }, async (ctx, req) => {
  const view = req.nextUrl.searchParams.get('view') ?? 'register';

  if (view === 'student') {
    const q = query(req, z.object({ studentId: z.string(), month }));
    await assertStudentAccess(ctx, q.studentId);
    const { from, to, days } = monthRange(q.month);
    const rows = await ctx.db.studentAttendance.findMany({ where: { studentId: q.studentId, date: { gte: from, lte: to } }, select: { date: true, status: true, remarks: true } });
    const holidays = await ctx.db.event.findMany({ where: { kind: 'HOLIDAY', startDate: { lte: to }, OR: [{ endDate: null, startDate: { gte: from } }, { endDate: { gte: from } }] }, select: { title: true, startDate: true, endDate: true } });
    const out = Array.from({ length: days }, (_, i) => {
      const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), i + 1));
      const r = rows.find((x) => x.date.getTime() === d.getTime());
      const h = holidays.find((x) => x.startDate <= d && (x.endDate ?? x.startDate) >= d);
      return { date: d.toISOString().slice(0, 10), status: r?.status ?? (h ? 'HOLIDAY' : null), remarks: r?.remarks ?? h?.title ?? null, working: isWorkingDay(ctx, d) };
    });
    const counted = rows.filter((r) => r.status !== 'HOLIDAY');
    const present = counted.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
    return { days: out, present, total: counted.length, percent: counted.length ? Math.round((present / counted.length) * 1000) / 10 : null };
  }

  if (view === 'summary') {
    const q = query(req, z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
    const date = dayUTC(q.date);
    const sectionFilter = hasSchoolWideScope(ctx) ? {} : ctx.user.role === 'TEACHER' ? { id: { in: await teacherSectionIds(ctx) } } : null;
    if (!sectionFilter) throw forbidden();
    const [sections, marks, holiday] = await Promise.all([
      ctx.db.section.findMany({
        where: sectionFilter,
        include: { class: { select: { name: true, numericOrder: true } }, classTeacher: { select: { firstName: true, lastName: true } }, _count: { select: { students: { where: { status: 'ACTIVE' } } } } },
      }),
      ctx.db.studentAttendance.groupBy({ by: ['sectionId', 'status'], where: { date }, _count: true }),
      holidayOn(ctx, date),
    ]);
    sections.sort((a, b) => a.class.numericOrder - b.class.numericOrder || a.name.localeCompare(b.name));
    return {
      date: q.date,
      holiday,
      isWorkingDay: isWorkingDay(ctx, date),
      sections: sections.map((s) => {
        const m = marks.filter((x) => x.sectionId === s.id);
        const c = (st: string) => m.find((x) => x.status === st)?._count ?? 0;
        const marked = m.reduce((a, x) => a + x._count, 0);
        return { sectionId: s.id, label: classLabel(s.class, s), classTeacher: s.classTeacher ? displayName(s.classTeacher) : null, strength: s._count.students, marked, present: c('PRESENT') + c('LATE') + c('HALF_DAY'), absent: c('ABSENT'), leave: c('LEAVE') };
      }),
    };
  }

  const q = query(req, z.object({ sectionId: z.string(), month }));
  await assertSectionAccess(ctx, q.sectionId);
  const { from, to, days } = monthRange(q.month);
  const [section, students, rows] = await Promise.all([
    ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, include: { class: { select: { name: true } } } }),
    ctx.db.student.findMany({ where: { sectionId: q.sectionId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } }),
    ctx.db.studentAttendance.findMany({ where: { sectionId: q.sectionId, date: { gte: from, lte: to } }, select: { studentId: true, date: true, status: true } }),
  ]);
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  const CODE: Record<string, string> = { PRESENT: 'P', ABSENT: 'A', LATE: 'L', HALF_DAY: 'H', LEAVE: 'LV', HOLIDAY: 'HO' };
  const dayList = Array.from({ length: days }, (_, i) => new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), i + 1)));
  return {
    section: classLabel(section.class, section),
    month: q.month,
    days: dayList.map((d) => ({ day: d.getUTCDate(), working: isWorkingDay(ctx, d) })),
    students: students.map((s) => {
      const mine = rows.filter((r) => r.studentId === s.id);
      const marks = dayList.map((d) => {
        const r = mine.find((x) => x.date.getTime() === d.getTime());
        return r ? CODE[r.status] : '';
      });
      const present = mine.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
      const total = mine.filter((r) => r.status !== 'HOLIDAY').length;
      return { studentId: s.id, name: displayName(s), rollNo: s.rollNo, admissionNo: s.admissionNo, marks, present, absent: mine.filter((r) => r.status === 'ABSENT').length, total, percent: total ? Math.round((present / total) * 100) : null };
    }),
  };
});
