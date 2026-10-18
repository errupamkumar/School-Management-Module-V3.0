import { z } from 'zod';
import { badRequest, body, HttpError, route } from '@/server/api';
import { rateLimit } from '@/server/rate-limit';
import { assertCanDrive, assertTrackingOn } from '@/server/resources/tracking';
import { recordFix, validFix } from '@/server/services/tracking';

/** A position from Driver mode (the driver's phone). */
export const POST = route({ authenticated: true }, async (ctx, req) => {
  assertTrackingOn(ctx);
  const input = await body(
    req,
    z.object({
      vehicleId: z.string().min(1),
      lat: z.number(),
      lng: z.number(),
      speedKmh: z.number().min(0).max(200).nullable().optional(),
      heading: z.number().min(0).max(360).nullable().optional(),
      accuracyM: z.number().min(0).max(100_000).nullable().optional(),
      recordedAt: z.string().datetime().optional(),
    })
  );
  await assertCanDrive(ctx, input.vehicleId);
  if (!validFix({ lat: input.lat, lng: input.lng })) throw badRequest('Invalid location.');
  const rl = await rateLimit(`track:${input.vehicleId}`, 40, 60);
  if (!rl.ok) throw new HttpError(429, 'Too many location updates. Slow down the interval.', 'RATE_LIMITED');
  const res = await recordFix(ctx.db, ctx.user.schoolId, ctx.school.settings, input.vehicleId, { lat: input.lat, lng: input.lng, speedKmh: input.speedKmh, heading: input.heading, accuracyM: input.accuracyM, recordedAt: input.recordedAt ? new Date(input.recordedAt) : undefined }, 'DRIVER_APP');
  return { ok: true, recordedAt: res.recordedAt, alertedStops: res.alerted.length };
});
