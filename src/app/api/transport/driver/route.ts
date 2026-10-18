import { route } from '@/server/api';

/** Driver mode: the vehicles this user may drive, with any running trip and the ping interval. */
export const GET = route({ authenticated: true }, async (ctx) => {
  const manager = ctx.can('transport', 'edit');
  const where = manager ? { isActive: true } : { isActive: true, driverEmployeeId: ctx.user.employeeId ?? '__none__' };
  const vehicles = await ctx.db.vehicle.findMany({
    where,
    orderBy: { registrationNo: 'asc' },
    select: {
      id: true,
      registrationNo: true,
      model: true,
      driverName: true,
      lastSeenAt: true,
      routes: { where: { isActive: true }, select: { id: true, name: true, _count: { select: { stops: true, passengers: true } } } },
      trips: { where: { endedAt: null }, orderBy: { startedAt: 'desc' }, take: 1, select: { id: true, kind: true, routeId: true, startedAt: true } },
    },
  });
  return {
    enabled: ctx.school.settings.liveTracking.enabled,
    pingIntervalSec: ctx.school.settings.liveTracking.pingIntervalSec,
    vehicles: vehicles.map(({ trips, ...v }) => ({ ...v, activeTrip: trips[0] ?? null })),
  };
});
