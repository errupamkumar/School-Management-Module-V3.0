import { z } from 'zod';
import { body, conflict, owned, route } from '@/server/api';
import { assertCanDrive, assertTrackingOn } from '@/server/resources/tracking';

/** Start a pickup or drop run. Approach alerts are sent only while a trip is running. */
export const POST = route({ authenticated: true }, async (ctx, req) => {
  assertTrackingOn(ctx);
  const input = await body(req, z.object({ vehicleId: z.string().min(1), kind: z.enum(['PICKUP', 'DROP']), routeId: z.string().optional().nullable() }));
  await assertCanDrive(ctx, input.vehicleId);
  if (input.routeId) await owned(ctx.db.transportRoute, input.routeId, 'Route');
  const running = await ctx.db.transportTrip.findFirst({ where: { vehicleId: input.vehicleId, endedAt: null } });
  if (running) throw conflict('A trip is already running for this vehicle. End it first.');
  const trip = await ctx.db.transportTrip.create({ data: { schoolId: ctx.user.schoolId, vehicleId: input.vehicleId, kind: input.kind, routeId: input.routeId ?? null, startedById: ctx.user.id } });
  await ctx.audit('CREATE', 'TransportTrip', trip.id, `${input.kind.toLowerCase()} trip started`);
  return trip;
});
