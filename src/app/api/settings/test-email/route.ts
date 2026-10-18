import { z } from 'zod';
import { badRequest, body, HttpError, route } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { sendTestEmail } from '@/server/services/messaging';

/** Sends a test email with the saved SMTP settings and reports the server's answer. */
export const POST = route({ module: 'settings', action: 'edit' }, async (ctx, req) => {
  const input = await body(req, z.object({ to: z.string().trim().toLowerCase().email() }));
  const rl = await rateLimit(`test-email:${ctx.user.schoolId}`, 10, 3600);
  if (!rl.ok) throw new HttpError(429, 'Too many test emails. Try again later.', 'RATE_LIMITED');
  try {
    await sendTestEmail(ctx.school.settings, input.to);
  } catch (e) {
    throw badRequest(`Could not send: ${(e as Error).message}`.slice(0, 300));
  }
  await ctx.audit('TEST', 'Settings', ctx.user.schoolId, `Test email to ${input.to}`);
  return { sent: true };
});
