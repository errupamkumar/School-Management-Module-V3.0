/**
 * Live tracking, hostel, languages, phone push and Tally export, end to end
 * across the real roles. Restores every setting and removes what it creates.
 *   TEST_BASE_URL=http://localhost:3000 npx tsx tests/api/features.ts
 */
import { PrismaClient } from '@prisma/client';
import { resetLoginRateLimits } from '../reset-rate-limits';
import { as, BASE, Session, type ApiResult } from './client';

const SCHOOL = process.env.TEST_SCHOOL || 'DEMO';
let passed = 0;
const failures: string[] = [];
let flow = '';
const check = (name: string, cond: unknown, detail?: unknown) => {
  if (cond) return void passed++;
  failures.push(`${flow} › ${name}${detail !== undefined ? `  (${typeof detail === 'string' ? detail : JSON.stringify(detail).slice(0, 240)})` : ''}`);
};
const okr = (r: ApiResult, name: string) => check(name, r.ok, `${r.status} ${r.error ?? ''}`);
const is = (r: ApiResult, status: number, name: string) => check(`${name} → ${status}`, r.status === status, `${r.status} ${r.error ?? ''}`);
async function run(name: string, fn: () => Promise<void>) {
  flow = name;
  const before = failures.length;
  try {
    await fn();
  } catch (e) {
    failures.push(`${name} › threw: ${(e as Error).stack?.split('\n').slice(0, 2).join(' ') ?? e}`);
  }
  console.log(`${failures.length === before ? '✓' : '✗'} ${name}`);
}
const today = new Date().toISOString().slice(0, 10);
const uniq = Date.now().toString().slice(-6);
const db = new PrismaClient();

