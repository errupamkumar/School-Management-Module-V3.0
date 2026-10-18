'use client';

import * as React from 'react';
import { AlertTriangle, Bus, CircleStop, LocateFixed, MapPin, Navigation, Play, Wifi, WifiOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Select } from '@/components/ui/form';
import { LiveMap } from '@/components/live-map';

interface DriverVehicle {
  id: string;
  registrationNo: string;
  model: string | null;
  driverName: string;
  lastSeenAt: string | null;
  routes: Array<{ id: string; name: string; _count: { stops: number; passengers: number } }>;
  activeTrip: { id: string; kind: 'PICKUP' | 'DROP'; routeId: string | null; startedAt: string } | null;
}
interface DriverData {
  enabled: boolean;
  pingIntervalSec: number;
  vehicles: DriverVehicle[];
}
type Fix = { lat: number; lng: number; speedKmh: number | null; heading: number | null; accuracyM: number | null; recordedAt: string };

/** Sends the phone's position for a vehicle while a trip runs. Survives brief signal loss by queueing fixes. */
function useLocationSharing(vehicleId: string | null, active: boolean, intervalSec: number) {
  const [last, setLast] = React.useState<Fix | null>(null);
  const [sentAt, setSentAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [queued, setQueued] = React.useState(0);
  const latest = React.useRef<Fix | null>(null);
  const queue = React.useRef<Fix[]>([]);

  React.useEffect(() => {
    if (!active || !vehicleId) return;
    if (!('geolocation' in navigator)) {
      setError('This phone or browser cannot share location.');
      return;
    }
    setError(null);
    const watch = navigator.geolocation.watchPosition(
      (p) => {
        const fix: Fix = {
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          speedKmh: p.coords.speed != null && p.coords.speed >= 0 ? Math.round(p.coords.speed * 3.6 * 10) / 10 : null,
          heading: p.coords.heading != null && !Number.isNaN(p.coords.heading) ? Math.round(p.coords.heading) : null,
          accuracyM: Math.round(p.coords.accuracy),
          recordedAt: new Date(p.timestamp).toISOString(),
        };
        latest.current = fix;
        setLast(fix);
        setError(null);
      },
      (e) => setError(e.code === e.PERMISSION_DENIED ? 'Location permission was denied. Allow location for this site in your browser settings.' : 'Waiting for a GPS signal…'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );

    let wake: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((w) => (wake = w)).catch(() => {});

    const send = async () => {
      if (latest.current) {
        queue.current.push(latest.current);
        latest.current = null;
      }
      while (queue.current.length) {
        const fix = queue.current[0];
        try {
          await api('/api/transport/tracking/ping', { method: 'POST', body: { vehicleId, ...fix } });
          queue.current.shift();
          setSentAt(new Date());
        } catch (e) {
          // Keep the newest 50 fixes and retry on the next tick (e.g. no signal in a tunnel).
          queue.current = queue.current.slice(-50);
          if ((e as { status?: number }).status === 403) setError((e as Error).message);
          break;
        }
      }
      setQueued(queue.current.length);
    };
    const timer = window.setInterval(send, Math.max(5, intervalSec) * 1000);
    void send();
    return () => {
      navigator.geolocation.clearWatch(watch);
      window.clearInterval(timer);
      void wake?.release().catch(() => {});
    };
  }, [active, vehicleId, intervalSec]);

  return { last, sentAt, error, queued };
}

export default function DriverPage() {
  const { data, isLoading } = useApiQuery<DriverData>('/api/transport/driver', undefined, { refetchInterval: 30_000 });
  const invalidate = useInvalidate();
  const [vehicleId, setVehicleId] = React.useState('');
  const [routeId, setRouteId] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!vehicleId && data?.vehicles.length) setVehicleId((data.vehicles.find((v) => v.activeTrip) ?? data.vehicles[0]).id);
  }, [data, vehicleId]);
  const vehicle = data?.vehicles.find((v) => v.id === vehicleId) ?? null;
  React.useEffect(() => {
    if (vehicle) setRouteId(vehicle.activeTrip?.routeId ?? vehicle.routes[0]?.id ?? '');
  }, [vehicle?.id, vehicle?.activeTrip?.routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  const trip = vehicle?.activeTrip ?? null;
  const share = useLocationSharing(vehicle?.id ?? null, !!trip && !!data?.enabled, data?.pingIntervalSec ?? 15);

  const start = async (kind: 'PICKUP' | 'DROP') => {
    if (!vehicle) return;
    setBusy(true);
    try {
      await api('/api/transport/trips', { method: 'POST', body: { vehicleId: vehicle.id, kind, routeId: routeId || null } });
      toast.success(kind === 'PICKUP' ? 'Pickup trip started. Keep this screen open.' : 'Drop trip started. Keep this screen open.');
      invalidate(['/api/transport/driver']);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const end = async () => {
    if (!trip) return;
    setBusy(true);
    try {
      await api(`/api/transport/trips/${trip.id}`, { method: 'PATCH' });
      toast.success('Trip ended. Location sharing stopped.');
      invalidate(['/api/transport/driver']);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !data) return <LoadingBlock />;
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <PageHeader title="Driver mode" description="Share the bus location with parents during a trip. Keep this screen open while driving." icon={Navigation} />
      {!data.enabled ? (
        <Card>
          <EmptyState icon={AlertTriangle} title="Live tracking is off" description="An administrator can turn it on in School Settings → Languages & app → Live bus tracking." />
        </Card>
      ) : !data.vehicles.length ? (
        <Card>
          <EmptyState icon={Bus} title="No vehicle assigned to you" description="Ask the transport manager to set you as the driver of your vehicle." />
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Vehicle">
                  <Select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!!trip} options={data.vehicles.map((v) => ({ value: v.id, label: `${v.registrationNo}${v.model ? ` · ${v.model}` : ''}${v.activeTrip ? ' (on trip)' : ''}` }))} />
                </Field>
                <Field label="Route">
                  <Select value={routeId} onChange={(e) => setRouteId(e.target.value)} disabled={!!trip} options={vehicle?.routes.length ? vehicle.routes.map((r) => ({ value: r.id, label: `${r.name} · ${r._count.passengers} students` })) : [{ value: '', label: 'No route linked' }]} />
                </Field>
              </div>
              {trip ? (
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-4 dark:bg-emerald-500/10">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-emerald-600" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-200">{trip.kind === 'PICKUP' ? 'Pickup trip running' : 'Drop trip running'}</p>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Started {formatDateTime(trip.startedAt)}. Parents can see the bus live.</p>
                  </div>
                  <Button variant="danger" size="lg" onClick={end} loading={busy}>
                    <CircleStop /> End trip
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button size="lg" className="h-16 text-base" onClick={() => start('PICKUP')} loading={busy}>
                    <Play /> Start pickup trip
                  </Button>
                  <Button size="lg" variant="secondary" className="h-16 text-base" onClick={() => start('DROP')} loading={busy}>
                    <Play /> Start drop trip
                  </Button>
                </div>
              )}
            </CardBody>
          </Card>

          {trip && (
            <Card>
              <CardHeader title="Location sharing" icon={LocateFixed} />
              <CardBody className="space-y-4">
                {share.error ? (
                  <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" /> {share.error}
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                  <Stat label="Last sent" value={share.sentAt ? share.sentAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'} />
                  <Stat label="Speed" value={share.last?.speedKmh != null ? `${share.last.speedKmh} km/h` : '—'} />
                  <Stat label="GPS accuracy" value={share.last?.accuracyM != null ? `±${share.last.accuracyM} m` : '—'} />
                  <Stat label="Connection" value={share.queued ? <span className="inline-flex items-center gap-1 text-amber-600"><WifiOff className="size-4" /> {share.queued} waiting</span> : <span className="inline-flex items-center gap-1 text-emerald-600"><Wifi className="size-4" /> Online</span>} />
                </div>
                {share.last && <LiveMap markers={[{ id: 'me', lat: share.last.lat, lng: share.last.lng, kind: 'bus', label: vehicle?.registrationNo ?? 'Bus', heading: share.last.heading }]} height={260} />}
                <p className="flex items-center gap-1.5 text-xs text-ink-faint">
                  <MapPin className="size-3.5" /> Sends your position every {data.pingIntervalSec} seconds. Parents get an alert as you approach their stop.
                </p>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className={cn('rounded-xl border border-line p-3')}>
      <p className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

