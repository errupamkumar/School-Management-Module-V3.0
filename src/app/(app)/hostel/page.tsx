'use client';

import * as React from 'react';
import { BedDouble, Building2, DoorOpen, LogOut, MoveRight, Phone, Plus, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, downloadCsv, formatDate, formatINR, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog, type FieldDef } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, KeyValue, LoadingBlock, PageHeader, StatCard } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { useLookups } from '@/lib/lookups';

interface Room {
  id: string;
  hostelId: string;
  roomNo: string;
  floor: string | null;
  roomType: string | null;
  capacity: number;
  monthlyFee: number;
  isActive: boolean;
  hostel?: { name: string };
  _count: { allocations: number };
}
interface Hostel {
  id: string;
  name: string;
  kind: 'BOYS' | 'GIRLS' | 'MIXED';
  wardenId: string | null;
  address: string | null;
  phone: string | null;
  isActive: boolean;
  rooms: Room[];
}
interface Allocation {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  bedNo: string | null;
  fromDate: string;
  toDate: string | null;
  status: 'ACTIVE' | 'VACATED';
  room: { id: string; roomNo: string; floor: string | null; monthlyFee: number; hostel: { id: string; name: string } };
  student: { admissionNo: string; gender: string; guardian: { primaryPhone: string } | null };
}

const KIND_LABEL = { BOYS: 'Boys', GIRLS: 'Girls', MIXED: 'Co-ed' } as const;

export default function HostelPage() {
  const { isFamily } = useApp();
  return isFamily ? <FamilyHostel /> : <StaffHostel />;
}

function StaffHostel() {
  const [tab, setTab] = React.useState('rooms');
  const { data: hostels, isLoading } = useApiQuery<Hostel[]>('/api/hostels');
  const beds = (hostels ?? []).flatMap((h) => h.rooms).reduce((a, r) => a + r.capacity, 0);
  const used = (hostels ?? []).flatMap((h) => h.rooms).reduce((a, r) => a + r._count.allocations, 0);
  return (
    <>
      <PageHeader title="Hostel" description="Hostels, rooms and beds, resident students and hostel fees." icon={BedDouble} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Hostels" value={hostels?.length ?? 0} icon={Building2} />
        <StatCard label="Beds occupied" value={`${used} / ${beds}`} icon={BedDouble} tone="emerald" />
        <StatCard label="Beds free" value={Math.max(0, beds - used)} icon={DoorOpen} tone={beds - used > 0 ? 'sky' : 'amber'} />
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'rooms', label: <><Building2 className="size-4" /> Hostels &amp; rooms</> },
          { value: 'residents', label: <><Users className="size-4" /> Residents</>, count: used },
        ]}
      >
        <TabPanel value="rooms">{isLoading ? <LoadingBlock /> : <RoomsTab hostels={hostels ?? []} />}</TabPanel>
        <TabPanel value="residents">
          <ResidentsTab hostels={hostels ?? []} />
        </TabPanel>
      </Tabs>
    </>
  );
}

