import type { NextRequest } from 'next/server';
import { badRequest, forbidden, HttpError, notFound } from '../api';
import { prisma, tenantDb } from '../db';
import { rateLimit } from '../rate-limit';
import { readSettings } from '../settings';
import { recordFix, validFix } from './tracking';

/**
 * Positions from GPS hardware or tracker apps. Accepts the OsmAnd / Traccar
 * Client convention (lat, lon, timestamp, speed in knots, bearing, accuracy)
 * as query string, form body or JSON, so most trackers work without custom
 * code. The vehicle is identified by its secret tracking token.
 */
export async function ingestDevicePosition(req: NextRequest, tokenFromPath?: string) {
  const params = new URLSearchParams(req.nextUrl.search);
  if (req.method === 'POST') {
    const type = req.headers.get('content-type') ?? '';
    const text = await req.text();
    if (type.includes('application/json') && text) {
      try {
        const j = JSON.parse(text) as Record<string, unknown>;
        const loc = (j.location ?? j) as Record<string, unknown>;
        const coords = (loc.coords ?? loc) as Record<string, unknown>;
        for (const [k, v] of Object.entries({ ...j, ...loc, ...coords })) if (v != null && typeof v !== 'object') params.set(k, String(v));
        if (j.device_id) params.set('id', String(j.device_id));
      } catch {
        throw badRequest('Body must be valid JSON.');
      }
    } else if (text) {
      for (const [k, v] of new URLSearchParams(text)) params.set(k, v);
    }
  }

  const token = tokenFromPath ?? params.get('id') ?? params.get('deviceid') ?? '';
  if (!/^trk_[A-Za-z0-9_-]{20,40}$/.test(token)) throw notFound('Tracker');
  const rl = await rateLimit(`trackdev:${token}`, 60, 60);
  if (!rl.ok) throw new HttpError(429, 'Too many positions; send at most one per second.', 'RATE_LIMITED');

  const vehicle = await prisma.vehicle.findUnique({ where: { trackingToken: token }, select: { id: true, schoolId: true, isActive: true } });
  if (!vehicle) throw notFound('Tracker');
  const school = await prisma.school.findUniqueOrThrow({ where: { id: vehicle.schoolId }, select: { status: true, settings: true } });
  if (!vehicle.isActive || school.status === 'SUSPENDED' || school.status === 'CANCELLED') throw forbidden('Tracking is disabled for this vehicle.');
  const settings = readSettings(school.settings);
  if (!settings.liveTracking.enabled) throw forbidden('Live tracking is turned off for this school.');

  const num = (...keys: string[]) => {
    for (const k of keys) {
      const v = params.get(k);
      if (v != null && v !== '' && Number.isFinite(Number(v))) return Number(v);
    }
    return null;
  };
  const lat = num('lat', 'latitude');
  const lng = num('lon', 'lng', 'longitude');
  if (lat == null || lng == null) throw badRequest('lat and lon are required.');
  const knots = num('speed');
  const kmh = num('speedKmh', 'speed_kmh');
  const ts = params.get('timestamp') ?? params.get('time');
  let recordedAt: Date | undefined;
  if (ts) {
    const n = Number(ts);
    recordedAt = Number.isFinite(n) ? new Date(n > 1e12 ? n : n * 1000) : new Date(ts);
    if (Number.isNaN(recordedAt.getTime())) recordedAt = undefined;
  }
  const fix = { lat, lng, speedKmh: kmh ?? (knots != null ? knots * 1.852 : null), heading: num('bearing', 'heading', 'course'), accuracyM: num('accuracy', 'hdop'), recordedAt };
  if (!validFix(fix)) throw badRequest('Invalid location.');
  const res = await recordFix(tenantDb(vehicle.schoolId), vehicle.schoolId, settings, vehicle.id, fix, 'GPS_DEVICE');
  return { ok: true, recordedAt: res.recordedAt };
}
