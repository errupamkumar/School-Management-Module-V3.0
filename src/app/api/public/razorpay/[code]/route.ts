import { NextResponse, type NextRequest } from 'next/server';
import { prisma, tenantDb } from '@/server/db';
import { decryptField } from '@/server/crypto';
import { env } from '@/server/env';
import { readSettings } from '@/server/settings';
import { writeAudit } from '@/server/audit';
import { confirmPendingPayment } from '@/server/services/fees';
import { verifyWebhookSignature } from '@/server/services/razorpay';

/**
 * Razorpay webhook (configure as https://<host>/api/public/razorpay/<SCHOOLCODE>).
 * Confirms payments even if the parent closes the browser before the redirect.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';
  const school = await prisma.school.findUnique({ where: { code: code.toUpperCase() }, select: { id: true, settings: true } });
  if (!school) return NextResponse.json({ ok: false }, { status: 404 });
  const settings = readSettings(school.settings);
  const secret = settings.payments.razorpayWebhookSecretEnc ? decryptField(settings.payments.razorpayWebhookSecretEnc) : env.razorpayWebhookSecret();
  if (!secret || !signature || !verifyWebhookSignature(raw, signature, secret)) {
    await writeAudit({ schoolId: school.id, action: 'WEBHOOK_REJECTED', entity: 'Razorpay', summary: 'Invalid signature' });
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; status?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const entity = event.payload?.payment?.entity;
  if ((event.event === 'payment.captured' || event.event === 'order.paid') && entity?.order_id && entity.id) {
    const db = tenantDb(school.id);
    const payment = await db.feePayment.findFirst({ where: { gatewayOrderId: entity.order_id } });
    if (payment && payment.status === 'PENDING') {
      const done = await confirmPendingPayment(db, school.id, settings, payment.id, entity.id);
      await writeAudit({ schoolId: school.id, action: 'UPDATE', entity: 'FeePayment', entityId: payment.id, summary: `Webhook confirmed ${done.receiptNo}` });
    }
  }
  return NextResponse.json({ ok: true });
}