function RoomsTab({ hostels }: { hostels: Hostel[] }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['employees']);
  const [hostelDialog, setHostelDialog] = React.useState<{ open: boolean; row?: Hostel }>({ open: false });
  const [roomDialog, setRoomDialog] = React.useState<{ open: boolean; row?: Room; hostelId?: string }>({ open: false });

  const hostelFields: FieldDef[] = [
    { name: 'name', label: 'Hostel name', required: true, span: 2, placeholder: 'Tagore Boys Hostel' },
    { name: 'kind', label: 'For', type: 'select', required: true, options: [{ value: 'BOYS', label: 'Boys' }, { value: 'GIRLS', label: 'Girls' }, { value: 'MIXED', label: 'Co-ed' }] },
    { name: 'wardenId', label: 'Warden', type: 'select', options: [{ value: '', label: 'Not assigned' }, ...((lk?.employees ?? []) as Array<{ id: string; name: string; designation: string }>).map((e) => ({ value: e.id, label: `${e.name} · ${e.designation}` }))] },
    { name: 'phone', label: 'Hostel phone', type: 'tel' },
    { name: 'address', label: 'Address / block', span: 2 },
  ];
  const roomFields: FieldDef[] = [
    { name: 'hostelId', label: 'Hostel', type: 'select', required: true, options: hostels.map((h) => ({ value: h.id, label: h.name })) },
    { name: 'roomNo', label: 'Room number', required: true, placeholder: '101' },
    { name: 'floor', label: 'Floor', placeholder: 'Ground' },
    { name: 'roomType', label: 'Room type', placeholder: '3-seater, attached bath' },
    { name: 'capacity', label: 'Beds', type: 'number', required: true, min: 1, max: 50 },
    { name: 'monthlyFee', label: 'Monthly fee (added to invoices)', type: 'money' },
  ];

  const saveHostel = async (payload: Record<string, unknown>) => {
    await api(hostelDialog.row ? `/api/hostels/${hostelDialog.row.id}` : '/api/hostels', { method: hostelDialog.row ? 'PUT' : 'POST', body: payload });
    toast.success(hostelDialog.row ? 'Hostel updated' : 'Hostel added');
    invalidate(['/api/hostels']);
  };
  const saveRoom = async (payload: Record<string, unknown>) => {
    await api(roomDialog.row ? `/api/hostel-rooms/${roomDialog.row.id}` : '/api/hostel-rooms', { method: roomDialog.row ? 'PUT' : 'POST', body: payload });
    toast.success(roomDialog.row ? 'Room updated' : 'Room added');
    invalidate(['/api/hostels', '/api/hostel-rooms']);
  };

  return (
    <div className="space-y-6">
      {can('hostel', 'create') && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={() => setRoomDialog({ open: true })} disabled={!hostels.length}>
            <DoorOpen /> Add room
          </Button>
          <Button onClick={() => setHostelDialog({ open: true })}>
            <Plus /> Add hostel
          </Button>
        </div>
      )}
      {!hostels.length ? (
        <Card>
          <EmptyState icon={Building2} title="No hostels yet" description="Add a hostel, then its rooms with the number of beds and monthly fee." />
        </Card>
      ) : (
        hostels.map((h) => {
          const cap = h.rooms.reduce((a, r) => a + r.capacity, 0);
          const occ = h.rooms.reduce((a, r) => a + r._count.allocations, 0);
          return (
            <Card key={h.id}>
              <CardHeader
                title={h.name}
                description={`${KIND_LABEL[h.kind]} · ${h.rooms.length} rooms · ${occ}/${cap} beds occupied${h.address ? ` · ${h.address}` : ''}`}
                icon={Building2}
                actions={
                  can('hostel', 'edit') ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => setRoomDialog({ open: true, hostelId: h.id })}>
                        <Plus /> Room
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setHostelDialog({ open: true, row: h })}>
                        Edit
                      </Button>
                    </div>
                  ) : undefined
                }
              />
              <CardBody>
                {!h.rooms.length ? (
                  <p className="text-sm text-ink-soft">No rooms yet.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
                    {h.rooms.map((r) => {
                      const full = r._count.allocations >= r.capacity;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => can('hostel', 'edit') && setRoomDialog({ open: true, row: r })}
                          className={cn('rounded-xl border p-3 text-left transition-colors hover:border-brand-300', full ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-500/5' : 'border-line')}
                        >
                          <p className="flex items-center justify-between text-sm font-semibold">
                            Room {r.roomNo}
                            <Badge tone={full ? 'warning' : 'success'}>{full ? 'Full' : `${r.capacity - r._count.allocations} free`}</Badge>
                          </p>
                          <p className="mt-0.5 text-xs text-ink-faint">{[r.floor, r.roomType].filter(Boolean).join(' · ') || '—'}</p>
                          <div className="mt-2 flex gap-1" aria-label={`${r._count.allocations} of ${r.capacity} beds occupied`}>
                            {Array.from({ length: r.capacity }, (_, i) => (
                              <span key={i} className={cn('h-2 flex-1 rounded-full', i < r._count.allocations ? 'bg-brand-500' : 'bg-line')} />
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-ink-soft">{Number(r.monthlyFee) > 0 ? `${formatINR(Number(r.monthlyFee), true)} / month` : 'No fee'}</p>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>
          );
        })
      )}
      <FormDialog
        open={hostelDialog.open}
        onOpenChange={(o) => setHostelDialog({ open: o })}
        title={hostelDialog.row ? `Edit ${hostelDialog.row.name}` : 'Add hostel'}
        fields={hostelFields}
        initial={hostelDialog.row ? { ...hostelDialog.row, wardenId: hostelDialog.row.wardenId ?? '' } : { kind: 'BOYS', wardenId: '' }}
        editing={!!hostelDialog.row}
        onSubmit={saveHostel}
      />
      <FormDialog
        open={roomDialog.open}
        onOpenChange={(o) => setRoomDialog({ open: o })}
        title={roomDialog.row ? `Room ${roomDialog.row.roomNo}` : 'Add room'}
        fields={roomFields}
        initial={roomDialog.row ? { ...roomDialog.row, monthlyFee: Number(roomDialog.row.monthlyFee) } : { hostelId: roomDialog.hostelId ?? hostels[0]?.id, capacity: 3, monthlyFee: 0 }}
        editing={!!roomDialog.row}
        onSubmit={saveRoom}
      />
    </div>
  );
}

function ResidentsTab({ hostels }: { hostels: Hostel[] }) {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [hostelId, setHostelId] = React.useState('');
  const [status, setStatus] = React.useState<'ACTIVE' | 'VACATED' | 'ALL'>('ACTIVE');
  const { data, isLoading } = useApiQuery<Allocation[]>('/api/hostel/allocations', { hostelId: hostelId || undefined, status });
  const [allocOpen, setAllocOpen] = React.useState(false);
  const [moving, setMoving] = React.useState<Allocation | null>(null);
  const refresh = () => invalidate(['/api/hostel/allocations', '/api/hostels']);

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <Field label="Hostel" className="w-56">
          <Select value={hostelId} onChange={(e) => setHostelId(e.target.value)} options={[{ value: '', label: 'All hostels' }, ...hostels.map((h) => ({ value: h.id, label: h.name }))]} />
        </Field>
        <Field label="Status" className="w-40">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} options={[{ value: 'ACTIVE', label: 'Living now' }, { value: 'VACATED', label: 'Left' }, { value: 'ALL', label: 'All' }]} />
        </Field>
        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            onClick={() =>
              downloadCsv(
                'hostel-residents',
                (data ?? []).map((a) => ({ Student: a.studentName, 'Adm. no.': a.student.admissionNo, Class: a.classLabel, Hostel: a.room.hostel.name, Room: a.room.roomNo, Bed: a.bedNo ?? '', From: a.fromDate.slice(0, 10), To: a.toDate?.slice(0, 10) ?? '', 'Parent mobile': a.student.guardian?.primaryPhone ?? '' }))
              )
            }
          >
            Export
          </Button>
          {can('hostel', 'create') && (
            <Button onClick={() => setAllocOpen(true)} disabled={!hostels.length}>
              <UserPlus /> Allot room
            </Button>
          )}
        </div>
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState icon={Users} title={status === 'ACTIVE' ? 'No residents yet' : 'Nothing to show'} description="Allot rooms to students from the button above." />
      ) : (
        <DataTable<Allocation>
          data={data}
          columns={[
            { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.student.admissionNo} · {row.original.classLabel}</p></div> },
            { id: 'room', header: 'Room', cell: ({ row }) => `${row.original.room.hostel.name} · ${row.original.room.roomNo}${row.original.bedNo ? ` · bed ${row.original.bedNo}` : ''}` },
            { accessorKey: 'fromDate', header: 'Since', cell: ({ getValue }) => formatDate(getValue()) },
            { id: 'fee', header: 'Monthly fee', cell: ({ row }) => formatINR(Number(row.original.room.monthlyFee), true) },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => (row.original.status === 'ACTIVE' ? <Badge tone="success">Living</Badge> : <Badge>Left {formatDate(row.original.toDate)}</Badge>) },
            {
              id: 'actions',
              header: '',
              cell: ({ row }) =>
                row.original.status === 'ACTIVE' && can('hostel', 'edit') ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setMoving(row.original)}>
                      <MoveRight /> Move
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        if (!(await confirm({ title: `Vacate ${row.original.studentName}?`, description: 'The bed is freed today and the hostel fee stops from the next invoice.', confirmLabel: 'Vacate' }))) return;
                        try {
                          await api(`/api/hostel/allocations/${row.original.id}`, { method: 'PATCH', body: { action: 'vacate', toDate: todayISO() } });
                          toast.success('Room vacated');
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <LogOut /> Vacate
                    </Button>
                  </div>
                ) : null,
            },
          ]}
        />
      )}
      <AllotDialog open={allocOpen} onOpenChange={setAllocOpen} hostels={hostels} onDone={refresh} />
      <MoveDialog allocation={moving} onClose={() => setMoving(null)} hostels={hostels} onDone={refresh} />
    </Card>
  );
}

