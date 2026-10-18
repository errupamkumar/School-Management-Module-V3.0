'use client';

import * as React from 'react';
import { CheckCircle2, Contact, Link2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage, type FieldDef } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, LoadingBlock, StatusBadge } from '@/components/ui/display';
import { Checkbox, Select } from '@/components/ui/form';
import { Dialog, MenuItem } from '@/components/ui/overlay';

interface Alumnus {
  id: string;
  name: string;
  passingYear: number;
  lastClass: string | null;
  email: string | null;
  phone: string | null;
  currentStatus: string | null;
  organisation: string | null;
  designation: string | null;
  higherEducation: string | null;
  city: string | null;
  linkedinUrl: string | null;
  achievements: string | null;
  consentToContact: boolean;
  isMentor: boolean;
  status: 'PENDING' | 'APPROVED';
}

const STATUS = [
  { value: 'STUDYING', label: 'Studying' },
  { value: 'EMPLOYED', label: 'Working' },
  { value: 'SELF_EMPLOYED', label: 'Own business' },
  { value: 'OTHER', label: 'Other' },
];
const statusLabel = (v: string | null) => STATUS.find((s) => s.value === v)?.label ?? '—';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Name', required: true },
  { name: 'passingYear', label: 'Year left school', type: 'number', required: true, min: 1950, max: 2100 },
  { name: 'lastClass', label: 'Last class' },
  { name: 'currentStatus', label: 'Now', type: 'select', options: STATUS },
  { name: 'email', label: 'Email', type: 'email' },
  { name: 'phone', label: 'Mobile', type: 'tel' },
  { name: 'organisation', label: 'College / company' },
  { name: 'designation', label: 'Course / role' },
  { name: 'higherEducation', label: 'Higher education', span: 2 },
  { name: 'city', label: 'City' },
  { name: 'linkedinUrl', label: 'LinkedIn', type: 'url' },
  { name: 'achievements', label: 'Achievements', type: 'textarea' },
  { name: 'isMentor', label: 'Willing to mentor students', type: 'switch' },
  { name: 'consentToContact', label: 'Agreed to be contacted', type: 'switch' },
];

export default function AlumniPage() {
  const { can, me } = useApp();
  const invalidate = useInvalidate();
  const [status, setStatus] = React.useState('');
  const [importing, setImporting] = React.useState(false);
  const { data: pending } = useApiQuery<Alumnus[]>('/api/alumni', { status: 'PENDING' });
  return (
    <>
      <ResourcePage<Alumnus>
        title="Alumni"
        entityLabel="Alumnus"
        description="Former students: where they are now, mentors and contacts for reunions."
        icon={Contact}
        endpoint="/api/alumni"
        module="alumni"
        params={{ status: status || undefined }}
        fields={FIELDS}
        defaults={{ passingYear: new Date().getFullYear(), consentToContact: true, isMentor: false }}
        searchPlaceholder="Name, company, city…"
        filters={
          <>
            <Select className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'APPROVED', label: 'In directory' }, { value: 'PENDING', label: `Waiting approval (${pending?.length ?? 0})` }]} placeholder="All entries" />
          </>
        }
        headerActions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                const url = `${window.location.origin}/alumni-join/${me.school.code}`;
                void navigator.clipboard?.writeText(url);
                toast.success('Registration link copied', { description: `${url} — turn on self-registration in School Settings → Integrations & data.` });
              }}
            >
              <Link2 /> Registration link
            </Button>
            {can('alumni', 'create') && (
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <UserPlus /> Add former students
              </Button>
            )}
          </>
        }
        columns={[
          { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div><p className="font-medium">{row.original.name} {row.original.isMentor && <Badge tone="brand">Mentor</Badge>}</p><p className="text-xs text-ink-faint">{row.original.lastClass ?? ''} · {row.original.passingYear}</p></div> },
          { id: 'now', header: 'Now', cell: ({ row }) => <div><p>{statusLabel(row.original.currentStatus)}</p><p className="text-xs text-ink-faint">{[row.original.designation, row.original.organisation].filter(Boolean).join(', ')}</p></div> },
          { accessorKey: 'city', header: 'City' },
          { id: 'contact', header: 'Contact', cell: ({ row }) => (row.original.consentToContact ? <div className="text-xs"><p>{row.original.phone ?? ''}</p><p className="text-ink-faint">{row.original.email ?? ''}</p></div> : <span className="text-xs text-ink-faint">Prefers no contact</span>) },
          { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status} label={row.original.status === 'PENDING' ? 'Waiting approval' : 'In directory'} /> },
        ]}
        rowActions={(r) =>
          r.status === 'PENDING' && can('alumni', 'edit') ? (
            <MenuItem
              onSelect={async () => {
                await api(`/api/alumni/${r.id}`, { method: 'PUT', body: { status: 'APPROVED' } });
                toast.success(`${r.name} added to the directory`);
                invalidate(['/api/alumni']);
              }}
            >
              <CheckCircle2 /> Approve
            </MenuItem>
          ) : null
        }
        exportName="alumni"
        exportRow={(r) => ({ Name: r.name, Year: r.passingYear, 'Last class': r.lastClass ?? '', Now: statusLabel(r.currentStatus), Organisation: r.organisation ?? '', Role: r.designation ?? '', 'Higher education': r.higherEducation ?? '', City: r.city ?? '', Mobile: r.consentToContact ? r.phone ?? '' : '', Email: r.consentToContact ? r.email ?? '' : '', Mentor: r.isMentor ? 'Yes' : 'No' })}
        toForm={(r) => ({ ...r, currentStatus: r.currentStatus ?? '' })}
      />
      <FromStudents open={importing} onOpenChange={setImporting} />
    </>
  );
}

function FromStudents({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Array<{ id: string; name: string; admissionNo: string; status: string; leftOn: string | null; lastClass: string }>>(open ? '/api/alumni/from-students' : null);
  const [picked, setPicked] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setPicked([]), [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add former students"
      description="Students marked as passed out or transferred who are not in the directory yet."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!picked.length}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ added: number }>('/api/alumni/from-students', { method: 'POST', body: { studentIds: picked } });
                toast.success(`${r.added} added to alumni`);
                invalidate(['/api/alumni']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Add {picked.length || ''}
          </Button>
        </>
      }
    >
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <p className="text-sm text-ink-soft">No former students waiting to be added.</p>
      ) : (
        <div className="max-h-96 space-y-1 overflow-y-auto">
          <label className="flex items-center gap-2 border-b border-line pb-2 text-sm font-medium">
            <Checkbox checked={picked.length === data.length} onCheckedChange={(c) => setPicked(c ? data.map((s) => s.id) : [])} /> Select all ({data.length})
          </label>
          {data.map((s) => (
            <label key={s.id} className="flex items-center gap-2 py-1 text-sm">
              <Checkbox checked={picked.includes(s.id)} onCheckedChange={(c) => setPicked((p) => (c ? [...p, s.id] : p.filter((x) => x !== s.id)))} />
              <span className="flex-1">
                {s.name} <span className="text-xs text-ink-faint">· {s.admissionNo} · {s.lastClass}</span>
              </span>
              <span className="text-xs text-ink-faint">{s.status === 'PASSED_OUT' ? 'Passed out' : 'Transferred'} {s.leftOn ? formatDate(s.leftOn) : ''}</span>
            </label>
          ))}
        </div>
      )}
    </Dialog>
  );
}
