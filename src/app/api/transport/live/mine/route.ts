import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { ownClassSectionPairs } from '@/server/scope';
import { distanceM, etaMinutes, LIVE_WINDOW_MS } from '@/server/services/tracking';

/** The family's live view: where the child's bus is, and how far it is from their stop. */
export const GET = route({ module: 'transport' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const pairs = await ownClassSectionPairs(ctx);
  const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
  if (!p) throw forbidden();
  const lt = ctx.school.settings.liveTracking;
  if (!lt.enabled || !lt.shareWithParents) return { available: false, reason: 'Live tracking is not offered by your school.' };
  const t = await ctx.db.studentTransport.findUnique({
    where: { studentId: p.studentId },
    select: {
      tripType: true,
      stop: { select: { id: true, name: true, lat: true, lng: true } },
      route: {
        select: {
          name: true,
          stops: { orderBy: { sortOrder: 'asc' }, select: { name: true, lat: true, lng: true } },
          vehicle: { select: { id: true, registrationNo: true, lastLat: true, lastLng: true, lastSpeedKmh: true, lastHeading: true, lastSeenAt: true, trips: { where: { endedAt: null }, take: 1, select: { kind: true, startedAt: true } } } },
        },
      },
    },
  });
  if (!t) return { available: false, reason: 'Not using school transport.' };
  const v = t.route.vehicle;
  const live = !!v?.lastSeenAt && Date.now() - v.lastSeenAt.getTime() < LIVE_WINDOW_MS;
  const hasStop = t.stop.lat != null && t.stop.lng != null;
  const hasBus = v?.lastLat != null && v?.lastLng != null;
  const meters = hasStop && hasBus ? distanceM({ lat: v!.lastLat!, lng: v!.lastLng! }, { lat: t.stop.lat!, lng: t.stop.lng! }) : null;
  return {
    available: true,
    route: t.route.name,
    tripType: t.tripType,
    stop: t.stop,
    stops: t.route.stops.filter((s) => s.lat != null && s.lng != null),
    bus: v
      ? { registrationNo: v.registrationNo, lat: v.lastLat, lng: v.lastLng, speedKmh: v.lastSpeedKmh, heading: v.lastHeading, lastSeenAt: v.lastSeenAt, live, trip: v.trips[0] ?? null }
      : null,
    distanceM: meters != null ? Math.round(meters) : null,
    etaMin: meters != null && live ? etaMinutes(meters, v?.lastSpeedKmh) : null,
  };
});
