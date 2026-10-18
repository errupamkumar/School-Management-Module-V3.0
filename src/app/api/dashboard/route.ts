import { route, type Ctx } from '@/server/api';
import { classLabel, currentAcademicYear, displayName, todayUTC } from '@/server/common';
import { classTeacherSectionIds, hasSchoolWideScope, ownClassSectionPairs } from '@/server/scope';
import { toPaise } from '@/server/services/money';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthStart(offset: number): Date {
  const n = new Date();
  return new Date(Date.UTC(n.getFullYear(), n.getMonth() + offset, 1));
}

async function schoolOverview(ctx: Ctx) {
  const today = todayUTC();
  const thisMonth = monthStart(0);
  const out: Record<string, unknown> = {};

  if (ctx.can('students')) {
    const [byGender, admissions, classStrength] = await Promise.all([
      ctx.db.student.groupBy({ by: ['gender'], where: { status: 'ACTIVE' }, _count: true }),
      ctx.db.student.count({ where: { status: 'ACTIVE', admissionDate: { gte: thisMonth } } }),
      ctx.db.class.findMany({ where: { isActive: true }, orderBy: { numericOrder: 'asc' }, select: { name: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
    ]);
    const count = (g: string) => byGender.find((x) => x.gender === g)?._count ?? 0;
    out.students = { total: byGender.reduce((a, x) => a + x._count, 0), boys: count('MALE'), girls: count('FEMALE'), newThisMonth: admissions };
    out.classStrength = classStrength.map((c) => ({ name: /^\d+$/.test(c.name) ? `Cl ${c.name}` : c.name, students: c._count.students }));
  }

  if (ctx.can('employees')) {
    const emp = await ctx.db.employee.groupBy({ by: ['isTeaching'], where: { status: 'ACTIVE' }, _count: true });
    out.employees = { total: emp.reduce((a, x) => a + x._count, 0), teaching: emp.find((x) => x.isTeaching)?._count ?? 0, nonTeaching: emp.find((x) => !x.isTeaching)?._count ?? 0 };
  }

  if (ctx.can('attendance')) {
    const [rows, sections, absentees] = await Promise.all([
      ctx.db.studentAttendance.groupBy({ by: ['status'], where: { date: today }, _count: true }),
      ctx.db.section.count(),
      ctx.db.studentAttendance.findMany({
        where: { date: today, status: 'ABSENT' },
        take: 8,
        select: { student: { select: { id: true, firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
      }),
    ]);
    const markedSections = await ctx.db.studentAttendance.groupBy({ by: ['sectionId'], where: { date: today } });
    const get = (s: string) => rows.find((r) => r.status === s)?._count ?? 0;
    const marked = rows.reduce((a, r) => a + r._count, 0);
    out.attendance = {
      present: get('PRESENT') + get('LATE') + get('HALF_DAY'),
      absent: get('ABSENT'),
      leave: get('LEAVE'),
      marked,
      sectionsMarked: markedSections.length,
      sectionsTotal: sections,
      absentees: absentees.map((a) => ({ id: a.student.id, name: displayName(a.student), classLabel: classLabel(a.student.class, a.student.section) })),
    };
  }

  if (ctx.can('staff_attendance') && hasSchoolWideScope(ctx)) {
    const rows = await ctx.db.employeeAttendance.groupBy({ by: ['status'], where: { date: today }, _count: true });
    const total = await ctx.db.employee.count({ where: { status: 'ACTIVE' } });
    const present = rows.filter((r) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(r.status)).reduce((a, r) => a + r._count, 0);
    out.staffAttendance = { present, total, marked: rows.reduce((a, r) => a + r._count, 0) };
  }

  if (ctx.can('fees') && hasSchoolWideScope(ctx)) {
    const sixAgo = monthStart(-5);
    const [billed, collectedMonth, collectedToday, outstanding, payments, recent, modes] = await Promise.all([
      ctx.db.feeInvoice.aggregate({ where: { issueDate: { gte: thisMonth }, status: { not: 'CANCELLED' } }, _sum: { total: true } }),
      ctx.db.feePayment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: thisMonth } }, _sum: { amount: true } }),
      ctx.db.feePayment.aggregate({ where: { status: 'SUCCESS', paidAt: { gte: today } }, _sum: { amount: true } }),
      ctx.db.feeInvoice.aggregate({ where: { status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paidAmount: true }, _count: true }),
      ctx.db.feePayment.findMany({ where: { status: 'SUCCESS', paidAt: { gte: sixAgo } }, select: { amount: true, paidAt: true } }),
      ctx.db.feePayment.findMany({
        where: { status: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: { id: true, receiptNo: true, amount: true, mode: true, paidAt: true, student: { select: { firstName: true, lastName: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
      }),
      ctx.db.feePayment.groupBy({ by: ['mode'], where: { status: 'SUCCESS', paidAt: { gte: thisMonth } }, _sum: { amount: true } }),
    ]);
    const trend = Array.from({ length: 6 }, (_, i) => {
      const d = monthStart(i - 5);
      const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
      const sum = payments.filter((p) => `${p.paidAt.getUTCFullYear()}-${p.paidAt.getUTCMonth()}` === key).reduce((a, p) => a + toPaise(p.amount), 0);
      return { month: MONTHS[d.getUTCMonth()], collected: sum / 100 };
    });
    out.fees = {
      billedThisMonth: Number(billed._sum.total ?? 0),
      collectedThisMonth: Number(collectedMonth._sum.amount ?? 0),
      collectedToday: Number(collectedToday._sum.amount ?? 0),
      outstanding: (toPaise(outstanding._sum.total) - toPaise(outstanding._sum.paidAmount)) / 100,
      outstandingInvoices: outstanding._count,
      trend,
      modes: modes.map((m) => ({ mode: m.mode, amount: Number(m._sum.amount ?? 0) })),
      recent: recent.map((r) => ({ id: r.id, receiptNo: r.receiptNo, amount: Number(r.amount), mode: r.mode, paidAt: r.paidAt, student: displayName(r.student), classLabel: classLabel(r.student.class, r.student.section) })),
    };
  }

  if (ctx.can('accounts')) {
    const sixAgo = monthStart(-5);
    const entries = await ctx.db.ledgerEntry.findMany({ where: { date: { gte: sixAgo } }, select: { type: true, amount: true, date: true } });
    out.incomeExpense = Array.from({ length: 6 }, (_, i) => {
      const d = monthStart(i - 5);
      const inMonth = entries.filter((e) => e.date.getUTCFullYear() === d.getUTCFullYear() && e.date.getUTCMonth() === d.getUTCMonth());
      const sum = (t: string) => inMonth.filter((e) => e.type === t).reduce((a, e) => a + toPaise(e.amount), 0) / 100;
      return { month: MONTHS[d.getUTCMonth()], income: sum('INCOME'), expense: sum('EXPENSE') };
    });
  }

  const pending: Record<string, number> = {};
  if (ctx.can('leave', 'edit')) pending.leave = await ctx.db.leaveRequest.count({ where: { status: 'PENDING' } });
  if (ctx.can('admissions')) pending.enquiries = await ctx.db.admissionApplication.count({ where: { stage: { in: ['ENQUIRY', 'APPLIED'] } } });
  if (ctx.can('transport')) {
    const soon = new Date(Date.now() + 30 * 86_400_000);
    pending.vehicleCompliance = await ctx.db.vehicle.count({
      where: { isActive: true, OR: [{ insuranceExpiry: { lte: soon } }, { fitnessExpiry: { lte: soon } }, { pucExpiry: { lte: soon } }, { permitExpiry: { lte: soon } }] },
    });
  }
  if (ctx.can('library')) pending.overdueBooks = await ctx.db.bookIssue.count({ where: { returnedOn: null, dueOn: { lt: today } } });
  if (ctx.can('store')) {
    const products = await ctx.db.product.findMany({ where: { isActive: true }, select: { stock: true, reorderAt: true } });
    pending.lowStock = products.filter((p) => p.stock <= p.reorderAt).length;
  }
  out.pending = pending;

  if (ctx.can('students')) {
    const m = today.getUTCMonth() + 1;
    const d = today.getUTCDate();
    const [stu, emp] = await Promise.all([
      ctx.db.$queryRaw<Array<{ id: string; firstName: string; lastName: string | null }>>`SELECT id, firstName, lastName FROM Student WHERE schoolId = ${ctx.user.schoolId} AND status = 'ACTIVE' AND MONTH(dob) = ${m} AND DAY(dob) = ${d} LIMIT 10`,
      ctx.db.$queryRaw<Array<{ id: string; firstName: string; lastName: string | null }>>`SELECT id, firstName, lastName FROM Employee WHERE schoolId = ${ctx.user.schoolId} AND status = 'ACTIVE' AND MONTH(dob) = ${m} AND DAY(dob) = ${d} LIMIT 10`,
    ]);
    out.birthdays = [...stu.map((s) => ({ id: s.id, name: displayName(s), kind: 'Student' })), ...emp.map((e) => ({ id: e.id, name: displayName(e), kind: 'Staff' }))];
  }

  return out;
}

async function teacherOverview(ctx: Ctx) {
  const today = todayUTC();
  const dow = ((today.getUTCDay() + 6) % 7) + 1; // 1 = Monday
  const own = await classTeacherSectionIds(ctx);
  const [sections, periods, marked] = await Promise.all([
    ctx.db.section.findMany({ where: { id: { in: own } }, include: { class: { select: { name: true } }, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
    ctx.user.employeeId
      ? ctx.db.timetableEntry.findMany({
          where: { employeeId: ctx.user.employeeId, day: dow },
          include: { period: true, section: { include: { class: { select: { name: true } } } } },
          orderBy: { period: { sortOrder: 'asc' } },
        })
      : Promise.resolve([]),
    ctx.db.studentAttendance.groupBy({ by: ['sectionId'], where: { date: today, sectionId: { in: own } } }),
  ]);
  const subjects = await ctx.db.subject.findMany({ where: { id: { in: periods.map((p) => p.subjectId) } }, select: { id: true, name: true } });
  const markedSet = new Set(marked.map((m) => m.sectionId));
  return {
    myClasses: sections.map((s) => ({ id: s.id, label: classLabel(s.class, s), students: s._count.students, attendanceMarked: markedSet.has(s.id) })),
    todayTimetable: periods.map((p) => ({ period: p.period.name, time: `${p.period.startTime}–${p.period.endTime}`, classLabel: classLabel(p.section.class, p.section), subject: subjects.find((s) => s.id === p.subjectId)?.name ?? '' })),
  };
}

async function familyOverview(ctx: Ctx) {
  const pairs = await ownClassSectionPairs(ctx);
  const today = todayUTC();
  const monthFrom = monthStart(0);
  const dow = ((today.getUTCDay() + 6) % 7) + 1;
  const kids = await Promise.all(
    pairs.map(async (p) => {
      const [att, todayAtt, dues, homework, lastExam, timetable] = await Promise.all([
        ctx.db.studentAttendance.groupBy({ by: ['status'], where: { studentId: p.studentId, date: { gte: monthFrom } }, _count: true }),
        ctx.db.studentAttendance.findUnique({ where: { studentId_date: { studentId: p.studentId, date: today } }, select: { status: true } }),
        ctx.can('fees') ? ctx.db.feeInvoice.aggregate({ where: { studentId: p.studentId, status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paidAmount: true } }) : null,
        ctx.can('homework')
          ? ctx.db.homework.findMany({ where: { classId: p.classId, OR: [{ sectionId: null }, { sectionId: p.sectionId }], dueOn: { gte: today } }, orderBy: { dueOn: 'asc' }, take: 5 })
          : [],
        ctx.can('exams') ? ctx.db.exam.findFirst({ where: { isPublished: true, marks: { some: { studentId: p.studentId } } }, orderBy: { endDate: 'desc' } }) : null,
        ctx.can('timetable')
          ? ctx.db.timetableEntry.findMany({ where: { sectionId: p.sectionId, day: dow }, include: { period: true, employee: { select: { firstName: true, lastName: true } } }, orderBy: { period: { sortOrder: 'asc' } } })
          : [],
      ]);
      let examSummary = null;
      if (lastExam) {
        const marks = await ctx.db.examMark.findMany({ where: { examId: lastExam.id, studentId: p.studentId } });
        const schedules = await ctx.db.examSchedule.findMany({ where: { examId: lastExam.id, classId: p.classId } });
        const max = schedules.reduce((a, s) => a + Number(s.maxMarks), 0);
        const got = marks.reduce((a, m) => a + Number(m.marksObtained ?? 0), 0);
        examSummary = { examId: lastExam.id, name: lastExam.name, percentage: max ? Math.round((got / max) * 1000) / 10 : 0 };
      }
      const subjIds = [...new Set([...homework.map((h) => h.subjectId), ...timetable.map((t) => t.subjectId)])];
      const subjects = await ctx.db.subject.findMany({ where: { id: { in: subjIds } }, select: { id: true, name: true } });
      const sname = (id: string) => subjects.find((s) => s.id === id)?.name ?? '';
      const total = att.reduce((a, x) => a + x._count, 0);
      const present = att.filter((x) => ['PRESENT', 'LATE', 'HALF_DAY'].includes(x.status)).reduce((a, x) => a + x._count, 0);
      return {
        studentId: p.studentId,
        attendance: { percent: total ? Math.round((present / total) * 1000) / 10 : null, present, total, today: todayAtt?.status ?? null },
        dues: dues ? (toPaise(dues._sum.total) - toPaise(dues._sum.paidAmount)) / 100 : null,
        homework: homework.map((h) => ({ id: h.id, title: h.title, subject: sname(h.subjectId), dueOn: h.dueOn })),
        lastExam: examSummary,
        timetable: timetable.map((t) => ({ period: t.period.name, time: `${t.period.startTime}–${t.period.endTime}`, subject: sname(t.subjectId), teacher: t.employee ? displayName(t.employee) : null, isBreak: t.period.isBreak })),
      };
    })
  );
  const liveClasses = ctx.can('live_classes')
    ? await ctx.db.liveClass.findMany({
        where: {
          startsAt: { gte: new Date(Date.now() - 2 * 3600_000) },
          OR: [{ audience: 'ALL_STUDENTS' }, { classId: { in: pairs.map((p) => p.classId) }, sectionId: null }, { sectionId: { in: pairs.map((p) => p.sectionId) } }],
        },
        orderBy: { startsAt: 'asc' },
        take: 3,
      })
    : [];
  return { children: kids, liveClasses };
}

export const GET = route({ module: 'dashboard' }, async (ctx) => {
  const role = ctx.user.role;
  const [notices, events, ay] = await Promise.all([
    ctx.can('notices')
      ? ctx.db.notice.findMany({
          where: { publishAt: { lte: new Date() }, OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] },
          orderBy: [{ isPinned: 'desc' }, { publishAt: 'desc' }],
          take: 12,
        })
      : [],
    ctx.can('events') ? ctx.db.event.findMany({ where: { startDate: { gte: todayUTC() } }, orderBy: { startDate: 'asc' }, take: 5 }) : [],
    currentAcademicYear(ctx),
  ]);
  const visibleNotices = notices
    .filter((n) => {
      const a = n.audience as { roles?: string[] } | null;
      return !a?.roles?.length || a.roles.includes(role) || hasSchoolWideScope(ctx);
    })
    .slice(0, 5)
    .map((n) => ({ id: n.id, title: n.title, category: n.category, publishAt: n.publishAt, isPinned: n.isPinned }));

  const base = { academicYear: ay, notices: visibleNotices, events };
  if (role === 'PARENT' || role === 'STUDENT') return { kind: 'family', ...base, ...(await familyOverview(ctx)) };
  // Teachers see only their own classes, never school-wide student data.
  if (role === 'TEACHER') return { kind: 'teacher', ...base, ...(await teacherOverview(ctx)) };
  return { kind: 'school', ...base, ...(await schoolOverview(ctx)) };
});
