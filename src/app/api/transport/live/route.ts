import { forbidden, route } from '@/server/api';
import { LIVE_WINDOW_MS } from '@/server/services/tracking';

/** Staff live board: every vehicle's last position, running trip and route stops. */
export const GET = route({ module: 'transport' }, async (ctx) => {
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') throw forbidden();
  const vehicles = await ctx.db.vehicle.findMany({
    where: { isActive: true },
    orderBy: { registrationNo: 'asc' },
    select: {
      id: true,
      registrationNo: true,
      model: true,
      driverName: true,
      driverPhone: true,
      gpsDeviceId: true,
      trackingToken: true,
      driverEmployeeId: true,
      lastLat: true,
      lastLng: true,
      lastSpeedKmh: true,
      lastHeading: true,
      lastSeenAt: true,
      routes: { where: { isActive: true }, select: { id: true, name: true, stops: { orderBy: { sortOrder: 'asc' }, select: { id: true, name: true, lat: true, lng: true } } } },
      trips: { where: { endedAt: null }, take: 1, select: { id: true, kind: true, startedAt: true } },
    },
  });
  const now = Date.now();
  return {
    enabled: ctx.school.settings.liveTracking.enabled,
    vehicles: vehicles.map(({ trips, trackingToken, ...v }) => ({
      ...v,
      hasDeviceLink: !!trackingToken,
      activeTrip: trips[0] ?? null,
      live: !!v.lastSeenAt && now - v.lastSeenAt.getTime() < LIVE_WINDOW_MS,
    })),
  };
});
