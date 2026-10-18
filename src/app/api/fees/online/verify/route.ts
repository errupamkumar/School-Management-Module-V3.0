import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { assertStudentAccess } from '@/server/scope';
import { confirmPendingPayment } from '@/server/services/fees';
import { razorpayCreds, sandboxEnabled, verifyPaymentSignature } from '@/server/services/razorpay';

/** Called by the browser after Razorpay checkout succeeds. The signature is the source of truth. */
export const POST = route({ module: 'fees' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      paymentId: z.string().min(1),
      razorpayOrderId: z.string().max(60).optional(),
      razorpayPaymentId: z.string().max(60).optional(),
      razorpaySignature: z.string().max(200).optional(),
      sandbox: z.boolean().optional(),
    })
  );
  const payment = await ctx.db.feePayment.findUniqueOrThrow({ where: { id: input.paymentId } });
  await assertStudentAccess(ctx, payment.studentId);
  if (payment.status === 'SUCCESS') return { receiptNo: payment.receiptNo, paymentId: payment.id };

  let gatewayPaymentId: string;
  if (input.sandbox) {
    if (!sandboxEnabled() || payment.gateway !== 'SANDBOX') throw forbidden('Sandbox payments are disabled.');
    gatewayPaymentId = `pay_SANDBOX${Date.now()}`;
  } else {
    const creds = razorpayCreds(ctx.school.settings);
    if (!creds || !input.razorpayOrderId || !input.razorpayPaymentId || !input.razorpaySignature) throw badRequest('Incomplete payment confirmation.');
    if (input.razorpayOrderId !== payment.gatewayOrderId) throw badRequest('Order mismatch.');
    if (!verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature, creds.secret)) {
      await ctx.audit('PAYMENT_SIGNATURE_INVALID', 'FeePayment', payment.id, input.razorpayOrderId);
      throw badRequest('Payment verification failed.');
    }
    gatewayPaymentId = input.razorpayPaymentId;
  }
  const updated = await confirmPendingPayment(ctx.db, ctx.user.schoolId, ctx.school.settings, payment.id, gatewayPaymentId);
  await ctx.audit('UPDATE', 'FeePayment', payment.id, `Online payment confirmed ${updated.receiptNo}`);
  return { receiptNo: updated.receiptNo, paymentId: updated.id };
});
