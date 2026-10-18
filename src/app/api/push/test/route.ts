import { HttpError, route } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { sendPush } from '@/server/services/push';

/** Send a test notification to the signed-in user's own devices. */
export const POST = route({ authenticated: true }, async (ctx) => {
  const rl = await rateLimit(`pushtest:${ctx.user.id}`, 5, 600);
  if (!rl.ok) throw new HttpError(429, 'Please wait a few minutes before sending another test.', 'RATE_LIMITED');
  const sent = await sendPush(ctx.user.schoolId, [ctx.user.id], { title: 'Notifications are working', body: `You will get school alerts on this device, ${ctx.user.name.split(' ')[0]}.`, link: '/notifications' });
  return { sent };
});
