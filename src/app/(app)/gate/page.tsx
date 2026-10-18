'use client';

import * as React from 'react';
import { DoorOpen, LogOut, Printer, ShieldCheck, UserPlus, Users, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { downloadCsv, formatDateTime, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog, type FieldDef } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, StatCard, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Segmented } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface Visitor {
  id: string;
  passNo: string;
  name: string;
  phone: string;
  purpose: string;
  whomToMeet: string | null;
  personCount: number;
  idProof: string | null;
  vehicleNo: string | null;
  notes: string | null;
  inAt: string;
  outAt: string | null;
}
interface GatePass {
  id: string;
  passNo: string;
  studentName: string;
  classLabel: string;
  reason: string;
  pickedUpBy: string;
  relation: string;
  pickerPhone: string | null;
  status: 'ISSUED' | 'LEFT' | 'CANCELLED';
  issuedByName: string;
  issuedAt: string;
  outAt: string | null;
}

const PURPOSES = [
  { value: 'PARENT', label: 'Parent visit' },
  { value: 'MEETING', label: 'Meeting staff' },
  { value: 'ADMISSION', label: 'Admission enquiry' },
  { value: 'INTERVIEW', label: 'Interview' },
  { value: 'DELIVERY', label: 'Delivery / courier' },
  { value: 'VENDOR', label: 'Vendor / contractor' },
  { value: 'OTHER', label: 'Other' },
];
const PURPOSE_LABEL = Object.fromEntries(PURPOSES.map((p) => [p.value, p.label]));
const time = (v: string | null) => (v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—');

export default function GatePage() {
  const [tab, setTab] = React.useState('visitors');
  const [date, setDate] = React.useState(todayISO());
  const { data: visitors } = useApiQuery<Visitor[]>('/api/gate/visitors', { date });
  const { data: inside } = useApiQuery<Visitor[]>('/api/gate/visitors', { inside: '1' });
  const { data: passes } = useApiQuery<GatePass[]>('/api/gate/passes', { date });
  return (
    <>
      <PageHeader title="Gate & Visitors" description="Visitor register with printable passes, and early-leave gate passes for students." icon={DoorOpen} actions={<Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value || todayISO())} className="h-9 w-40" aria-label="Day" />} />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Visitors on the day" value={visitors?.length ?? 0} icon={Users} />
        <StatCard label="On campus now" value={inside?.length ?? 0} icon={DoorOpen} tone={(inside?.length ?? 0) > 0 ? 'amber' : 'emerald'} />
        <StatCard label="Gate passes" value={passes?.length ?? 0} icon={ShieldCheck} tone="sky" />
      </div>
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'visitors', label: <><Users className="size-4" /> Visitors</>, count: visitors?.length },
          { value: 'passes', label: <><ShieldCheck className="size-4" /> Student gate passes</>, count: passes?.length },
        ]}
      >
        <TabPanel value="visitors">
          <VisitorsTab date={date} />
        </TabPanel>
        <TabPanel value="passes">
          <PassesTab date={date} />
        </TabPanel>
      </Tabs>
    </>
  );
}

