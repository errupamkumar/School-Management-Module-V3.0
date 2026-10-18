import { route } from '@/server/api';
import { newTrackingToken } from '@/server/services/tracking';

/**
 * Create or rotate the secret link a GPS device / tracker app posts positions to.
 * Rotating immediately invalidates the old link.
 */
export const POST = route({ module: 'transport', action: 'edit' }, async (ctx, req, { id }) => {
  const v = await ctx.db.vehicle.findUniqueOrThrow({ where: { id }, select: { registrationNo: true } });
  const token = newTrackingToken();
  await ctx.db.vehicle.update({ where: { id }, data: { trackingToken: token } });
  await ctx.audit('UPDATE', 'Vehicle', id, `GPS device link ${'issued/rotated'} for ${v.registrationNo}`);
  const origin = req.headers.get('x-forwarded-proto') && req.headers.get('x-forwarded-host') ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}` : req.nextUrl.origin;
  return {
    token,
    url: `${origin}/api/public/tracking/${token}`,
    traccar: { serverUrl: `${origin}/api/public/tracking`, deviceIdentifier: token },
  };
});

/** Disable device tracking for this vehicle. */
export const DELETE = route({ module: 'transport', action: 'edit' }, async (ctx, _req, { id }) => {
  await ctx.db.vehicle.update({ where: { id }, data: { trackingToken: null } });
  await ctx.audit('UPDATE', 'Vehicle', id, 'GPS device link disabled');
  return { disabled: true };
});
