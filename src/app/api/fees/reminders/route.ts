import { z } from 'zod';
import { body, route } from '@/server/api';
import { displayName } from '@/server/common';
import { notifyUsers } from '@/server/services/notify';
import { queueMessages } from '@/server/services/messaging';
import { formatINR, toPaise } from '@/server/services/money';

/** Fee reminders to families: always in-app; optionally SMS or WhatsApp. */
export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ studentIds: z.array(z.string()).min(1).max(2000), channels: z.array(z.enum(['APP', 'SMS', 'WHATSAPP'])).min(1).default(['APP']) }));
  const students = await ctx.db.student.findMany({
    where: { id: { in: input.studentIds } },
    select: { id: true, firstName: true, lastName: true, guardian: { select: { userId: true, primaryPhone: true } }, invoices: { where: { status: { in: ['UNPAID', 'PARTIAL'] } }, select: { total: true, paidAmount: true } } },
  });
  const items = students
    .map((s) => ({ s, due: s.invoices.reduce((a, i) => a + toPaise(i.total) - toPaise(i.paidAmount), 0) }))
    .filter((x) => x.due > 0);
  let app = 0;
  if (input.channels.includes('APP')) {
    for (const { s, due } of items) {
      await notifyUsers(ctx.db, ctx.user.schoolId, [s.guardian?.userId], { title: 'Fee reminder', body: `${formatINR(due)} is pending for ${displayName(s)}. Please pay at the earliest to avoid late fees.`, link: '/fees' });
      app++;
    }
  }
  const text = (name: string, due: number) => `Dear Parent, fee of ${formatINR(due)} is pending for ${name}. Kindly pay at the earliest. - ${ctx.school.name}`;
  const sms = input.channels.includes('SMS') ? await queueMessages(ctx, 'SMS', items.map(({ s, due }) => ({ recipient: s.guardian?.primaryPhone, recipientName: displayName(s), body: text(displayName(s), due) }))) : 0;
  const wa = input.channels.includes('WHATSAPP') ? await queueMessages(ctx, 'WHATSAPP', items.map(({ s, due }) => ({ recipient: s.guardian?.primaryPhone, recipientName: displayName(s), body: text(displayName(s), due) }))) : 0;
  await ctx.audit('CREATE', 'FeeReminder', null, `${items.length} families: app ${app}, sms ${sms}, whatsapp ${wa}`);
  return { families: items.length, app, sms, whatsapp: wa, gatewayMissing: (input.channels.includes('SMS') && !sms) || (input.channels.includes('WHATSAPP') && !wa) };
});
