/**
 * Puts buses "on the road" for screenshots and live demos: starts a pickup
 * trip on each routed vehicle and sends a position part-way along its route.
 *   npx tsx docs/tools/demo-live.ts         start / refresh positions
 *   npx tsx docs/tools/demo-live.ts --end   end every running demo trip
 */
import { as } from '../../tests/api/client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';

(async () => {
  const transport = await as(SCHOOL, 'transport');
  const routes = (await transport.get('/api/transport/routes')).data as Array<{ id: string; name: string; vehicleId: string | null; stops: Array<{ lat: number | null; lng: number | null }> }>;
  const live = (await transport.get('/api/transport/live')).data.vehicles as Array<{ id: string; activeTrip: { id: string } | null }>;
  if (process.argv.includes('--end')) {
    for (const v of live) if (v.activeTrip) await transport.patch(`/api/transport/trips/${v.activeTrip.id}`);
    console.log('Ended demo trips.');
    return;
  }
  // Progress along each route: 0 = first stop, 1 = school.
  const progress = [0.38, 0.62, 0.2];
  for (const [i, r] of routes.entries()) {
    const pts = r.stops.filter((s) => s.lat != null && s.lng != null) as Array<{ lat: number; lng: number }>;
    if (!r.vehicleId || pts.length < 2) continue;
    if (!live.find((v) => v.id === r.vehicleId)?.activeTrip) {
      const t = await transport.post('/api/transport/trips', { vehicleId: r.vehicleId, kind: 'PICKUP', routeId: r.id });
      if (!t.ok) throw new Error(`${r.name}: ${t.error}`);
    }
    const f = progress[i % progress.length] * (pts.length - 1);
    const a = pts[Math.floor(f)];
    const b = pts[Math.min(pts.length - 1, Math.floor(f) + 1)];
    const t = f - Math.floor(f);
    const lat = a.lat + (b.lat - a.lat) * t;
    const lng = a.lng + (b.lng - a.lng) * t;
    const heading = (Math.atan2(b.lng - a.lng, b.lat - a.lat) * 180) / Math.PI;
    const p = await transport.post('/api/transport/tracking/ping', { vehicleId: r.vehicleId, lat, lng, speedKmh: 22 + i * 4, heading: (heading + 360) % 360, accuracyM: 6 });
    if (!p.ok) throw new Error(`${r.name} ping: ${p.error}`);
    console.log(`${r.name}: on the road`);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