(async () => {
  await resetLoginRateLimits();
  const [owner, admin, teacher, accountant, transport, parent, student, staff] = await Promise.all(['owner', 'admin', 'teacher', 'accountant', 'transport', 'parent', 'student', 'staff'].map((u) => as(SCHOOL, u)));
  const original = (await admin.get('/api/settings')).data.settings;
  const restore = async (section: string) => admin.put('/api/settings', { settings: { [section]: original[section] } });
  const sMe = (await student.get('/api/me')).data;
  const khushi = sMe.children[0];
  const staffMe = (await staff.get('/api/me')).data;

  await run('Languages: school chooses, users switch, unknown or disabled codes refused', async () => {
    try {
      okr(await admin.put('/api/settings', { settings: { languages: { enabled: ['en', 'hi', 'ta', 'bn'], default: 'ta' } } }), 'admin enables 4 languages with Tamil default');
      const me = (await teacher.get('/api/me')).data;
      check('users receive the enabled list and default', JSON.stringify(me.settings.languages) === JSON.stringify({ enabled: ['en', 'hi', 'ta', 'bn'], default: 'ta' }), me.settings.languages);
      okr(await teacher.patch('/api/me', { language: 'bn' }), 'teacher switches to Bengali');
      is(await teacher.patch('/api/me', { language: 'gu' }), 400, 'Gujarati not enabled for this school');
      is(await teacher.patch('/api/me', { language: 'xx' }), 400, 'unknown language code');
      is(await admin.put('/api/settings', { settings: { languages: { enabled: ['en', 'hi'], default: 'ta' } } }), 400, 'default must be enabled');
      is(await admin.put('/api/settings', { settings: { languages: { enabled: ['en', 'zz'], default: 'en' } } }), 400, 'unknown code in enabled list');
      is(await teacher.put('/api/settings', { settings: { languages: { enabled: ['en'], default: 'en' } } }), 403, 'teacher cannot change school languages');
    } finally {
      await teacher.patch('/api/me', { language: 'en' });
      await restore('languages');
    }
  });

  await run('Hostel: rooms, allocation rules, family view, fee on invoice, move and vacate', async () => {
    const h = await admin.post('/api/hostels', { name: `Test Hostel ${uniq}`, kind: 'MIXED', phone: '0612000000' });
    okr(h, 'admin adds hostel');
    const hostelId = h.data.id;
    let invoiceIds: string[] = [];
    try {
      const r1 = await admin.post('/api/hostel-rooms', { hostelId, roomNo: 'T1', capacity: 1, monthlyFee: 3000 });
      const r2 = await admin.post('/api/hostel-rooms', { hostelId, roomNo: 'T2', capacity: 2, monthlyFee: 2500 });
      okr(r1, 'add single room');
      okr(r2, 'add double room');
      is(await accountant.post('/api/hostel-rooms', { hostelId, roomNo: 'T3', capacity: 2 }), 403, 'accountant (view only) cannot add rooms');
      const alloc = await admin.post('/api/hostel/allocations', { studentId: khushi.id, roomId: r1.data.id, bedNo: 'A', fromDate: today });
      okr(alloc, 'allot student a bed');
      is(await admin.post('/api/hostel/allocations', { studentId: khushi.id, roomId: r2.data.id, fromDate: today }), 409, 'second active allocation refused');
      const other = (await admin.get('/api/students?pageSize=5')).data.find((s: { id: string }) => s.id !== khushi.id);
      is(await admin.post('/api/hostel/allocations', { studentId: other.id, roomId: r1.data.id, fromDate: today }), 409, 'full room refused');
      const mine = await student.get('/api/hostel/mine');
      check('student sees own room', mine.data?.roomNo === 'T1' && mine.data?.bedNo === 'A', mine.data);
      is(await student.get('/api/hostel/allocations'), 403, 'families cannot list all residents');
      is(await parent.get(`/api/hostel/mine?studentId=${khushi.id}`), 403, 'another family cannot see this child');
      const inv = await accountant.post('/api/fees/invoices/generate', { period: '2031-03', studentIds: [khushi.id], notify: false });
      okr(inv, 'generate invoice for a future month');
      const invRow = await db.feeInvoice.findFirst({ where: { studentId: khushi.id, period: '2031-03' }, include: { items: true } });
      invoiceIds = invRow ? [invRow.id] : [];
      check('invoice includes the hostel fee', invRow?.items.some((i) => i.description.startsWith('Hostel') && Number(i.amount) === 3000), invRow?.items.map((i) => `${i.description}:${i.amount}`));
      okr(await admin.patch(`/api/hostel/allocations/${alloc.data.id}`, { action: 'move', roomId: r2.data.id, fromDate: today }), 'move to the double room');
      const now = await student.get('/api/hostel/mine');
      check('family view follows the move', now.data?.roomNo === 'T2', now.data);
      const active = await db.hostelAllocation.findFirst({ where: { studentId: khushi.id, status: 'ACTIVE' } });
      is(await admin.del(`/api/hostel-rooms/${r2.data.id}`), 409, 'occupied room cannot be deleted');
      okr(await admin.patch(`/api/hostel/allocations/${active!.id}`, { action: 'vacate', toDate: today }), 'vacate');
      check('student no longer listed', (await student.get('/api/hostel/mine')).data === null);
    } finally {
      if (invoiceIds.length) {
        await db.feeInvoiceItem.deleteMany({ where: { invoiceId: { in: invoiceIds } } });
        await db.feeInvoice.deleteMany({ where: { id: { in: invoiceIds } } });
      }
      await db.hostelAllocation.deleteMany({ where: { room: { hostelId } } });
      await db.hostelRoom.deleteMany({ where: { hostelId } });
      okr(await admin.del(`/api/hostels/${hostelId}`), 'cleanup hostel');
    }
  });

  await run('Live tracking: driver trip → parent sees bus and ETA → one-time approach alert; GPS device protocol', async () => {
    const routes = (await transport.get('/api/transport/routes')).data as Array<{ id: string; vehicleId: string; stops: Array<{ id: string; name: string; pickupTime: string | null; dropTime: string | null; monthlyFee: number; lat: number | null; lng: number | null }> }>;
    const route = routes.find((r) => r.vehicleId && r.stops.length)!;
    const stop = route.stops[0];
    const originalStops = route.stops.map((s) => ({ id: s.id, name: s.name, pickupTime: s.pickupTime, dropTime: s.dropTime, monthlyFee: Number(s.monthlyFee), lat: s.lat, lng: s.lng }));
    const vehicleId = route.vehicleId;
    const vehicle = (await transport.get(`/api/transport/vehicles/${vehicleId}`)).data;
    const existingAlloc = ((await transport.get('/api/transport/allocations')).data as Array<{ id: string; studentId: string }>).find((a) => a.studentId === khushi.id);
    let allocId: string | null = null;
    try {
      // Tracking off: everything refused.
      okr(await admin.put('/api/settings', { settings: { liveTracking: { ...original.liveTracking, enabled: false } } }), 'tracking off');
      is(await staff.post('/api/transport/trips', { vehicleId, kind: 'PICKUP' }), 403, 'no trips while tracking is off');
      okr(await admin.put('/api/settings', { settings: { liveTracking: { enabled: true, shareWithParents: true, pingIntervalSec: 10, approachAlertMeters: 800, retainDays: 30 } } }), 'admin turns live tracking on');

      // Setup: stop coordinates (Gandhi Maidan, Patna), driver link, student on the route.
      okr(await transport.put(`/api/transport/routes/${route.id}/stops`, { stops: originalStops.map((s, i) => (i === 0 ? { ...s, lat: 25.6195, lng: 85.1453 } : s)) }), 'stop coordinates saved');
      okr(await transport.put(`/api/transport/vehicles/${vehicleId}`, { driverEmployeeId: staffMe.user.employeeId }), 'transport manager links driver login');
      if (!existingAlloc) {
        const a = await transport.post('/api/transport/allocations', { studentId: khushi.id, stopId: stop.id, tripType: 'BOTH' });
        okr(a, 'student assigned to the stop');
        allocId = a.data.id;
      }
      const stopId = existingAlloc ? null : stop.id;
      check('driver flagged in /api/me', (await staff.get('/api/me')).data.isDriver === true);
      const drv = await staff.get('/api/transport/driver');
      check('driver sees the vehicle', drv.data?.vehicles?.some((v: { id: string }) => v.id === vehicleId), drv.data);
      is(await teacher.post('/api/transport/trips', { vehicleId, kind: 'PICKUP' }), 403, 'non-driver cannot start a trip');
      const trip = await staff.post('/api/transport/trips', { vehicleId, kind: 'PICKUP' });
      okr(trip, 'driver starts pickup trip');
      is(await staff.post('/api/transport/trips', { vehicleId, kind: 'DROP' }), 409, 'one running trip per vehicle');

      // Far away (Patna Junction, ~2 km): no alert yet; parent sees ETA.
      const far = await staff.post('/api/transport/tracking/ping', { vehicleId, lat: 25.6029, lng: 85.1376, speedKmh: 24, heading: 30, accuracyM: 8 });
      okr(far, 'driver sends position');
      check('no alert when far', far.data?.alertedStops === 0, far.data);
      is(await teacher.post('/api/transport/tracking/ping', { vehicleId, lat: 25.6, lng: 85.1 }), 403, 'non-driver cannot move the bus');
      is(await staff.post('/api/transport/tracking/ping', { vehicleId, lat: 0, lng: 0 }), 400, 'null-island position rejected');
      if (stopId) {
        const live = await student.get('/api/transport/live/mine');
        check('student sees the live bus', live.data?.bus?.live === true && live.data?.bus?.trip?.kind === 'PICKUP', live.data);
        check('distance about 2 km', live.data?.distanceM > 1800 && live.data?.distanceM < 2200, live.data?.distanceM);
        check('ETA in minutes', typeof live.data?.etaMin === 'number' && live.data.etaMin >= 1, live.data?.etaMin);
      }
      const board = await transport.get('/api/transport/live');
      check('staff live board shows the bus as live', board.data?.vehicles?.find((v: { id: string }) => v.id === vehicleId)?.live === true);
      is(await student.get('/api/transport/live'), 403, 'families cannot see the whole fleet');

      // Near the stop: alert once.
      const before = (await student.get('/api/notifications')).data.unread;
      const near = await staff.post('/api/transport/tracking/ping', { vehicleId, lat: 25.6188, lng: 85.1449, speedKmh: 15 });
      if (stopId) {
        check('approach alert sent for the stop', near.data?.alertedStops >= 1, near.data);
        const after = await student.get('/api/notifications');
        check('student notified "Bus approaching"', after.data.unread > before && after.data.items.some((n: { title: string }) => n.title.startsWith('Bus approaching')));
        const again = await staff.post('/api/transport/tracking/ping', { vehicleId, lat: 25.6190, lng: 85.1450, speedKmh: 10 });
        check('no duplicate alert for the same stop', again.data?.alertedStops === 0, again.data);
      }

      // GPS hardware: secret link, OsmAnd/Traccar parameters.
      const link = await transport.post(`/api/transport/vehicles/${vehicleId}/tracking`);
      okr(link, 'transport manager creates GPS device link');
      const anon = new Session();
      const dev = await anon.raw(`/api/public/tracking?id=${link.data.token}&lat=25.6100&lon=85.1400&timestamp=${Math.floor(Date.now() / 1000)}&speed=10&bearing=90&accuracy=5`, { method: 'POST' });
      check('Traccar-style POST accepted', dev.status === 200, dev.status);
      const dev2 = await anon.raw(`/api/public/tracking/${link.data.token}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: { coords: { latitude: 25.611, longitude: 85.141, speed: 5 } } }) });
      check('JSON device POST accepted', dev2.status === 200, dev2.status);
      const bad = await anon.raw('/api/public/tracking?id=trk_invalidinvalidinvalidinvalid&lat=25&lon=85', { method: 'POST' });
      check('unknown device token refused', bad.status === 404, bad.status);
      const rotated = await transport.post(`/api/transport/vehicles/${vehicleId}/tracking`);
      const stale = await anon.raw(`/api/public/tracking/${link.data.token}?lat=25.6&lon=85.1`, { method: 'POST' });
      check('rotating the link revokes the old one', rotated.ok && stale.status === 404, stale.status);
      const v = (await transport.get('/api/transport/live')).data.vehicles.find((x: { id: string }) => x.id === vehicleId);
      check('device fix becomes the last known position', Math.abs(v.lastLat - 25.611) < 0.001, v.lastLat);

      okr(await staff.patch(`/api/transport/trips/${trip.data.id}`), 'driver ends trip');
      is(await staff.patch(`/api/transport/trips/${trip.data.id}`), 400, 'cannot end twice');
    } finally {
      await transport.put(`/api/transport/vehicles/${vehicleId}`, { driverEmployeeId: vehicle.driverEmployeeId ?? null });
      await transport.del(`/api/transport/vehicles/${vehicleId}/tracking`);
      await transport.put(`/api/transport/routes/${route.id}/stops`, { stops: originalStops });
      if (allocId) await transport.del(`/api/transport/allocations/${allocId}`);
      await db.transportTrip.deleteMany({ where: { vehicleId } });
      await db.vehicleLocation.deleteMany({ where: { vehicleId } });
      await db.vehicle.update({ where: { id: vehicleId }, data: { lastLat: null, lastLng: null, lastSpeedKmh: null, lastHeading: null, lastSeenAt: null } });
      await db.notification.deleteMany({ where: { title: { startsWith: 'Bus approaching' } } });
      await restore('liveTracking');
    }
  });

  await run('Phone push: subscription lifecycle and school switch', async () => {
    const info = await parent.get('/api/push/subscribe');
    okr(info, 'device can read push configuration');
    check('push available with a public key', info.data?.available === true && typeof info.data?.publicKey === 'string', info.data);
    const endpoint = `https://fcm.googleapis.com/fcm/send/test-${uniq}`;
    const keys = { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM', auth: 'tBHItJI5svbpez7KI4CCXg' };
    okr(await parent.post('/api/push/subscribe', { endpoint, keys }), 'subscribe this device');
    is(await parent.post('/api/push/subscribe', { endpoint: 'http://insecure.example/push', keys }), 400, 'non-https endpoint refused');
    check('subscription stored for the parent', (await db.pushSubscription.count({ where: { endpoint } })) === 1);
    okr(await teacher.post('/api/push/subscribe', { endpoint, keys }), 'shared phone: teacher signs in on the same device');
    const sub = await db.pushSubscription.findFirst({ where: { endpoint }, select: { userId: true } });
    check('device now belongs to the newest sign-in', sub?.userId === (await teacher.get('/api/me')).data.user.id);
    okr(await admin.put('/api/settings', { settings: { notifications: { pushEnabled: false } } }), 'school turns push off');
    is(await parent.post('/api/push/subscribe', { endpoint: `${endpoint}-2`, keys }), 403, 'no new subscriptions while off');
    await restore('notifications');
    okr(await teacher.del('/api/push/subscribe', { endpoint }), 'unsubscribe');
    check('subscription removed', (await db.pushSubscription.count({ where: { endpoint } })) === 0);
  });

  await run('Tally export: masters and vouchers, accounts-only', async () => {
    const m = await accountant.raw('/api/accounts/tally?kind=masters');
    const mx = await m.text();
    check('ledger masters download', m.status === 200 && mx.includes('<LEDGER NAME=') && mx.includes('Cash-in-Hand'), m.status);
    const from = `${today.slice(0, 7)}-01`;
    const v = await accountant.raw(`/api/accounts/tally?kind=vouchers&from=2026-04-01&to=${today}`);
    const vx = await v.text();
    check('vouchers download as XML attachment', v.status === 200 && (v.headers.get('content-disposition') ?? '').includes('tally-vouchers') && vx.includes('<ENVELOPE>'), v.status);
    check('fee income exported as Receipt vouchers', vx.includes('VCHTYPE="Receipt"'));
    const debits = [...vx.matchAll(/<AMOUNT>-([\d.]+)<\/AMOUNT>/g)].reduce((a, x) => a + Number(x[1]), 0);
    const credits = [...vx.matchAll(/<AMOUNT>([\d.]+)<\/AMOUNT>/g)].reduce((a, x) => a + Number(x[1]), 0);
    check('debits equal credits', Math.abs(debits - credits) < 0.01, { debits, credits });
    is(await accountant.get(`/api/accounts/tally?kind=vouchers&from=${today}&to=${from}`), 400, 'reversed date range refused');
    const t = await teacher.raw('/api/accounts/tally?kind=masters');
    check('teacher cannot export accounts', t.status === 403, t.status);
  });

  await run('Platform and anonymous users stay locked out of new endpoints', async () => {
    const platform = await as('', 'platform');
    for (const p of ['/api/hostels', '/api/transport/live', '/api/transport/driver', '/api/push/subscribe', '/api/accounts/tally?kind=masters']) {
      is(await platform.get(p), 403, `platform ${p}`);
      is(await new Session().get(p), 401, `anonymous ${p}`);
    }
    void owner;
  });

  await db.$disconnect();
  console.log(`\n${passed} passed, ${failures.length} failed  (${BASE})`);
  if (failures.length) {
    console.log('\nFailures:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
})().catch(async (e) => {
  console.error(e);
  await db.$disconnect();
  process.exit(1);
});