function freeRoomOptions(hostels: Hostel[], exceptRoomId?: string) {
  return hostels.flatMap((h) =>
    h.rooms.filter((r) => r.id !== exceptRoomId && r._count.allocations < r.capacity).map((r) => ({ value: r.id, label: `${h.name} · Room ${r.roomNo} (${r.capacity - r._count.allocations} free${Number(r.monthlyFee) ? `, ${formatINR(Number(r.monthlyFee), true)}/mo` : ''})` }))
  );
}

function AllotDialog({ open, onOpenChange, hostels, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; hostels: Hostel[]; onDone: () => void }) {
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [roomId, setRoomId] = React.useState('');
  const [bedNo, setBedNo] = React.useState('');
  const [fromDate, setFromDate] = React.useState(todayISO());
  const [saving, setSaving] = React.useState(false);
  const options = freeRoomOptions(hostels);
  React.useEffect(() => {
    if (open) {
      setStudent(null);
      setRoomId(options[0]?.value ?? '');
      setBedNo('');
      setFromDate(todayISO());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Allot a room" description="The room's monthly fee is added to the student's invoices from the next run.">
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!student || !roomId) return;
          setSaving(true);
          try {
            await api('/api/hostel/allocations', { method: 'POST', body: { studentId: student.id, roomId, bedNo: bedNo || null, fromDate } });
            toast.success(`${student.name} allotted a room`);
            onDone();
            onOpenChange(false);
          } catch (err) {
            toast.error((err as Error).message);
          } finally {
            setSaving(false);
          }
        }}
      >
        <Field label="Student" required>
          <StudentPicker value={student} onChange={setStudent} />
        </Field>
        <Field label="Room" required>
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} options={options.length ? options : [{ value: '', label: 'No free beds' }]} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bed (optional)">
            <Input value={bedNo} onChange={(e) => setBedNo(e.target.value)} placeholder="B" maxLength={10} />
          </Field>
          <Field label="From" required>
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!student || !roomId}>
            Allot room
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

