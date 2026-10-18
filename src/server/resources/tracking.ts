import { forbidden, HttpError, type Ctx } from '../api';

/** Live tracking must be switched on in School Settings → Transport tracking. */
export function assertTrackingOn(ctx: Ctx) {
  if (!ctx.school.settings.liveTracking.enabled) throw new HttpError(403, 'Live bus tracking is turned off for your school.', 'TRACKING_OFF');
}

/** The assigned driver of the vehicle, or anyone who can edit Transport, may share its location and run trips. */
export async function assertCanDrive(ctx: Ctx, vehicleId: string) {
  const v = await ctx.db.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { id: true, driverEmployeeId: true, isActive: true } });
  const isDriver = !!ctx.user.employeeId && v.driverEmployeeId === ctx.user.employeeId;
  if (!isDriver && !ctx.can('transport', 'edit')) throw forbidden('Only this vehicle’s driver or the transport team can do this.');
  if (!v.isActive) throw forbidden('This vehicle is marked inactive.');
  return v;
}
