'use client';

import * as React from 'react';
import { AlertTriangle, Bus, Copy, Crosshair, LocateFixed, MapPin, Phone, Plus, Radio, RefreshCw, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, downloadCsv, formatDate, formatINR } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { ResourcePage, dateInput } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, KeyValue, LoadingBlock, PageHeader } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select } from '@/components/ui/form';
import { Dialog, MenuItem, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { LiveMap, type MapMarker } from '@/components/live-map';
import { useLookups } from '@/lib/lookups';

interface Vehicle {
  id: string;
  registrationNo: string;
  model: string | null;
  capacity: number;
  driverName: string;
  driverPhone: string;
  driverLicenseNo: string | null;
  attendantName: string | null;
  attendantPhone: string | null;
  insuranceExpiry: string | null;
  fitnessExpiry: string | null;
  pucExpiry: string | null;
  permitExpiry: string | null;
  driverEmployeeId: string | null;
  isActive: boolean;
  routes: Array<{ id: string; name: string }>;
}

function Expiry({ date, label }: { date: string | null; label: string }) {
  if (!date) return <Badge>{label}: —</Badge>;
  const days = Math.floor((new Date(date).getTime() - Date.now()) / 86_400_000);
  return (
    <Badge tone={days < 0 ? 'danger' : days <= 30 ? 'warning' : 'success'} dot>
      {label}: {days < 0 ? `expired ${-days}d ago` : days <= 30 ? `${days}d left` : formatDate(date)}
    </Badge>
  );
}

function Vehicles() {
  const { data: lk } = useLookups(['employees']);
  const { can } = useApp();
  const [linkFor, setLinkFor] = React.useState<Vehicle | null>(null);
  return (
    <>
    <ResourcePage<Vehicle>
      embedded
      title="Vehicles"
      entityLabel="Vehicle"
      endpoint="/api/transport/vehicles"
      module="transport"
      dialogSize="lg"
      invalidate={['/api/dashboard', '/api/transport/routes']}
      searchPlaceholder="Registration, driver…"
      columns={[
        { accessorKey: 'registrationNo', header: 'Vehicle', cell: ({ row }) => <div><p className="font-mono font-semibold">{row.original.registrationNo}</p><p className="text-xs text-ink-faint">{row.original.model} · {row.original.capacity} seats</p></div> },
        { accessorKey: 'driverName', header: 'Driver', cell: ({ row }) => <div><p>{row.original.driverName}</p><a href={`tel:${row.original.driverPhone}`} className="text-xs text-brand-600">{row.original.driverPhone}</a></div> },
        {
          id: 'compliance',
          header: 'Compliance',
          cell: ({ row }) => (
            <div className="flex max-w-md flex-wrap gap-1">
              <Expiry date={row.original.insuranceExpiry} label="Insurance" />
              <Expiry date={row.original.fitnessExpiry} label="Fitness" />
              <Expiry date={row.original.pucExpiry} label="PUC" />
              <Expiry date={row.original.permitExpiry} label="Permit" />
            </div>
          ),
        },
        { id: 'routes', header: 'Route', cell: ({ row }) => row.original.routes.map((r) => r.name).join(', ') || '—' },
      ]}
      fields={[
        { name: 'registrationNo', label: 'Registration no.', required: true, placeholder: 'BR01PA4521' },
        { name: 'model', label: 'Make / model' },
        { name: 'capacity', label: 'Seating capacity', type: 'number', required: true },
        { name: 'driverName', label: 'Driver name', required: true },
        { name: 'driverPhone', label: 'Driver mobile', type: 'tel', required: true },
        { name: 'driverLicenseNo', label: 'Driving licence no.' },
        { name: 'attendantName', label: 'Lady attendant' },
        { name: 'attendantPhone', label: 'Attendant mobile', type: 'tel' },
        { name: 'insuranceExpiry', label: 'Insurance valid till', type: 'date' },
        { name: 'fitnessExpiry', label: 'Fitness certificate till', type: 'date' },
        { name: 'pucExpiry', label: 'PUC till', type: 'date' },
        { name: 'permitExpiry', label: 'Permit till', type: 'date' },
        {
          name: 'driverEmployeeId',
          label: 'Driver login (for live tracking)',
          type: 'select',
          hint: 'This employee can share the bus location from Driver mode.',
          options: [{ value: '', label: 'Not linked' }, ...((lk?.employees ?? []) as Array<{ id: string; name: string; designation: string; userId: string | null }>).filter((e) => e.userId).map((e) => ({ value: e.id, label: `${e.name} · ${e.designation}` }))],
        },
        { name: 'isActive', label: 'In service', type: 'switch' },
      ]}
      defaults={{ capacity: 40, isActive: true, driverEmployeeId: '' }}
      toForm={(v) => ({ ...v, driverEmployeeId: v.driverEmployeeId ?? '', insuranceExpiry: dateInput(v.insuranceExpiry), fitnessExpiry: dateInput(v.fitnessExpiry), pucExpiry: dateInput(v.pucExpiry), permitExpiry: dateInput(v.permitExpiry) })}
      rowActions={(v) =>
        can('transport', 'edit') ? (
          <MenuItem onSelect={() => setLinkFor(v)}>
            <Radio /> GPS device link
          </MenuItem>
        ) : null
      }
    />
    <DeviceLinkDialog vehicle={linkFor} onClose={() => setLinkFor(null)} />
    </>
  );
}

/** Issue or rotate the secret URL a GPS tracker (or the free Traccar Client app) posts positions to. */
function DeviceLinkDialog({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const [link, setLink] = React.useState<{ url: string; traccar: { serverUrl: string; deviceIdentifier: string } } | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setLink(null), [vehicle?.id]);
  const copy = (t: string) => navigator.clipboard.writeText(t).then(() => toast.success('Copied'), () => toast.error('Copy failed; select and copy the text.'));
  const issue = async () => {
    if (!vehicle) return;
    setBusy(true);
    try {
      setLink(await api(`/api/transport/vehicles/${vehicle.id}/tracking`, { method: 'POST' }));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!vehicle} onOpenChange={(o) => !o && onClose()} title={vehicle ? `GPS device link · ${vehicle.registrationNo}` : ''} description="Hardware GPS trackers and tracker apps post the bus position to this secret link. Rotating it stops the old link immediately.">
      <div className="space-y-4 text-sm">
        {!link ? (
          <Button onClick={issue} loading={busy}>
            <RefreshCw /> Create or rotate link
          </Button>
        ) : (
          <>
            <Field label="Device URL (GPS hardware: HTTP / OsmAnd protocol)">
              <div className="flex gap-2">
                <Input readOnly value={link.url} onFocus={(e) => e.currentTarget.select()} />
                <Button variant="secondary" size="icon" aria-label="Copy URL" onClick={() => copy(link.url)}>
                  <Copy />
                </Button>
              </div>
            </Field>
            <div className="rounded-xl bg-canvas p-3">
              <p className="font-semibold">Using a phone as the tracker (Traccar Client app)</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-ink-soft">
                <li>
                  Install <b>Traccar Client</b> (free, Android and iPhone) on the phone kept in the bus.
                </li>
                <li>
                  Server URL: <span className="select-all font-mono text-xs">{link.traccar.serverUrl}</span>
                </li>
                <li>
                  Device identifier: <span className="select-all break-all font-mono text-xs">{link.traccar.deviceIdentifier}</span>
                </li>
                <li>Turn the service on. Positions appear on the Live map within a minute.</li>
              </ol>
            </div>
            <p className="text-xs text-ink-faint">Treat this link like a password. Anyone with it can move the bus on the map.</p>
          </>
        )}
      </div>
    </Dialog>
  );
}

interface LiveVehicle {
  id: string;
  registrationNo: string;
  model: string | null;
  driverName: string;
  driverPhone: string;
  lastLat: number | null;
  lastLng: number | null;
  lastSpeedKmh: number | null;
  lastHeading: number | null;
  lastSeenAt: string | null;
  live: boolean;
  hasDeviceLink: boolean;
  driverEmployeeId: string | null;
  activeTrip: { id: string; kind: string; startedAt: string } | null;
  routes: Array<{ id: string; name: string; stops: Array<{ id: string; name: string; lat: number | null; lng: number | null }> }>;
}

function ago(iso: string | null) {
  if (!iso) return 'never';
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : formatDate(iso);
}

/** Staff live board: all buses on one map, with trip state and last-seen time. */
function LiveBoard() {
  const { data } = useApiQuery<{ enabled: boolean; vehicles: LiveVehicle[] }>('/api/transport/live', undefined, { refetchInterval: 10_000 });
  const [focus, setFocus] = React.useState<string | null>(null);
  if (!data) return <LoadingBlock />;
  if (!data.enabled)
    return (
      <Card>
        <EmptyState icon={Radio} title="Live tracking is off" description="Turn it on in School Settings → Languages & app → Live bus tracking, then link a driver or a GPS device to each vehicle." />
      </Card>
    );
  const shown = focus ? data.vehicles.filter((v) => v.id === focus) : data.vehicles;
  const markers: MapMarker[] = [
    ...shown
      .filter((v) => v.lastLat != null && v.lastLng != null)
      .map((v) => ({ id: v.id, lat: v.lastLat!, lng: v.lastLng!, kind: 'bus' as const, label: `${v.registrationNo} · ${v.live ? (v.lastSpeedKmh != null ? `${Math.round(v.lastSpeedKmh)} km/h` : 'live') : `last seen ${ago(v.lastSeenAt)}`}`, stale: !v.live, heading: v.lastHeading })),
    ...(focus ? shown.flatMap((v) => v.routes.flatMap((r) => r.stops.filter((s) => s.lat != null && s.lng != null).map((s) => ({ id: s.id, lat: s.lat!, lng: s.lng!, kind: 'stop' as const, label: s.name })))) : []),
  ];
  const path = focus ? shown.flatMap((v) => v.routes[0]?.stops.filter((s) => s.lat != null && s.lng != null).map((s) => [s.lat!, s.lng!] as [number, number]) ?? []) : undefined;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <Card className="p-2">
        {markers.length ? <LiveMap markers={markers} path={path} height={520} /> : <EmptyState icon={LocateFixed} title="No positions yet" description="Positions appear when a driver starts a trip in Driver mode or a GPS device sends its first fix." />}
      </Card>
      <Card>
        <CardHeader title="Fleet" description={`${data.vehicles.filter((v) => v.live).length} of ${data.vehicles.length} live`} icon={Bus} />
        <ul className="divide-y divide-line">
          {data.vehicles.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => setFocus(focus === v.id ? null : v.id)} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-canvas', focus === v.id && 'bg-brand-50 dark:bg-brand-500/10')}>
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', v.live ? 'bg-emerald-500' : 'bg-slate-300')} />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold">{v.registrationNo}</span>
                  <span className="block truncate text-xs text-ink-faint">
                    {v.routes.map((r) => r.name).join(', ') || 'No route'} · {v.driverName}
                  </span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    {v.activeTrip ? (
                      <Badge tone="success" dot>
                        {v.activeTrip.kind === 'PICKUP' ? 'Pickup trip' : 'Drop trip'}
                      </Badge>
                    ) : (
                      <Badge>No trip</Badge>
                    )}
                    <Badge tone={v.live ? 'success' : 'neutral'}>{v.live ? 'Live' : `Seen ${ago(v.lastSeenAt)}`}</Badge>
                    {!v.driverEmployeeId && !v.hasDeviceLink && <Badge tone="warning">No driver or device linked</Badge>}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}


interface RouteRow {
  id: string;
  name: string;
  vehicleId: string | null;
  isActive: boolean;
  vehicle: Vehicle | null;
  stops: Array<{ id: string; name: string; pickupTime: string | null; dropTime: string | null; monthlyFee: number; sortOrder: number; lat: number | null; lng: number | null }>;
  _count: { passengers: number };
}

function StopsEditor({ route, onClose }: { route: RouteRow; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [stops, setStops] = React.useState(route.stops.map((s) => ({ ...s, pickupTime: s.pickupTime ?? '', dropTime: s.dropTime ?? '', monthlyFee: Number(s.monthlyFee), lat: s.lat != null ? String(s.lat) : '', lng: s.lng != null ? String(s.lng) : '' })));
  const here = (i: number) =>
    navigator.geolocation?.getCurrentPosition(
      (p) => upd(i, { lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }),
      () => toast.error('Could not read your location. Allow location access, or type the coordinates.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  const upd = (i: number, p: Partial<(typeof stops)[number]>) => setStops((s) => s.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Stops · ${route.name}`}
      description="Order matters: list stops in pickup sequence. The monthly fare is added to fee invoices automatically."
      size="lg"
      footer={
        <Button
          onClick={async () => {
            try {
              await api(`/api/transport/routes/${route.id}/stops`, { method: 'PUT', body: { stops: stops.map((s) => ({ id: s.id || undefined, name: s.name, pickupTime: s.pickupTime || null, dropTime: s.dropTime || null, monthlyFee: s.monthlyFee, lat: s.lat === '' ? null : Number(s.lat), lng: s.lng === '' ? null : Number(s.lng) })) } });
              toast.success('Stops saved');
              invalidate(['/api/transport', '/api/lookups']);
              onClose();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          Save stops
        </Button>
      }
    >
      <div className="space-y-2">
        {stops.map((s, i) => (
          <div key={s.id || i} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-line p-2 sm:grid-cols-[2rem_1fr_7rem_7rem_7rem_2rem]">
            <span className="mb-2 text-center text-sm font-bold text-ink-faint">{i + 1}</span>
            <Input value={s.name} onChange={(e) => upd(i, { name: e.target.value })} placeholder="Stop name" aria-label="Stop name" />
            <Input type="time" value={s.pickupTime} onChange={(e) => upd(i, { pickupTime: e.target.value })} aria-label="Pickup" />
            <Input type="time" value={s.dropTime} onChange={(e) => upd(i, { dropTime: e.target.value })} aria-label="Drop" />
            <Input type="number" value={s.monthlyFee} onChange={(e) => upd(i, { monthlyFee: Number(e.target.value) })} aria-label="Monthly fare" />
            <Button variant="ghost" size="icon-sm" aria-label="Remove stop" onClick={() => setStops((x) => x.filter((_, j) => j !== i))}>
              <Trash2 />
            </Button>
            <div className="col-span-2 flex flex-wrap items-center gap-2 sm:col-span-6 sm:pl-10">
              <Input className="w-36" inputMode="decimal" value={s.lat} onChange={(e) => upd(i, { lat: e.target.value })} placeholder="Latitude" aria-label="Latitude" />
              <Input className="w-36" inputMode="decimal" value={s.lng} onChange={(e) => upd(i, { lng: e.target.value })} placeholder="Longitude" aria-label="Longitude" />
              <Button variant="ghost" size="sm" onClick={() => here(i)}>
                <Crosshair /> Use my location
              </Button>
            </div>
          </div>
        ))}
        <p className="text-[11px] text-ink-faint">Columns: name · pickup · drop · monthly fare (₹). Coordinates power the live map and “bus approaching” alerts.</p>
        <Button variant="ghost" size="sm" onClick={() => setStops((s) => [...s, { id: '', name: '', pickupTime: '', dropTime: '', monthlyFee: 0, sortOrder: s.length + 1, lat: '', lng: '' }])}>
          <Plus /> Add stop
        </Button>
      </div>
    </Dialog>
  );
}

function Routes() {
  const { can } = useApp();
  const { data: vehicles } = useApiQuery<Vehicle[]>('/api/transport/vehicles');
  const [editing, setEditing] = React.useState<RouteRow | null>(null);
  return (
    <>
      <ResourcePage<RouteRow>
        embedded
        title="Routes"
        entityLabel="Route"
        endpoint="/api/transport/routes"
        module="transport"
        invalidate={['/api/lookups']}
        columns={[
          { accessorKey: 'name', header: 'Route', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
          { id: 'vehicle', header: 'Vehicle', cell: ({ row }) => (row.original.vehicle ? <span className="font-mono text-xs">{row.original.vehicle.registrationNo}</span> : '—') },
          { id: 'stops', header: 'Stops', cell: ({ row }) => <span className="text-xs text-ink-soft">{row.original.stops.map((s) => s.name).join(' → ') || '—'}</span> },
          { id: 'load', header: 'Students', cell: ({ row }) => { const cap = row.original.vehicle?.capacity; const n = row.original._count.passengers; return <Badge tone={cap && n >= cap ? 'danger' : 'neutral'}>{n}{cap ? ` / ${cap}` : ''}</Badge>; } },
        ]}
        fields={[
          { name: 'name', label: 'Route name', required: true, placeholder: 'Route 4 — Bailey Road' },
          { name: 'vehicleId', label: 'Vehicle', type: 'select', options: (vehicles ?? []).map((v) => ({ value: v.id, label: `${v.registrationNo} (${v.capacity})` })) },
          { name: 'isActive', label: 'Active', type: 'switch' },
        ]}
        defaults={{ isActive: true }}
        toForm={(r) => ({ name: r.name, vehicleId: r.vehicleId ?? '', isActive: r.isActive })}
        rowActions={(r) =>
          can('transport', 'edit') ? (
            <MenuItem onSelect={() => setEditing(r)}>
              <MapPin /> Edit stops
            </MenuItem>
          ) : null
        }
      />
      {editing && <StopsEditor route={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

interface Alloc {
  id: string;
  studentId: string;
  name: string;
  admissionNo: string;
  classLabel: string;
  phone: string | null;
  route: string;
  routeId: string;
  stop: string;
  pickupTime: string | null;
  tripType: string;
}

function Allocations() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: routes } = useApiQuery<RouteRow[]>('/api/transport/routes');
  const [routeId, setRouteId] = React.useState('');
  const { data, isLoading } = useApiQuery<Alloc[]>('/api/transport/allocations', { routeId: routeId || undefined });
  const [open, setOpen] = React.useState(false);
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [stopId, setStopId] = React.useState('');
  const [trip, setTrip] = React.useState('BOTH');
  const stops = (routes ?? []).flatMap((r) => r.stops.map((s) => ({ value: s.id, label: `${r.name} · ${s.name} (${formatINR(Number(s.monthlyFee), true)}/mo)` })));
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Select className="h-9 w-56" value={routeId} onChange={(e) => setRouteId(e.target.value)} options={(routes ?? []).map((r) => ({ value: r.id, label: r.name }))} placeholder="All routes" />
          <Button variant="secondary" size="sm" disabled={!data?.length} onClick={() => downloadCsv('transport-students', (data ?? []).map((a) => ({ Route: a.route, Stop: a.stop, Pickup: a.pickupTime ?? '', Student: a.name, 'Adm No': a.admissionNo, Class: a.classLabel, Mobile: a.phone ?? '', Trip: a.tripType })))}>
            Export manifest
          </Button>
          {can('transport', 'create') && (
            <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
              <UserPlus /> Assign student
            </Button>
          )}
        </div>
        <DataTable<Alloc>
          data={data}
          loading={isLoading}
          emptyTitle="No students on this route"
          columns={[
            { accessorKey: 'name', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-ink-faint">{row.original.admissionNo} · {row.original.classLabel}</p></div> },
            { accessorKey: 'route', header: 'Route' },
            { accessorKey: 'stop', header: 'Stop', cell: ({ row }) => <span>{row.original.stop} <span className="text-xs text-ink-faint">{row.original.pickupTime}</span></span> },
            { accessorKey: 'tripType', header: 'Trip', cell: ({ getValue }) => <Badge>{String(getValue()).toLowerCase()}</Badge> },
            { accessorKey: 'phone', header: 'Parent', cell: ({ getValue }) => (getValue() ? <a href={`tel:${getValue()}`} className="text-xs text-brand-600">{getValue()}</a> : '—') },
            {
              id: 'x',
              header: '',
              cell: ({ row }) =>
                can('transport', 'delete') ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remove from transport"
                    onClick={async () => {
                      if (!(await confirm({ title: `Remove ${row.original.name} from transport?`, description: 'Transport fees stop from the next invoice.', confirmLabel: 'Remove' }))) return;
                      await api(`/api/transport/allocations/${row.original.id}`, { method: 'DELETE' });
                      invalidate(['/api/transport']);
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Assign transport"
        footer={
          <Button
            disabled={!student || !stopId}
            onClick={async () => {
              try {
                await api('/api/transport/allocations', { method: 'POST', body: { studentId: student!.id, stopId, tripType: trip } });
                toast.success(`${student!.name} assigned`);
                invalidate(['/api/transport']);
                setOpen(false);
                setStudent(null);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Assign
          </Button>
        }
      >
        <div className="space-y-4">
          <Field label="Student">
            <StudentPicker value={student} onChange={setStudent} />
          </Field>
          <Field label="Route & stop">
            <Select value={stopId} onChange={(e) => setStopId(e.target.value)} options={stops} placeholder="Choose…" />
          </Field>
          <Field label="Trip">
            <Select value={trip} onChange={(e) => setTrip(e.target.value)} options={[{ value: 'BOTH', label: 'Pickup & drop' }, { value: 'PICKUP', label: 'Pickup only' }, { value: 'DROP', label: 'Drop only' }]} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

interface LiveMine {
  available: boolean;
  reason?: string;
  route?: string;
  stop?: { id: string; name: string; lat: number | null; lng: number | null };
  stops?: Array<{ name: string; lat: number; lng: number }>;
  bus?: { registrationNo: string; lat: number | null; lng: number | null; speedKmh: number | null; heading: number | null; lastSeenAt: string | null; live: boolean; trip: { kind: string; startedAt: string } | null } | null;
  distanceM?: number | null;
  etaMin?: number | null;
}

/** Where the child's bus is right now, refreshed every 15 seconds. */
function LiveBusCard({ studentId }: { studentId: string }) {
  const { data } = useApiQuery<LiveMine>('/api/transport/live/mine', { studentId }, { refetchInterval: 15_000 });
  if (!data?.available) return null;
  const bus = data.bus;
  const onTrip = !!bus?.trip && bus.live;
  const markers: MapMarker[] = [
    ...(data.stop?.lat != null && data.stop?.lng != null ? [{ id: 'my-stop', lat: data.stop.lat, lng: data.stop.lng, kind: 'home' as const, label: `Your stop: ${data.stop.name}` }] : []),
    ...(data.stops ?? []).filter((s) => s.name !== data.stop?.name).map((s, i) => ({ id: `s${i}`, lat: s.lat, lng: s.lng, kind: 'stop' as const, label: s.name })),
    ...(bus?.lat != null && bus?.lng != null ? [{ id: 'bus', lat: bus.lat, lng: bus.lng, kind: 'bus' as const, label: bus.registrationNo, stale: !bus.live, heading: bus.heading }] : []),
  ];
  const km = data.distanceM != null ? (data.distanceM / 1000).toFixed(data.distanceM < 10_000 ? 1 : 0) : null;
  return (
    <Card className="mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4">
        <span className={cn('flex size-10 items-center justify-center rounded-xl', onTrip ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15' : 'bg-canvas text-ink-faint')}>
          <Radio className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{onTrip ? (data.etaMin != null ? `Bus is about ${data.etaMin} min away` : 'Bus is on the way') : 'Bus is not on a trip right now'}</p>
          <p className="text-xs text-ink-soft">
            {onTrip
              ? `${bus!.registrationNo} · ${bus!.trip!.kind === 'PICKUP' ? 'pickup' : 'drop'} trip${km ? ` · ${km} km from ${data.stop?.name}` : ''}${bus!.speedKmh != null ? ` · ${Math.round(bus!.speedKmh)} km/h` : ''}`
              : bus?.lastSeenAt
                ? `Last seen ${new Date(bus.lastSeenAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}. You will get an alert when it approaches your stop.`
                : 'You will get an alert when the bus approaches your stop.'}
          </p>
        </div>
        {onTrip && <Badge tone="success" dot>Live</Badge>}
      </div>
      {markers.length > 0 ? <LiveMap markers={markers} path={(data.stops ?? []).map((s) => [s.lat, s.lng] as [number, number])} height={320} /> : <p className="px-5 py-6 text-sm text-ink-soft">The map appears once the school adds stop locations or the bus starts sharing its position.</p>}
    </Card>
  );
}

function FamilyTransport() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<null | { route: string; stop: string; pickupTime: string | null; dropTime: string | null; monthlyFee: number; tripType: string; vehicle: Vehicle | null; stops: Array<{ name: string; pickupTime: string | null; dropTime: string | null }> }>(child ? '/api/transport/mine' : null, { studentId: child?.id });
  return (
    <>
      <PageHeader title="Transport" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={Bus} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data ? (
        <Card>
          <EmptyState icon={Bus} title="Not using school transport" description="Contact the school office to opt in." />
        </Card>
      ) : (
        <>
        {child && <LiveBusCard studentId={child.id} />}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title={data.route} icon={Bus} />
            <CardBody>
              <KeyValue
                items={[
                  ['Stop', data.stop],
                  ['Pickup', data.pickupTime],
                  ['Drop', data.dropTime],
                  ['Monthly fare', formatINR(Number(data.monthlyFee), true)],
                  ['Vehicle', data.vehicle ? `${data.vehicle.registrationNo} ${data.vehicle.model ?? ''}` : null],
                  ['Trip', data.tripType.toLowerCase()],
                ]}
              />
              {data.vehicle && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <a href={`tel:${data.vehicle.driverPhone}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-canvas">
                    <Phone className="size-4 text-brand-600" /> Driver: {data.vehicle.driverName}
                  </a>
                  {data.vehicle.attendantPhone && (
                    <a href={`tel:${data.vehicle.attendantPhone}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-canvas">
                      <Phone className="size-4 text-brand-600" /> Attendant: {data.vehicle.attendantName}
                    </a>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Route stops" icon={MapPin} />
            <ol className="relative mx-5 my-4 border-l-2 border-line">
              {data.stops.map((s) => (
                <li key={s.name} className="mb-4 ml-4">
                  <span className={cn('absolute -left-[7px] mt-1.5 size-3 rounded-full border-2 border-surface', s.name === data.stop ? 'bg-brand-600' : 'bg-slate-300')} />
                  <p className={cn('text-sm', s.name === data.stop && 'font-semibold text-brand-700')}>{s.name}</p>
                  <p className="text-xs text-ink-faint">
                    {s.pickupTime ?? '—'} / {s.dropTime ?? '—'}
                  </p>
                </li>
              ))}
            </ol>
          </Card>
        </div>
        </>
      )}
    </>
  );
}

export default function TransportPage() {
  const { isFamily } = useApp();
  const [tab, setTab] = React.useState('students');
  const { data: vehicles } = useApiQuery<Vehicle[]>(isFamily ? null : '/api/transport/vehicles');
  if (isFamily) return <FamilyTransport />;
  const soon = (vehicles ?? []).filter((v) => [v.insuranceExpiry, v.fitnessExpiry, v.pucExpiry, v.permitExpiry].some((d) => d && new Date(d).getTime() - Date.now() < 30 * 86_400_000));
  return (
    <>
      <PageHeader title="Transport" description="Vehicles, routes, stops and student allocation." icon={Bus} />
      {soon.length > 0 && (
        <div className="mb-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {soon.length} vehicle(s) have insurance, fitness, PUC or permit expiring within 30 days or already expired: {soon.map((v) => v.registrationNo).join(', ')}. Under school bus safety norms these must be renewed before the vehicle carries students.
          </span>
        </div>
      )}
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'students', label: <><Users className="size-4" /> Students</> }, { value: 'live', label: <><Radio className="size-4" /> Live map</> }, { value: 'routes', label: <><MapPin className="size-4" /> Routes & stops</> }, { value: 'vehicles', label: <><Bus className="size-4" /> Vehicles</> }]}>
        <TabPanel value="students">
          <Allocations />
        </TabPanel>
        <TabPanel value="live">
          <LiveBoard />
        </TabPanel>
        <TabPanel value="routes">
          <Routes />
        </TabPanel>
        <TabPanel value="vehicles">
          <Vehicles />
        </TabPanel>
      </Tabs>
    </>
  );
}

