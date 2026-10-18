import crypto from 'node:crypto';
import type { TenantDb } from '../db';
import type { SchoolSettings } from '../settings';
import { notifyUsers } from './notify';

/** Great-circle distance in metres. */
export function distanceM(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6_371_000;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Rough minutes to cover a straight-line distance by road: roads run ~30%
 * longer than the crow flies; use the bus's speed when it is moving, else a
 * typical city speed.
 */
export function etaMinutes(meters: number, speedKmh: number | null | undefined): number {
  const kmh = speedKmh && speedKmh > 8 ? Math.min(speedKmh, 60) : 20;
  return Math.max(1, Math.round(((meters * 1.3) / 1000 / kmh) * 60));
}

/** A position is "live" if it arrived within this window. */
export const LIVE_WINDOW_MS = 3 * 60_000;

export function newTrackingToken(): string {
  return `trk_${crypto.randomBytes(18).toString('base64url')}`;
}

export interface Fix {
  lat: number;
  lng: number;
  speedKmh?: number | null;
  heading?: number | null;
  accuracyM?: number | null;
  recordedAt?: Date;
}

export function validFix(f: Fix): boolean {
  return Number.isFinite(f.lat) && Number.isFinite(f.lng) && Math.abs(f.lat) <= 90 && Math.abs(f.lng) <= 180 && !(f.lat === 0 && f.lng === 0);
}

/**
 * Stores a position, refreshes the vehicle's last-known location and, during
 * an active trip, alerts families once per stop when the bus comes close.
 */
export async function recordFix(db: TenantDb, schoolId: string, settings: SchoolSettings, vehicleId: string, fix: Fix, source: 'DRIVER_APP' | 'GPS_DEVICE') {
  const at = fix.recordedAt && Math.abs(fix.recordedAt.getTime() - Date.now()) < 24 * 3600_000 ? fix.recordedAt : new Date();
  await db.$transaction([
    db.vehicleLocation.create({ data: { schoolId, vehicleId, lat: fix.lat, lng: fix.lng, speedKmh: fix.speedKmh ?? null, heading: fix.heading ?? null, accuracyM: fix.accuracyM ?? null, source, recordedAt: at } }),
    db.vehicle.update({ where: { id: vehicleId }, data: { lastLat: fix.lat, lastLng: fix.lng, lastSpeedKmh: fix.speedKmh ?? null, lastHeading: fix.heading ?? null, lastSeenAt: at } }),
  ]);

  const alerted = await approachAlerts(db, schoolId, settings, vehicleId, fix);

  // Keep history bounded: occasionally drop positions past the retention period.
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - settings.liveTracking.retainDays * 86_400_000);
    await db.vehicleLocation.deleteMany({ where: { recordedAt: { lt: cutoff } } });
  }
  return { recordedAt: at, alerted };
}

async function approachAlerts(db: TenantDb, schoolId: string, settings: SchoolSettings, vehicleId: string, fix: Fix): Promise<string[]> {
  const radius = settings.liveTracking.approachAlertMeters;
  if (!radius || !settings.liveTracking.shareWithParents) return [];
  const trip = await db.transportTrip.findFirst({ where: { vehicleId, endedAt: null }, orderBy: { startedAt: 'desc' } });
  if (!trip) return [];
  const done = new Set(Array.isArray(trip.notifiedStops) ? (trip.notifiedStops as string[]) : []);
  const routes = await db.transportRoute.findMany({
    where: trip.routeId ? { id: trip.routeId } : { vehicleId, isActive: true },
    select: { stops: { where: { lat: { not: null }, lng: { not: null } }, select: { id: true, name: true, lat: true, lng: true } } },
  });
  const vehicle = await db.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { registrationNo: true } });
  const reached: string[] = [];
  for (const stop of routes.flatMap((r) => r.stops)) {
    if (done.has(stop.id)) continue;
    const d = distanceM(fix, { lat: stop.lat!, lng: stop.lng! });
    if (d > radius) continue;
    const trips = trip.kind === 'PICKUP' ? ['PICKUP', 'BOTH'] : ['DROP', 'BOTH'];
    const riders = await db.studentTransport.findMany({
      where: { stopId: stop.id, tripType: { in: trips } },
      select: { student: { select: { userId: true, status: true, guardian: { select: { userId: true } } } } },
    });
    const users = riders.filter((r) => r.student.status === 'ACTIVE').flatMap((r) => [r.student.guardian?.userId, r.student.userId]);
    const mins = etaMinutes(d, fix.speedKmh);
    await notifyUsers(db, schoolId, users, {
      title: trip.kind === 'PICKUP' ? `Bus approaching ${stop.name}` : `Bus nearing ${stop.name} (drop)`,
      body: `${vehicle.registrationNo} is about ${mins} min away. Track it live in the app.`,
      link: '/transport',
    });
    done.add(stop.id);
    reached.push(stop.id);
  }
  if (reached.length) await db.transportTrip.update({ where: { id: trip.id }, data: { notifiedStops: [...done] } });
  return reached;
}
