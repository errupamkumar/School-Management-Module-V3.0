import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { ownClassSectionPairs } from '@/server/scope';

/** The family's view: child's route, stop timings, vehicle and driver contact. */
export const GET = route({ module: 'transport' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const pairs = await ownClassSectionPairs(ctx);
  const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
  if (!p) throw forbidden();
  const t = await ctx.db.studentTransport.findUnique({
    where: { studentId: p.studentId },
    include: { stop: true, route: { include: { vehicle: { select: { registrationNo: true, model: true, driverName: true, driverPhone: true, attendantName: true, attendantPhone: true } }, stops: { orderBy: { sortOrder: 'asc' }, select: { name: true, pickupTime: true, dropTime: true } } } } },
  });
  return t ? { route: t.route.name, stop: t.stop.name, pickupTime: t.stop.pickupTime, dropTime: t.stop.dropTime, monthlyFee: t.stop.monthlyFee, tripType: t.tripType, vehicle: t.route.vehicle, stops: t.route.stops } : null;
});
