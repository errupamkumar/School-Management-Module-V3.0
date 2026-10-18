import type { Prisma } from '@prisma/client';
import { z } from 'zod';
import { notFound, query, route, type Ctx } from '@/server/api';
import { classLabel, dayUTC, displayName, todayUTC } from '@/server/common';
import { hasSchoolWideScope, studentWhere } from '@/server/scope';

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const MAX_ROWS = 5000;

async function scopedStudents(ctx: Ctx, extra: Prisma.StudentWhereInput = {}): Promise<Prisma.StudentWhereInput> {
  return { AND: [await studentWhere(ctx), extra] };
}

const byClass = (a: { class: { numericOrder: number }; section: { name: string } }, b: { class: { numericOrder: number }; section: { name: string } }) =>
  a.class.numericOrder - b.class.numericOrder || a.section.name.localeCompare(b.section.name);

/** Student information report with filters; the client chooses columns to export. */
async function students(ctx: Ctx, req: Parameters<Parameters<typeof route>[1]>[1]) {
  const q = query(
    req,
    z.object({
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'DROPPED', 'ALL']).default('ACTIVE'),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
      category: z.string().max(20).optional(),
      rte: z.enum(['yes', 'no']).optional(),
      transport: z.enum(['yes', 'no']).optional(),
    })
  );
  const where = await scopedStudents(ctx, {
    ...(q.classId ? { classId: q.classId } : {}),
    ...(q.sectionId ? { sectionId: q.sectionId } : {}),
    ...(q.status !== 'ALL' ? { status: q.status } : {}),
    ...(q.gender ? { gender: q.gender } : {}),
    ...(q.category ? { category: q.category } : {}),
    ...(q.rte ? { isRte: q.rte === 'yes' } : {}),
    ...(q.transport ? { transport: q.transport === 'yes' ? { isNot: null } : { is: null } } : {}),
  });
  const rows = await ctx.db.student.findMany({
    where,
    take: MAX_ROWS,
    select: {
      id: true, admissionNo: true, rollNo: true, firstName: true, lastName: true, gender: true, dob: true, bloodGroup: true, category: true, religion: true, isRte: true, penNo: true, apaarId: true,
      address: true, city: true, admissionDate: true, status: true, aadhaarLast4: true,
      class: { select: { name: true, numericOrder: true } }, section: { select: { name: true } },
      guardian: { select: { fatherName: true, motherName: true, primaryPhone: true, fatherEmail: true } },
      transport: { select: { route: { select: { name: true } }, stop: { select: { name: true } } } },
    },
  });
  rows.sort((a, b) => byClass(a, b) || (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  return {
    truncated: rows.length === MAX_ROWS,
    rows: rows.map((s) => ({
      id: s.id, admissionNo: s.admissionNo, rollNo: s.rollNo, name: displayName(s), classLabel: classLabel(s.class, s.section), gender: s.gender, dob: s.dob, bloodGroup: s.bloodGroup, category: s.category, religion: s.religion,
      isRte: s.isRte, penNo: s.penNo, apaarId: s.apaarId, aadhaar: s.aadhaarLast4 ? `XXXX-${s.aadhaarLast4}` : null, address: [s.address, s.city].filter(Boolean).join(', '), admissionDate: s.admissionDate, status: s.status,
      fatherName: s.guardian?.fatherName ?? null, motherName: s.guardian?.motherName ?? null, phone: s.guardian?.primaryPhone ?? null, email: s.guardian?.fatherEmail ?? null,
      transport: s.transport ? `${s.transport.route.name} · ${s.transport.stop.name}` : null,
    })),
  };
}

/** Family-wise contact directory. */
async function parents(ctx: Ctx) {
  const kids = await ctx.db.student.findMany({
    where: await scopedStudents(ctx, { status: 'ACTIVE', guardianId: { not: null } }),
    take: MAX_ROWS,
    select: { firstName: true, lastName: true, admissionNo: true, guardianId: true, class: { select: { name: true } }, section: { select: { name: true } } },
  });
  const ids = [...new Set(kids.map((k) => k.guardianId!))];
  const guardians = await ctx.db.guardian.findMany({
    where: { id: { in: ids } },
    select: { id: true, familyCode: true, fatherName: true, fatherPhone: true, fatherEmail: true, fatherOccupation: true, motherName: true, motherPhone: true, guardianName: true, guardianPhone: true, primaryPhone: true, address: true, userId: true },
  });
  return {
    rows: guardians
      .map((g) => {
        const children = kids.filter((k) => k.guardianId === g.id);
        return { ...g, hasLogin: !!g.userId, userId: undefined, children: children.map((c) => `${displayName(c)} (${classLabel(c.class, c.section)})`).join('; '), childCount: children.length };
      })
      .sort((a, b) => (a.fatherName ?? a.motherName ?? '').localeCompare(b.fatherName ?? b.motherName ?? '')),
  };
}

/** Class-wise strength by gender and social category (UDISE+ style). */
async function strength(ctx: Ctx) {
  const where = await scopedStudents(ctx, { status: 'ACTIVE' });
  const [groups, rte, sections] = await Promise.all([
    ctx.db.student.groupBy({ by: ['sectionId', 'gender', 'category'], where, _count: true }),
    ctx.db.student.groupBy({ by: ['sectionId'], where: { AND: [where, { isRte: true }] }, _count: true }),
    ctx.db.section.findMany({ select: { id: true, name: true, class: { select: { name: true, numericOrder: true } } } }),
  ]);
  const CATS = ['GENERAL', 'OBC', 'SC', 'ST', 'EWS'];
  const rows = sections
    .filter((s) => groups.some((g) => g.sectionId === s.id))
    .sort((a, b) => a.class.numericOrder - b.class.numericOrder || a.name.localeCompare(b.name))
    .map((s) => {
      const mine = groups.filter((g) => g.sectionId === s.id);
      const sum = (f: (g: (typeof mine)[number]) => boolean) => mine.filter(f).reduce((a, g) => a + g._count, 0);
      const cat = (c: string) => sum((g) => (g.category ?? '').toUpperCase() === c || (c === 'GENERAL' && ['GEN', 'GENERAL'].includes((g.category ?? '').toUpperCase())));
      return {
        sectionId: s.id,
        classLabel: classLabel(s.class, s),
        boys: sum((g) => g.gender === 'MALE'),
        girls: sum((g) => g.gender === 'FEMALE'),
        other: sum((g) => g.gender === 'OTHER'),
        total: sum(() => true),
        ...Object.fromEntries(CATS.map((c) => [c.toLowerCase(), cat(c)])),
        rte: rte.find((r) => r.sectionId === s.id)?._count ?? 0,
      };
    });
  const totals = rows.reduce<Record<string, number>>((acc, r) => {
    for (const [k, v] of Object.entries(r)) if (typeof v === 'number') acc[k] = (acc[k] ?? 0) + v;
    return acc;
  }, {});
  return { rows, totals };
}

/** Birthdays in a month (students in scope, plus staff for school-wide roles). */
async function birthdays(ctx: Ctx, req: Parameters<Parameters<typeof route>[1]>[1]) {
  const q = query(req, z.object({ month: z.coerce.number().int().min(1).max(12).default(new Date().getMonth() + 1) }));
  const [kids, staff] = await Promise.all([
    ctx.db.student.findMany({ where: await scopedStudents(ctx, { status: 'ACTIVE', dob: { not: null } }), select: { id: true, firstName: true, lastName: true, dob: true, photoUrl: true, class: { select: { name: true } }, section: { select: { name: true } } } }),
    hasSchoolWideScope(ctx) ? ctx.db.employee.findMany({ where: { status: 'ACTIVE', dob: { not: null } }, select: { id: true, firstName: true, lastName: true, dob: true, photoUrl: true, designation: true } }) : [],
  ]);
  const inMonth = (d: Date | null) => !!d && d.getUTCMonth() + 1 === q.month;
  const rows = [
    ...kids.filter((k) => inMonth(k.dob)).map((k) => ({ id: k.id, type: 'STUDENT' as const, name: displayName(k), detail: classLabel(k.class, k.section), dob: k.dob!, photoUrl: k.photoUrl })),
    ...staff.filter((e) => inMonth(e.dob)).map((e) => ({ id: e.id, type: 'EMPLOYEE' as const, name: displayName(e), detail: e.designation, dob: e.dob!, photoUrl: e.photoUrl })),
  ].sort((a, b) => a.dob.getUTCDate() - b.dob.getUTCDate() || a.name.localeCompare(b.name));
  return { month: q.month, rows: rows.map((r) => ({ ...r, day: r.dob.getUTCDate(), turning: new Date().getUTCFullYear() - r.dob.getUTCFullYear() })) };
}

/** Attendance % per student over a period (default: session to date) — flags those below the threshold. */
async function attendance(ctx: Ctx, req: Parameters<Parameters<typeof route>[1]>[1]) {
  const ay = await ctx.db.academicYear.findFirst({ where: { isCurrent: true }, select: { startDate: true } });
  const q = query(req, z.object({ from: ymd.optional(), to: ymd.optional(), sectionId: z.string().optional(), threshold: z.coerce.number().min(1).max(100).default(75) }));
  const from = q.from ? dayUTC(q.from) : ay?.startDate ?? new Date(Date.UTC(new Date().getUTCFullYear(), 3, 1));
  const to = q.to ? dayUTC(q.to) : todayUTC();
  const where = await scopedStudents(ctx, { status: 'ACTIVE', ...(q.sectionId ? { sectionId: q.sectionId } : {}) });
  const kids = await ctx.db.student.findMany({ where, take: MAX_ROWS, select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, sectionId: true, class: { select: { name: true, numericOrder: true } }, section: { select: { name: true } }, guardian: { select: { primaryPhone: true } } } });
  const marks = await ctx.db.studentAttendance.groupBy({ by: ['studentId', 'status'], where: { studentId: { in: kids.map((k) => k.id) }, date: { gte: from, lte: to }, status: { not: 'HOLIDAY' } }, _count: true });
  const rows = kids
    .sort((a, b) => byClass(a, b) || (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999))
    .map((k) => {
      const m = marks.filter((x) => x.studentId === k.id);
      const c = (s: string[]) => m.filter((x) => s.includes(x.status)).reduce((a, x) => a + x._count, 0);
      const total = c(['PRESENT', 'LATE', 'HALF_DAY', 'ABSENT', 'LEAVE']);
      const present = c(['PRESENT', 'LATE']) + c(['HALF_DAY']) * 0.5;
      const percent = total ? Math.round((present / total) * 1000) / 10 : null;
      return { id: k.id, name: displayName(k), admissionNo: k.admissionNo, rollNo: k.rollNo, classLabel: classLabel(k.class, k.section), sectionId: k.sectionId, phone: k.guardian?.primaryPhone ?? null, total, present, absent: c(['ABSENT']), leave: c(['LEAVE']), percent, below: percent !== null && percent < q.threshold };
    });
  const marked = rows.filter((r) => r.percent !== null);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
    threshold: q.threshold,
    average: marked.length ? Math.round((marked.reduce((a, r) => a + r.percent!, 0) / marked.length) * 10) / 10 : null,
    belowCount: rows.filter((r) => r.below).length,
    rows,
  };
}

export const GET = route({ module: 'reports' }, async (ctx, req, { type }) => {
  switch (type) {
    case 'students':
      return students(ctx, req);
    case 'parents':
      return parents(ctx);
    case 'strength':
      return strength(ctx);
    case 'birthdays':
      return birthdays(ctx, req);
    case 'attendance':
      return attendance(ctx, req);
    default:
      throw notFound('Report');
  }
});
