import { route } from '@/server/api';

/** Sign out of every device, including this one (the client signs out after the call). */
export const POST = route({ authenticated: true }, async (ctx) => {
  await ctx.db.user.update({ where: { id: ctx.user.id }, data: { sessionVersion: { increment: 1 } } });
  await ctx.audit('LOGOUT_ALL', 'User', ctx.user.id, 'Signed out of all devices');
  return { revoked: true };
});
