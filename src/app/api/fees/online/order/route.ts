import crypto from 'node:crypto';
import { z } from 'zod';
import { badRequest, body, forbidden, HttpError, route } from '@/server/api';
import { displayName } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { collectPayment, studentDues } from '@/server/services/fees';
import { createOrder, razorpayCreds, sandboxEnabled, sandboxOrderId } from '@/server/services/razorpay';

/** Starts an online payment for a student's selected (or all) outstanding invoices. */
export const POST = route({ module: 'fees' }, async (ctx, req) => {
  if (!ctx.school.settings.fees.onlinePaymentEnabled) throw forbidden('Online payment is not enabled by your school.');
  const input = await body(req, z.object({ studentId: z.string().min(1), invoiceIds: z.array(z.string()).max(24).optional() }));
  await assertStudentAccess(ctx, input.studentId);

  const { invoices } = await studentDues(ctx.db, [input.studentId]);
  const chosen = input.invoiceIds?.length ? invoices.filter((i) => input.invoiceIds!.includes(i.id)) : invoices;
  if (!chosen.length) throw badRequest('Nothing to pay.');
  const amount = chosen.reduce((a, i) => a + Math.round(Number(i.total) * 100) - Math.round(Number(i.paidAmount) * 100), 0);
  if (amount < 100) throw badRequest('Amount is too small for online payment.');

  const creds = razorpayCreds(ctx.school.settings);
  const sandbox = !creds && sandboxEnabled();
  if (!creds && !sandbox) throw new HttpError(503, 'Online payment gateway is not configured. Please pay at the school office.', 'GATEWAY_MISSING');

  const student = await ctx.db.student.findUniqueOrThrow({ where: { id: input.studentId }, select: { firstName: true, lastName: true, admissionNo: true } });
  const order = sandbox
    ? { id: sandboxOrderId() }
    : await createOrder(creds!, amount, `fee-${crypto.randomUUID().slice(0, 12)}`, { school: ctx.school.code, admissionNo: student.admissionNo });

  const [payment] = await collectPayment(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    studentIds: [input.studentId],
    invoiceIds: chosen.map((i) => i.id),
    amount,
    mode: 'ONLINE',
    paidAt: new Date(),
    status: 'PENDING',
    collectedBy: null,
    remarks: `Online payment by ${ctx.user.name}`,
    gateway: { name: sandbox ? 'SANDBOX' : 'RAZORPAY', orderId: order.id },
  });
  await ctx.audit('CREATE', 'FeePayment', payment.id, `Online order ${order.id} for ₹${amount / 100}`);
  return {
    paymentId: payment.id,
    orderId: order.id,
    amount,
    keyId: creds?.keyId ?? null,
    sandbox,
    name: ctx.school.name,
    description: `Fees for ${displayName(student)} (${student.admissionNo})`,
    prefill: { name: ctx.user.name },
  };
});
