import { z } from 'zod';
import { body, conflict, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { amountInWords, toPaise } from '@/server/services/money';
import { cancelPayment, invoiceLabel } from '@/server/services/fees';

/** Receipt data for printing. */
export const GET = route({ module: 'fees' }, async (ctx, _req, { id }) => {
  const p = await ctx.db.feePayment.findUniqueOrThrow({
    where: { id },
    include: {
      allocations: { include: { invoice: { include: { items: true } } } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true, primaryPhone: true } } } },
    },
  });
  await assertStudentAccess(ctx, p.studentId);
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, phone: true, email: true, affiliationNo: true, board: true, city: true, state: true, pincode: true } });
  const pending = await ctx.db.feeInvoice.aggregate({ where: { studentId: p.studentId, status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paidAmount: true } });
  return {
    ...p,
    studentName: displayName(p.student),
    classLabel: classLabel(p.student.class, p.student.section),
    amountInWords: amountInWords(Number(p.amount)),
    lines: p.allocations.map((a) => ({ period: invoiceLabel(a.invoice), invoiceNo: a.invoice.invoiceNo, amount: a.amount, items: a.invoice.items })),
    balanceAfter: (toPaise(pending._sum.total) - toPaise(pending._sum.paidAmount)) / 100,
    school,
    footer: ctx.school.settings.fees.receiptFooter,
  };
});

/** Cancel a receipt (bounced cheque, wrong entry). Reverses the allocation and the ledger entry. */
export const POST = route({ module: 'fees', action: 'delete' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ reason: z.string().trim().min(3, 'Give a reason').max(200) }));
  const p = await ctx.db.feePayment.findUniqueOrThrow({ where: { id } });
  if (p.status === 'PENDING') throw conflict('Pending online payments cannot be cancelled here.');
  const res = await cancelPayment(ctx.db, id, input.reason);
  await ctx.audit('CANCEL', 'FeePayment', id, `Cancelled receipt ${p.receiptNo} (₹${Number(p.amount)}): ${input.reason}`);
  return { cancelled: res.id };
});
