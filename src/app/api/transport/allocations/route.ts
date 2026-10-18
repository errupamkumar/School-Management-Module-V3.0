import { z } from 'zod';
import { badRequest, body, conflict, forbidden, query, route } from '@/server/api';
import { hasSchoolWideScope } from '@/server/scope';
import { classLabel, displayName } from '@/server/common';

export const GET = route({ module: 'transport' }, async (ctx, req) => {
  // Manifest contains other families' phone numbers — staff only.
  if (!hasSchoolWideScope(ctx)) throw forbidden();
  const q = query(req, z.object({ routeId: z.string().optional() }));
  const rows = await ctx.db.studentTransport.findMany({
    where: q.routeId ? { routeId: q.routeId } : {},
    include: {
      stop: { select: { name: true, sortOrder: true, pickupTime: true } },
      route: { select: { name: true } },
      student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } }, guardian: { select: { primaryPhone: true } } } },
    },
    orderBy: [{ route: { name: 'asc' } }, { stop: { sortOrder: 'asc' } }],
    take: 2000,
  });
  return rows.map((r) => ({ id: r.id, studentId: r.studentId, name: displayName(r.student), admissionNo: r.student.admissionNo, classLabel: classLabel(r.student.class, r.student.section), phone: r.student.guardian?.primaryPhone ?? null, route: r.route.name, routeId: r.routeId, stop: r.stop.name, stopId: r.stopId, pickupTime: r.stop.pickupTime, tripType: r.tripType }));
});

/** Assign (or move) a student to a route stop; respects vehicle capacity. */
export const POST = route({ module: 'transport', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ studentId: z.string().min(1), stopId: z.string().min(1), tripType: z.enum(['PICKUP', 'DROP', 'BOTH']).default('BOTH') }));
  const stop = await ctx.db.routeStop.findUnique({ where: { id: input.stopId }, include: { route: { include: { vehicle: true, _count: { select: { passengers: true } } } } } });
  if (!stop) throw badRequest('Unknown stop.');
  const student = await ctx.db.student.findUnique({ where: { id: input.studentId }, select: { id: true, status: true, transport: { select: { routeId: true } } } });
  if (!student || student.status !== 'ACTIVE') throw badRequest('Student not found or not active.');
  const moving = student.transport?.routeId !== stop.routeId;
  if (moving && stop.route.vehicle && stop.route._count.passengers >= stop.route.vehicle.capacity) {
    throw conflict(`${stop.route.name} is full (${stop.route.vehicle.capacity} seats).`);
  }
  const row = await ctx.db.studentTransport.upsert({
    where: { studentId: input.studentId },
    update: { routeId: stop.routeId, stopId: stop.id, tripType: input.tripType },
    create: { schoolId: ctx.user.schoolId, studentId: input.studentId, routeId: stop.routeId, stopId: stop.id, tripType: input.tripType },
  });
  await ctx.audit('UPDATE', 'StudentTransport', input.studentId, `${stop.route.name} / ${stop.name}`);
  return row;
});