function MoveDialog({ allocation, onClose, hostels, onDone }: { allocation: Allocation | null; onClose: () => void; hostels: Hostel[]; onDone: () => void }) {
  const [roomId, setRoomId] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const options = allocation ? freeRoomOptions(hostels, allocation.room.id) : [];
  React.useEffect(() => {
    if (allocation) setRoomId(options[0]?.value ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allocation]);
  return (
    <Dialog open={!!allocation} onOpenChange={(o) => !o && onClose()} title={allocation ? `Move ${allocation.studentName}` : ''} description={allocation ? `Currently ${allocation.room.hostel.name}, room ${allocation.room.roomNo}.` : ''}>
      <div className="space-y-4">
        <Field label="New room">
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} options={options.length ? options : [{ value: '', label: 'No other free beds' }]} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            disabled={!roomId}
            onClick={async () => {
              if (!allocation) return;
              setSaving(true);
              try {
                await api(`/api/hostel/allocations/${allocation.id}`, { method: 'PATCH', body: { action: 'move', roomId, fromDate: todayISO() } });
                toast.success('Room changed');
                onDone();
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Move
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function FamilyHostel() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<null | {
    hostel: string;
    kind: keyof typeof KIND_LABEL;
    address: string | null;
    hostelPhone: string | null;
    roomNo: string;
    floor: string | null;
    roomType: string | null;
    bedNo: string | null;
    since: string;
    monthlyFee: number;
    warden: { name: string; phone: string | null } | null;
  }>(child ? '/api/hostel/mine' : null, { studentId: child?.id });
  return (
    <>
      <PageHeader title="Hostel" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={BedDouble} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data ? (
        <Card>
          <EmptyState icon={BedDouble} title="Not staying in the hostel" description="Contact the school office if you would like a hostel place." />
        </Card>
      ) : (
        <Card className="max-w-2xl">
          <CardHeader title={data.hostel} description={KIND_LABEL[data.kind]} icon={Building2} />
          <CardBody>
            <KeyValue
              items={[
                ['Room', data.roomNo],
                ['Bed', data.bedNo],
                ['Floor', data.floor],
                ['Room type', data.roomType],
                ['Staying since', formatDate(data.since)],
                ['Monthly fee', formatINR(Number(data.monthlyFee), true)],
                ['Address', data.address],
              ]}
            />
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {data.warden && (
                <a href={data.warden.phone ? `tel:${data.warden.phone}` : undefined} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-canvas">
                  <Phone className="size-4 text-brand-600" /> Warden: {data.warden.name}
                </a>
              )}
              {data.hostelPhone && (
                <a href={`tel:${data.hostelPhone}`} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-sm hover:bg-canvas">
                  <Phone className="size-4 text-brand-600" /> Hostel office: {data.hostelPhone}
                </a>
              )}
            </div>
          </CardBody>
        </Card>
      )}
    </>
  );
}
