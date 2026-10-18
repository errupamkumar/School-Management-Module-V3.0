import { HttpError, route } from '@/server/api';
import { dispatchQueued } from '@/server/services/messaging';

/** Re-queue failed messages and dispatch everything pending. */
export const POST = route({ module: 'sms', action: 'create' }, async (ctx) => {
  if (ctx.school.settings.messaging.smsProvider === 'NONE' && ctx.school.settings.messaging.whatsappProvider === 'NONE') {
    throw new HttpError(400, 'Configure an SMS or WhatsApp gateway in School Settings first.', 'GATEWAY_MISSING');
  }
  const requeued = await ctx.db.outboundMessage.updateMany({ where: { status: { in: ['FAILED', 'SKIPPED'] } }, data: { status: 'QUEUED', error: null } });
  const res = await dispatchQueued(ctx.user.schoolId);
  await ctx.audit('UPDATE', 'OutboundMessage', null, `Retry: ${requeued.count} requeued, ${res.sent} sent, ${res.failed} failed`);
  return { requeued: requeued.count, ...res };
});
