import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { query, route } from '@/server/api';
import { classLabel, displayName, todayUTC } from '@/server/common';
import { studentWhere } from '@/server/scope';
import { toPaise } from '@/server/services/money';

export const GET = route({ module: 'fees' }, async (ctx, req) => {
  const q = query(req, z.object({ classId: z.string().optional(), sectionId: z.string().optional(), minDays: z.coerce.number().int().min(0).max(365).default(0), minAmount: z.coerce.number().min(0).default(1) }));
  const today = todayUTC();
  const studentFilter: Prisma.StudentWhereInput = { AND: [await studentWhere(ctx), { status: 'ACTIVE' }, ...(q.classId ? [{ classId: q.classId }] : []), ...(q.sectionId ? [{ sectionId: q.sectionId }] : [])] };
  const invoices = await ctx.db.feeInvoice.findMany({
    where: { status: { in: ['UNPAID', 'PARTIAL'] }, dueDate: { lt: new Date(today.getTime() - q.minDays * 86_400_000 + 86_400_000) }, student: studentFilter },
    select: { studentId: true, total: true, paidAmount: true, dueDate: true, period: true, title: true },
  });
  const map = new Map<string, { due: number; oldest: Date; months: string[] }>();
  for (const i of invoices) {
    const m = map.get(i.studentId) ?? { due: 0, oldest: i.dueDate, months: [] };
    m.due += toPaise(i.total) - toPaise(i.paidAmount);
    if (i.dueDate < m.oldest) m.oldest = i.dueDate;
    m.months.push(i.title || i.period);
    map.set(i.studentId, m);
  }
  const ids = [...map.entries()].filter(([, v]) => v.due >= q.minAmount * 100).map(([k]) => k);
  const students = await ctx.db.student.findMany({
    where: { id: { in: ids } },
    select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, photoUrl: true, class: { select: { name: true, numericOrder: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true, primaryPhone: true } } },
  });
  const rows = students
    .map((s) => {
      const d = map.get(s.id)!;
      return {
        studentId: s.id,
        name: displayName(s),
        admissionNo: s.admissionNo,
        photoUrl: s.photoUrl,
        classLabel: classLabel(s.class, s.section),
        classOrder: s.class.numericOrder,
        guardian: s.guardian?.fatherName ?? s.guardian?.motherName ?? '',
        phone: s.guardian?.primaryPhone ?? '',
        due: d.due / 100,
        months: d.months.sort(),
        overdueDays: Math.max(0, Math.floor((today.getTime() - d.oldest.getTime()) / 86_400_000)),
      };
    })
    .sort((a, b) => b.due - a.due);
  return { rows, totalDue: rows.reduce((a, r) => a + r.due, 0), count: rows.length };
});
