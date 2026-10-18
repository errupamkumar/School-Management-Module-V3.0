'use client';

import * as React from 'react';
import { BriefcaseBusiness, Building2, MapPin, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { downloadCsv, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Drive {
  id: string;
  company: string;
  role: string;
  description: string | null;
  location: string | null;
  packageInfo: string | null;
  driveDate: string | null;
  applyBy: string | null;
  eligibleClassIds: string[] | null;
  status: 'OPEN' | 'CLOSED' | 'COMPLETED';
  _count?: { applications: number };
  selected?: number;
  myApplications?: Array<{ id: string; status: string; note: string | null }>;
}
interface Applicant {
  id: string;
  studentName: string;
  classLabel: string;
  status: string;
  note: string | null;
  createdAt: string;
  student: { admissionNo: string; guardian: { primaryPhone: string } | null };
}

const APP_STATUS = [
  { value: 'APPLIED', label: 'Applied' },
  { value: 'SHORTLISTED', label: 'Shortlisted' },
  { value: 'SELECTED', label: 'Selected' },
  { value: 'REJECTED', label: 'Not selected' },
];

export default function PlacementsPage() {
  const { isFamily } = useApp();
  return isFamily ? <StudentPlacements /> : <StaffPlacements />;
}

function DriveMeta({ d }: { d: Drive }) {
  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-faint">
      {d.location && <span><MapPin className="inline size-3" /> {d.location}</span>}
      {d.packageInfo && <span>💼 {d.packageInfo}</span>}
      {d.driveDate && <span>Drive {formatDate(d.driveDate)}</span>}
      {d.applyBy && <span>Apply by {formatDate(d.applyBy)}</span>}
    </p>
  );
}

function StaffPlacements() {
  const { can } = useApp();
  const [creating, setCreating] = React.useState(false);
  const [open, setOpen] = React.useState<Drive | null>(null);
  const { data, isLoading } = useApiQuery<Drive[]>('/api/placements');
  return (
    <>
      <PageHeader
        title="Placements"
        description="Company drives, eligibility, applications and selections."
        icon={BriefcaseBusiness}
        actions={
          can('placements', 'create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New drive
            </Button>
          )
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Building2} title="No placement drives" description="Add a company visit or internship drive; eligible students can apply from their app." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((d) => (
            <Card key={d.id}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                    <Building2 className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{d.company}</p>
                    <p className="text-sm text-ink-soft">{d.role}</p>
                    <DriveMeta d={d} />
                  </div>
                  <StatusBadge status={d.status === 'OPEN' ? 'OPEN' : d.status === 'COMPLETED' ? 'COMPLETED' : 'INACTIVE'} label={d.status === 'OPEN' ? 'Open' : d.status === 'COMPLETED' ? 'Completed' : 'Closed'} />
                </div>
                <div className="mt-4 flex items-center gap-3 text-sm">
                  <span>
                    <Users className="inline size-4 text-ink-faint" /> {d._count?.applications ?? 0} applied
                  </span>
                  <span className="text-emerald-600">{d.selected ?? 0} selected</span>
                  <Button size="sm" variant="secondary" className="ml-auto" onClick={() => setOpen(d)}>
                    Applicants
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
      <DriveDialog open={creating} onOpenChange={setCreating} />
      <Applicants drive={open} onClose={() => setOpen(null)} />
    </>
  );
}

function DriveDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [v, setV] = React.useState({ company: '', role: '', description: '', location: '', packageInfo: '', driveDate: '', applyBy: '' });
  const [classes, setClasses] = React.useState<string[]>([]);
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setV({ company: '', role: '', description: '', location: '', packageInfo: '', driveDate: '', applyBy: '' });
      setClasses([]);
    }
  }, [open]);
  const set = (k: string, val: string) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New placement drive"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={v.company.trim().length < 2 || v.role.trim().length < 2}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/placements', { method: 'POST', body: { ...Object.fromEntries(Object.entries(v).map(([k, x]) => [k, x || null])), company: v.company, role: v.role, eligibleClassIds: classes, notify } });
                toast.success('Drive published');
                invalidate(['/api/placements']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Publish drive
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company" required>
          <Input value={v.company} onChange={(e) => set('company', e.target.value)} />
        </Field>
        <Field label="Role / programme" required>
          <Input value={v.role} onChange={(e) => set('role', e.target.value)} placeholder="Summer internship — data entry" />
        </Field>
        <Field label="Location">
          <Input value={v.location} onChange={(e) => set('location', e.target.value)} />
        </Field>
        <Field label="Stipend / package">
          <Input value={v.packageInfo} onChange={(e) => set('packageInfo', e.target.value)} placeholder="₹8,000 / month" />
        </Field>
        <Field label="Drive date">
          <Input type="date" value={v.driveDate} onChange={(e) => set('driveDate', e.target.value)} />
        </Field>
        <Field label="Apply by">
          <Input type="date" value={v.applyBy} onChange={(e) => set('applyBy', e.target.value)} />
        </Field>
        <Field label="Details" className="sm:col-span-2">
          <Textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label={`Eligible classes (${classes.length ? classes.length : 'all'})`} className="sm:col-span-2">
          <div className="grid max-h-32 grid-cols-3 gap-1.5 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-5">
            {(lk?.classes ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-1.5 text-xs">
                <Checkbox checked={classes.includes(c.id)} onCheckedChange={(on) => setClasses((l) => (on ? [...l, c.id] : l.filter((x) => x !== c.id)))} /> {c.label}
              </label>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-3 text-sm sm:col-span-2">
          <Switch checked={notify} onCheckedChange={setNotify} /> Notify eligible students and parents
        </label>
      </div>
    </Dialog>
  );
}

function Applicants({ drive, onClose }: { drive: Drive | null; onClose: () => void }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Drive & { applications: Applicant[] }>(drive ? `/api/placements/${drive.id}` : null);
  if (!drive) return null;
  const setStatus = async (a: Applicant, status: string) => {
    try {
      await api(`/api/placements/${drive.id}`, { method: 'PATCH', body: { applicationId: a.id, status } });
      invalidate(['/api/placements']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const setDriveStatus = async (status: string) => {
    await api(`/api/placements/${drive.id}`, { method: 'PUT', body: { status } });
    invalidate(['/api/placements']);
    onClose();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${drive.company} · ${drive.role}`}
      size="xl"
      footer={
        <>
          {can('placements', 'edit') && drive.status === 'OPEN' && (
            <Button variant="secondary" onClick={() => setDriveStatus('CLOSED')}>
              Close applications
            </Button>
          )}
          {can('placements', 'edit') && drive.status !== 'COMPLETED' && (
            <Button variant="secondary" onClick={() => setDriveStatus('COMPLETED')}>
              Mark completed
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!data?.applications.length}
            onClick={() => downloadCsv(`placement-${drive.company}`, (data?.applications ?? []).map((a) => ({ Student: a.studentName, 'Adm. no.': a.student.admissionNo, Class: a.classLabel, Status: a.status, Note: a.note ?? '', Applied: a.createdAt.slice(0, 10), 'Parent mobile': a.student.guardian?.primaryPhone ?? '' })))}
          >
            Export
          </Button>
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {isLoading || !data ? (
        <LoadingBlock />
      ) : !data.applications.length ? (
        <EmptyState icon={Users} title="No applications yet" />
      ) : (
        <DataTable<Applicant>
          data={data.applications}
          columns={[
            { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.student.admissionNo} · {row.original.classLabel}</p></div> },
            { accessorKey: 'note', header: 'Note', cell: ({ row }) => <span className="text-xs">{row.original.note ?? ''}</span> },
            { accessorKey: 'createdAt', header: 'Applied', cell: ({ getValue }) => formatDate(getValue()) },
            {
              accessorKey: 'status',
              header: 'Status',
              cell: ({ row }) =>
                row.original.status === 'WITHDRAWN' ? (
                  <Badge>Withdrawn</Badge>
                ) : can('placements', 'edit') ? (
                  <Select className="h-8 w-36" value={row.original.status} onChange={(e) => setStatus(row.original, e.target.value)} options={APP_STATUS} />
                ) : (
                  <StatusBadge status={row.original.status} />
                ),
            },
          ]}
        />
      )}
    </Dialog>
  );
}

function StudentPlacements() {
  const { role } = useApp();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Drive[]>('/api/placements');
  const act = async (d: Drive, withdraw: boolean) => {
    try {
      await api(`/api/placements/${d.id}`, { method: 'POST', body: { withdraw } });
      toast.success(withdraw ? 'Application withdrawn' : `Applied to ${d.company}`);
      invalidate(['/api/placements']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <PageHeader title="Placements" description="Internships and placement drives open to you." icon={BriefcaseBusiness} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Building2} title="No drives right now" description="When the placement cell announces a drive for your class, it appears here." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((d) => {
            const app = d.myApplications?.[0];
            const applied = app && app.status !== 'WITHDRAWN';
            return (
              <Card key={d.id}>
                <CardBody>
                  <p className="font-semibold">{d.company}</p>
                  <p className="text-sm text-ink-soft">{d.role}</p>
                  <DriveMeta d={d} />
                  {d.description && <p className="mt-3 whitespace-pre-wrap text-sm text-ink-soft">{d.description}</p>}
                  <div className="mt-4 flex items-center gap-2">
                    {app && <StatusBadge status={app.status} label={APP_STATUS.find((s) => s.value === app.status)?.label ?? 'Withdrawn'} />}
                    {role === 'STUDENT' && d.status === 'OPEN' && (
                      <div className="ml-auto">
                        {applied ? (
                          app.status === 'APPLIED' && (
                            <Button size="sm" variant="ghost" onClick={() => act(d, true)}>
                              Withdraw
                            </Button>
                          )
                        ) : (
                          <Button size="sm" onClick={() => act(d, false)}>
                            Apply
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
