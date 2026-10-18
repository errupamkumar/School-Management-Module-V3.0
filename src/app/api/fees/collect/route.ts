import { z } from 'zod';
import { badRequest, body, route } from '@/server/api';
import { dayUTC, todayUTC } from '@/server/common';
import { collectPayment } from '@/server/services/fees';
import { notifyFamilies } from '@/server/services/notify';
import { formatINR } from '@/server/services/money';

export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z
      .object({
        studentIds: z.array(z.string().min(1)).min(1).max(10),
        invoiceIds: z.array(z.string()).max(100).optional(),
        amount: z.coerce.number().positive('Enter the amount received').max(10_000_000),
        mode: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'BANK_TRANSFER']),
        paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        referenceNo: z.string().trim().max(60).optional().nullable(),
        chequeNo: z.string().trim().max(20).optional().nullable(),
        bankName: z.string().trim().max(60).optional().nullable(),
        remarks: z.string().trim().max(200).optional().nullable(),
      })
      .refine((v) => !['CHEQUE', 'DD'].includes(v.mode) || !!v.chequeNo, { path: ['chequeNo'], message: 'Cheque/DD number is required' })
      .refine((v) => !['UPI', 'NET_BANKING', 'BANK_TRANSFER', 'CARD'].includes(v.mode) || !!v.referenceNo, { path: ['referenceNo'], message: 'Transaction / UTR reference is required' })
  );
  const paidAt = input.paidAt ? dayUTC(input.paidAt) : new Date();
  if (paidAt > new Date(todayUTC().getTime() + 86_400_000)) throw badRequest('Payment date cannot be in the future.');
  // Every student must be valid and (for family collection) share one family.
  const students = await ctx.db.student.findMany({ where: { id: { in: input.studentIds } }, select: { id: true, guardianId: true } });
  if (students.length !== input.studentIds.length) throw badRequest('Unknown student.');
  if (new Set(students.map((s) => s.guardianId)).size > 1) throw badRequest('Family collection only works for siblings of one family.');

  const payments = await collectPayment(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    studentIds: input.studentIds,
    invoiceIds: input.invoiceIds,
    amount: Math.round(input.amount * 100),
    mode: input.mode,
    paidAt,
    referenceNo: input.referenceNo,
    chequeNo: input.chequeNo,
    bankName: input.bankName,
    remarks: input.remarks,
    collectedBy: { id: ctx.user.id, name: ctx.user.name },
  });
  for (const p of payments) {
    await notifyFamilies(ctx.db, ctx.user.schoolId, [p.studentId], { title: `Fee received: ${formatINR(Math.round(Number(p.amount) * 100))}`, body: `Receipt ${p.receiptNo} has been issued. Thank you.`, link: '/fees' });
  }
  await ctx.audit('CREATE', 'FeePayment', payments.map((p) => p.id).join(','), `Collected ₹${input.amount} by ${input.mode}: ${payments.map((p) => p.receiptNo).join(', ')}`);
  return payments.map((p) => ({ id: p.id, receiptNo: p.receiptNo, amount: p.amount, studentId: p.studentId }));
});
