import { z } from 'zod';
import { badRequest, body, conflict, route } from '@/server/api';
import { fromPaise } from '@/server/services/money';
import { money } from '@/lib/validators';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable().or(z.literal('').transform(() => null));

/** Replace a route's ordered stop list. Stops still used by students cannot be removed. */
export const PUT = route({ module: 'transport', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ stops: z.array(z.object({ id: z.string().optional(), name: z.string().trim().min(1).max(80), pickupTime: time, dropTime: time, monthlyFee: money, lat: z.number().min(-90).max(90).nullable().optional(), lng: z.number().min(-180).max(180).nullable().optional() })).min(1).max(60) }));
  await ctx.db.transportRoute.findUniqueOrThrow({ where: { id } });
  const existing = await ctx.db.routeStop.findMany({ where: { routeId: id }, include: { _count: { select: { passengers: true } } } });
  const keep = new Set(input.stops.map((s) => s.id).filter(Boolean));
  for (const s of input.stops) if (s.id && !existing.some((e) => e.id === s.id)) throw badRequest('Unknown stop.');
  const removed = existing.filter((e) => !keep.has(e.id));
  const inUse = removed.find((r) => r._count.passengers > 0);
  if (inUse) throw conflict(`Stop “${inUse.name}” has ${inUse._count.passengers} students. Move them before removing it.`);
  await ctx.db.$transaction(async (tx) => {
    await tx.routeStop.deleteMany({ where: { id: { in: removed.map((r) => r.id) } } });
    for (const [i, s] of input.stops.entries()) {
      const data = { name: s.name, pickupTime: s.pickupTime ?? null, dropTime: s.dropTime ?? null, monthlyFee: fromPaise(Math.round(s.monthlyFee * 100)), sortOrder: i + 1, ...(s.lat !== undefined ? { lat: s.lat } : {}), ...(s.lng !== undefined ? { lng: s.lng } : {}) };
      if (s.id) await tx.routeStop.update({ where: { id: s.id }, data });
      else await tx.routeStop.create({ data: { schoolId: ctx.user.schoolId, routeId: id, ...data } });
    }
  });
  await ctx.audit('UPDATE', 'RouteStop', id, `${input.stops.length} stops`);
  return { saved: input.stops.length };
});
