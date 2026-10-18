import { route } from '@/server/api';
import { advanceBalances } from '@/server/services/fees';
import { currentAcademicYear } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { computeClassResults } from '@/server/services/exams';
import { toPaise } from '@/server/services/money';

/** Student 360°: attendance, fees, results, tests, behaviour, library — each gated by module permission. */
export const GET = route({ anyOf: [{ module: 'students' }, { module: 'attendance' }, { module: 'fees' }, { module: 'exams' }] }, async (ctx, _req, { id }) => {
  await assertStudentAccess(ctx, id);
  const student = await ctx.db.student.findUniqueOrThrow({ where: { id }, select: { classId: true, sectionId: true, admissionDate: true } });
  const ay = await currentAcademicYear(ctx);
  const year = await ctx.db.academicYear.findFirst({ where: { name: ay } });
  const from = year?.startDate ?? new Date(Date.UTC(new Date().getUTCFullYear(), 3, 1));
  const out: Record<string, unknown> = {};

  if (ctx.can('attendance')) {
    const rows = await ctx.db.studentAttendance.findMany({ where: { studentId: id, date: { gte: from } }, select: { date: true, status: true }, orderBy: { date: 'asc' } });
    const byMonth = new Map<string, { present: number; absent: number; late: number; leave: number }>();
    for (const r of rows) {
      const key = `${r.date.getUTCFullYear()}-${String(r.date.getUTCMonth() + 1).padStart(2, '0')}`;
      const m = byMonth.get(key) ?? { present: 0, absent: 0, late: 0, leave: 0 };
      if (r.status === 'PRESENT' || r.status === 'HALF_DAY') m.present++;
      else if (r.status === 'LATE') m.late++;
      else if (r.status === 'ABSENT') m.absent++;
      else if (r.status === 'LEAVE') m.leave++;
      byMonth.set(key, m);
    }
    const total = rows.filter((r) => r.status !== 'HOLIDAY').length;
    const present = rows.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).length;
    out.attendance = {
      percent: total ? Math.round((present / total) * 1000) / 10 : null,
      present,
      total,
      months: [...byMonth.entries()].map(([month, v]) => ({ month, ...v })),
      recent: rows.slice(-30).map((r) => ({ date: r.date, status: r.status })),
    };
  }

  if (ctx.can('fees')) {
    const [invoices, payments] = await Promise.all([
      ctx.db.feeInvoice.findMany({ where: { studentId: id }, orderBy: { period: 'desc' }, include: { items: true } }),
      ctx.db.feePayment.findMany({ where: { studentId: id }, orderBy: { paidAt: 'desc' } }),
    ]);
    const billed = invoices.filter((i) => i.status !== 'CANCELLED').reduce((a, i) => a + toPaise(i.total), 0);
    const paid = invoices.filter((i) => i.status !== 'CANCELLED').reduce((a, i) => a + toPaise(i.paidAmount), 0);
    const advance = (await advanceBalances(ctx.db, ctx.user.schoolId, [id])).get(id) ?? 0;
    out.fees = { billed: billed / 100, paid: paid / 100, due: (billed - paid) / 100, advance: advance / 100, invoices, payments };
  }

  if (ctx.can('exams')) {
    const exams = await ctx.db.exam.findMany({
      where: { academicYear: ay, schedules: { some: { classId: student.classId } }, ...(ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT' ? { isPublished: true } : {}) },
      orderBy: { startDate: 'asc' },
    });
    const results = [];
    for (const e of exams) {
      const r = await computeClassResults(ctx.db, ctx.school.settings, e.id, student.classId, { studentIds: [id] });
      const mine = r.results[0];
      if (mine && mine.subjects.some((s) => s.marks !== null || s.isAbsent)) results.push({ examId: e.id, examName: e.name, isPublished: e.isPublished, ...mine });
    }
    out.exams = results;
  }

  if (ctx.can('class_tests')) {
    const marks = await ctx.db.classTestMark.findMany({ where: { studentId: id }, include: { test: true }, orderBy: { test: { testDate: 'desc' } }, take: 20 });
    const subjects = await ctx.db.subject.findMany({ where: { id: { in: marks.map((m) => m.test.subjectId) } }, select: { id: true, name: true } });
    out.classTests = marks.map((m) => ({ id: m.id, title: m.test.title, date: m.test.testDate, subject: subjects.find((s) => s.id === m.test.subjectId)?.name, marks: m.marks, maxMarks: m.test.maxMarks, isAbsent: m.isAbsent }));
  }

  if (ctx.can('behaviour')) {
    const [ratings, observations] = await Promise.all([
      ctx.db.behaviourRating.findMany({ where: { studentId: id }, orderBy: [{ term: 'asc' }, { trait: 'asc' }] }),
      ctx.db.observation.findMany({
        where: { studentId: id, ...(ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT' ? { shareWithParent: true } : {}) },
        orderBy: { observedOn: 'desc' },
        take: 20,
      }),
    ]);
    out.behaviour = { ratings, observations };
  }

  if (ctx.can('library')) {
    out.library = await ctx.db.bookIssue.findMany({ where: { borrowerId: id }, include: { book: { select: { title: true, author: true } } }, orderBy: { issuedOn: 'desc' }, take: 20 });
  }
  if (ctx.can('activities')) {
    out.activities = await ctx.db.activityMember.findMany({ where: { studentId: id }, include: { activity: { select: { name: true, category: true } } } });
  }
  return out;
});
