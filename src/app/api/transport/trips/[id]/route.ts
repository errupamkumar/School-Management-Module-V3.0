import { badRequest, route } from '@/server/api';
import { assertCanDrive } from '@/server/resources/tracking';

/** End a running trip. */
export const PATCH = route({ authenticated: true }, async (ctx, _req, { id }) => {
  const trip = await ctx.db.transportTrip.findUniqueOrThrow({ where: { id } });
  await assertCanDrive(ctx, trip.vehicleId);
  if (trip.endedAt) throw badRequest('This trip has already ended.');
  const ended = await ctx.db.transportTrip.update({ where: { id }, data: { endedAt: new Date() } });
  await ctx.audit('UPDATE', 'TransportTrip', id, `${trip.kind.toLowerCase()} trip ended`);
  return ended;
});