function VisitorsTab({ date }: { date: string }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const [view, setView] = React.useState<'day' | 'inside'>('day');
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useApiQuery<Visitor[]>('/api/gate/visitors', view === 'inside' ? { inside: '1' } : { date });
  const fields: FieldDef[] = [
    { name: 'name', label: 'Visitor name', required: true },
    { name: 'phone', label: 'Mobile', type: 'tel', required: true },
    { name: 'purpose', label: 'Purpose', type: 'select', required: true, options: PURPOSES },
    { name: 'whomToMeet', label: 'Whom to meet', placeholder: 'Principal, class teacher of 5-A…' },
    { name: 'personCount', label: 'Number of people', type: 'number', min: 1, max: 50 },
    { name: 'vehicleNo', label: 'Vehicle no.', placeholder: 'JH01AB1234' },
    { name: 'idProof', label: 'ID shown', placeholder: 'Aadhaar 1234 (last 4 digits only)', hint: 'Never write the full ID number.' },
    { name: 'notes', label: 'Notes', span: 2 },
  ];
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Segmented size="sm" value={view} onChange={setView} options={[{ value: 'day', label: 'Register' }, { value: 'inside', label: 'Still inside' }]} />
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="secondary" disabled={!data?.length} onClick={() => downloadCsv(`visitors-${date}`, (data ?? []).map((v) => ({ Pass: v.passNo, Name: v.name, Mobile: v.phone, Purpose: PURPOSE_LABEL[v.purpose], 'To meet': v.whomToMeet ?? '', People: v.personCount, In: formatDateTime(v.inAt), Out: v.outAt ? formatDateTime(v.outAt) : '' })))}>
            Export
          </Button>
          {can('gate', 'create') && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <UserPlus /> New visitor
            </Button>
          )}
        </div>
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState icon={Users} title={view === 'inside' ? 'Nobody on campus' : 'No visitors recorded'} description="Record each visitor at the gate; print a pass to wear inside." />
      ) : (
        <DataTable<Visitor>
          data={data}
          columns={[
            { accessorKey: 'passNo', header: 'Pass', cell: ({ row }) => <span className="font-mono text-xs">{row.original.passNo}</span> },
            { accessorKey: 'name', header: 'Visitor', cell: ({ row }) => <div><p className="font-medium">{row.original.name}{row.original.personCount > 1 ? ` +${row.original.personCount - 1}` : ''}</p><p className="text-xs text-ink-faint">{row.original.phone}</p></div> },
            { accessorKey: 'purpose', header: 'Purpose', cell: ({ row }) => <div><p>{PURPOSE_LABEL[row.original.purpose]}</p>{row.original.whomToMeet && <p className="text-xs text-ink-faint">To meet {row.original.whomToMeet}</p>}</div> },
            { accessorKey: 'inAt', header: 'In', cell: ({ row }) => time(row.original.inAt) },
            { accessorKey: 'outAt', header: 'Out', cell: ({ row }) => (row.original.outAt ? time(row.original.outAt) : <Badge tone="warning" dot>Inside</Badge>) },
            {
              id: 'a',
              header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/print/gate/visitor/${row.original.id}`, '_blank')}>
                    <Printer /> Pass
                  </Button>
                  {!row.original.outAt && can('gate', 'edit') && (
                    <Button
                      size="sm"
                      variant="soft"
                      onClick={async () => {
                        try {
                          await api(`/api/gate/visitors/${row.original.id}`, { method: 'PATCH', body: {} });
                          toast.success(`${row.original.name} checked out`);
                          invalidate(['/api/gate']);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <LogOut /> Check out
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New visitor"
        description="A pass number is issued; print it for the visitor to wear."
        fields={fields}
        initial={{ purpose: 'PARENT', personCount: 1 }}
        submitLabel="Check in"
        onSubmit={async (payload) => {
          const v = await api<Visitor>('/api/gate/visitors', { method: 'POST', body: payload });
          toast.success(`Pass ${v.passNo} issued`, { action: { label: 'Print', onClick: () => window.open(`/print/gate/visitor/${v.id}`, '_blank') } });
          invalidate(['/api/gate']);
        }}
      />
    </Card>
  );
}

function PassesTab({ date }: { date: string }) {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useApiQuery<GatePass[]>('/api/gate/passes', { date });
  const act = async (p: GatePass, action: 'left' | 'cancel') => {
    if (action === 'cancel' && !(await confirm({ title: `Cancel pass ${p.passNo}?`, confirmLabel: 'Cancel pass' }))) return;
    try {
      await api(`/api/gate/passes/${p.id}`, { method: 'PATCH', body: { action } });
      toast.success(action === 'left' ? `${p.studentName} marked as left` : 'Pass cancelled');
      invalidate(['/api/gate']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Card>
      <div className="flex items-center justify-between border-b border-line p-3">
        <p className="text-sm text-ink-soft">Parents are told when a pass is issued and when the child leaves.</p>
        {can('gate', 'create') && (
          <Button size="sm" onClick={() => setOpen(true)}>
            <ShieldCheck /> Issue gate pass
          </Button>
        )}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState icon={ShieldCheck} title="No gate passes" description="Issue a pass when a parent or authorised person collects a student during school hours." />
      ) : (
        <DataTable<GatePass>
          data={data}
          columns={[
            { accessorKey: 'passNo', header: 'Pass', cell: ({ row }) => <span className="font-mono text-xs">{row.original.passNo}</span> },
            { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.classLabel}</p></div> },
            { accessorKey: 'pickedUpBy', header: 'Collected by', cell: ({ row }) => <div><p>{row.original.pickedUpBy} <span className="text-ink-faint">({row.original.relation})</span></p><p className="text-xs text-ink-faint">{row.original.pickerPhone ?? ''}</p></div> },
            { accessorKey: 'reason', header: 'Reason' },
            { accessorKey: 'issuedAt', header: 'Issued', cell: ({ row }) => <div><p>{time(row.original.issuedAt)}</p><p className="text-xs text-ink-faint">by {row.original.issuedByName}</p></div> },
            { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'LEFT' ? 'COMPLETED' : row.original.status === 'ISSUED' ? 'PENDING' : 'CANCELLED'} label={row.original.status === 'LEFT' ? `Left ${time(row.original.outAt)}` : row.original.status === 'ISSUED' ? 'Waiting at gate' : 'Cancelled'} /> },
            {
              id: 'a',
              header: '',
              cell: ({ row }) => (
                <div className="flex justify-end gap-1">
                  <Button size="sm" variant="ghost" aria-label="Print pass" onClick={() => window.open(`/print/gate/pass/${row.original.id}`, '_blank')}>
                    <Printer />
                  </Button>
                  {row.original.status === 'ISSUED' && can('gate', 'edit') && (
                    <>
                      <Button size="sm" variant="soft" onClick={() => act(row.original, 'left')}>
                        <LogOut /> Left
                      </Button>
                      <Button size="sm" variant="ghost" aria-label="Cancel pass" onClick={() => act(row.original, 'cancel')}>
                        <XCircle />
                      </Button>
                    </>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}
      <IssuePassDialog open={open} onOpenChange={setOpen} onDone={() => invalidate(['/api/gate'])} />
    </Card>
  );
}

function IssuePassDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [v, setV] = React.useState({ reason: '', pickedUpBy: '', relation: 'Father', pickerPhone: '' });
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setStudent(null);
      setV({ reason: '', pickedUpBy: '', relation: 'Father', pickerPhone: '' });
    }
  }, [open]);
  React.useEffect(() => {
    if (student?.guardian) setV((s) => ({ ...s, pickedUpBy: s.pickedUpBy || student.guardian?.fatherName || '', pickerPhone: s.pickerPhone || student.guardian?.primaryPhone || '' }));
  }, [student]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Issue gate pass"
      description="The parent is notified immediately; the guard marks the student as left at the gate."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!student || v.reason.trim().length < 3 || v.pickedUpBy.trim().length < 2 || v.relation.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                const p = await api<{ id: string; passNo: string }>('/api/gate/passes', { method: 'POST', body: { studentId: student!.id, ...v, pickerPhone: v.pickerPhone || null } });
                toast.success(`Gate pass ${p.passNo} issued`, { action: { label: 'Print', onClick: () => window.open(`/print/gate/pass/${p.id}`, '_blank') } });
                onDone();
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Issue pass
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Student" required>
          <StudentPicker value={student} onChange={setStudent} />
        </Field>
        <Field label="Reason" required>
          <Input value={v.reason} onChange={(e) => setV({ ...v, reason: e.target.value })} placeholder="Doctor's appointment" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Collected by" required className="sm:col-span-2">
            <Input value={v.pickedUpBy} onChange={(e) => setV({ ...v, pickedUpBy: e.target.value })} />
          </Field>
          <Field label="Relation" required>
            <Input value={v.relation} onChange={(e) => setV({ ...v, relation: e.target.value })} />
          </Field>
        </div>
        <Field label="Their mobile">
          <Input type="tel" value={v.pickerPhone} onChange={(e) => setV({ ...v, pickerPhone: e.target.value })} />
        </Field>
      </div>
    </Dialog>
  );
}
