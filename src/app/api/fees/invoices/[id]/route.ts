import { z } from 'zod';
import { body, conflict, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { toPaise } from '@/server/services/money';

/** Invoice / fee challan with school bank details for printing. */
export const GET = route({ module: 'fees' }, async (ctx, _req, { id }) => {
  const inv = await ctx.db.feeInvoice.findUniqueOrThrow({
    where: { id },
    include: {
      items: true,
      allocations: { include: { payment: { select: { receiptNo: true, paidAt: true, mode: true, status: true } } } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, rollNo: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { fatherName: true, motherName: true, primaryPhone: true } } } },
    },
  });
  await assertStudentAccess(ctx, inv.studentId);
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, phone: true, email: true, affiliationNo: true, board: true, city: true, state: true } });
  return {
    ...inv,
    balance: (toPaise(inv.total) - toPaise(inv.paidAmount)) / 100,
    studentName: displayName(inv.student),
    classLabel: classLabel(inv.student.class, inv.student.section),
    school,
    bankAccounts: ctx.school.settings.bankAccounts,
    footer: ctx.school.settings.fees.receiptFooter,
  };
});

/** Cancel an unpaid invoice (e.g. raised by mistake). */
export const DELETE = route({ module: 'fees', action: 'delete' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ reason: z.string().trim().min(3, 'Give a reason').max(200) }));
  const inv = await ctx.db.feeInvoice.findUniqueOrThrow({ where: { id } });
  if (toPaise(inv.paidAmount) > 0) throw conflict('This invoice has payments. Cancel the receipts first.');
  if (inv.status === 'CANCELLED') throw conflict('Already cancelled.');
  await ctx.db.feeInvoice.update({ where: { id }, data: { status: 'CANCELLED', notes: input.reason } });
  await ctx.audit('DELETE', 'FeeInvoice', id, `Cancelled ${inv.invoiceNo}: ${input.reason}`);
  return { cancelled: true };
});
