import { z } from 'zod';
import { badRequest, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { advanceBalances, studentDues } from '@/server/services/fees';

/** Outstanding invoices for one student, or for every sibling in the family (`family=1`). */
export const GET = route({ module: 'fees' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().min(1), family: z.enum(['1', '0']).default('0') }));
  await assertStudentAccess(ctx, q.studentId);
  const student = await ctx.db.student.findUniqueOrThrow({
    where: { id: q.studentId },
    select: { id: true, firstName: true, lastName: true, admissionNo: true, photoUrl: true, guardianId: true, feeDiscountPercent: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true, primaryPhone: true, familyCode: true } } },
  });
  let members = [student.id];
  if (q.family === '1') {
    if (!student.guardianId) throw badRequest('This student is not linked to a family.');
    const sibs = await ctx.db.student.findMany({ where: { guardianId: student.guardianId, status: 'ACTIVE' }, select: { id: true } });
    members = sibs.map((s) => s.id);
  }
  const [{ invoices, totalDue }, recent, advance] = await Promise.all([
    studentDues(ctx.db, members),
    ctx.db.feePayment.findMany({ where: { studentId: { in: members } }, orderBy: { paidAt: 'desc' }, take: 8, select: { id: true, receiptNo: true, amount: true, mode: true, paidAt: true, status: true, studentId: true } }),
    advanceBalances(ctx.db, ctx.user.schoolId, members),
  ]);
  const today = new Date();
  return {
    student: { ...student, name: displayName(student), classLabel: classLabel(student.class, student.section) },
    members,
    totalDue: totalDue / 100,
    /** Unused advance (paid beyond the dues), used automatically on the next invoices. */
    advance: [...advance.values()].reduce((a, v) => a + v, 0) / 100,
    allowAdvance: ctx.school.settings.fees.allowAdvance,
    overdue: invoices.filter((i) => i.dueDate < today).reduce((a, i) => a + Number(i.total) - Number(i.paidAmount), 0),
    invoices: invoices.map((i) => ({ ...i, studentName: displayName(i.student), balance: Number(i.total) - Number(i.paidAmount), overdue: i.dueDate < today })),
    recent,
  };
});
