'use client';

import * as React from 'react';
import { CheckCircle2, Gavel, Pencil, Plus, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { downloadCsv, formatDate, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader, StatCard, StatusBadge, type Tone } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Incident {
  id: string;
  studentId: string;
  studentName: string;
  classLabel: string;
  incidentDate: string;
  category: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  actionTaken: string | null;
  status: 'OPEN' | 'ACTION_TAKEN' | 'RESOLVED';
  visibleToFamily: boolean;
  reportedByName: string;
}

const SEVERITY: Record<Incident['severity'], { label: string; tone: Tone }> = {
  LOW: { label: 'Low', tone: 'neutral' },
  MEDIUM: { label: 'Medium', tone: 'warning' },
  HIGH: { label: 'High', tone: 'danger' },
  CRITICAL: { label: 'Critical', tone: 'danger' },
};
const STATUS_LABEL = { OPEN: 'Open', ACTION_TAKEN: 'Action taken', RESOLVED: 'Resolved' };

export default function DisciplinePage() {
  const { isFamily } = useApp();
  return isFamily ? <FamilyDiscipline /> : <StaffDiscipline />;
}

function StaffDiscipline() {
  const { can } = useApp();
  const [status, setStatus] = React.useState('ACTIVE');
  const [severity, setSeverity] = React.useState('');
  const [editing, setEditing] = React.useState<Incident | null>(null);
  const [creating, setCreating] = React.useState(false);
  const { data, isLoading } = useApiQuery<Incident[]>('/api/discipline', { status: status || undefined, severity: severity || undefined });
  const { data: all } = useApiQuery<Incident[]>('/api/discipline', { status: 'ACTIVE' });
  return (
    <>
      <PageHeader
        title="Discipline"
        description="Incident register with severity, action taken and parent notification."
        icon={Gavel}
        actions={
          can('discipline', 'create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Record incident
            </Button>
          )
        }
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open incidents" value={(all ?? []).filter((i) => i.status === 'OPEN').length} icon={ShieldAlert} tone="amber" />
        <StatCard label="Action taken" value={(all ?? []).filter((i) => i.status === 'ACTION_TAKEN').length} icon={Gavel} tone="sky" />
        <StatCard label="High / critical" value={(all ?? []).filter((i) => i.severity === 'HIGH' || i.severity === 'CRITICAL').length} icon={ShieldAlert} tone="rose" />
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Select className="h-9 w-40" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'ACTIVE', label: 'Not resolved' }, { value: 'OPEN', label: 'Open' }, { value: 'ACTION_TAKEN', label: 'Action taken' }, { value: 'RESOLVED', label: 'Resolved' }, { value: '', label: 'All' }]} />
          <Select className="h-9 w-36" value={severity} onChange={(e) => setSeverity(e.target.value)} options={Object.entries(SEVERITY).map(([value, s]) => ({ value, label: s.label }))} placeholder="Any severity" />
          <Button className="ml-auto" size="sm" variant="secondary" disabled={!data?.length} onClick={() => downloadCsv('discipline', (data ?? []).map((i) => ({ Date: i.incidentDate.slice(0, 10), Student: i.studentName, Class: i.classLabel, Category: i.category, Severity: i.severity, Title: i.title, 'Action taken': i.actionTaken ?? '', Status: STATUS_LABEL[i.status], 'Reported by': i.reportedByName })))}>
            Export
          </Button>
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={Gavel} title="No incidents" description="Record incidents to keep a fair, consistent history and keep parents informed." />
        ) : (
          <DataTable<Incident>
            data={data}
            columns={[
              { accessorKey: 'incidentDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
              { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.classLabel}</p></div> },
              { accessorKey: 'title', header: 'Incident', cell: ({ row }) => <div className="max-w-xs"><p className="font-medium">{row.original.title}</p><p className="text-xs text-ink-faint">{row.original.category}{row.original.visibleToFamily ? '' : ' · not shared with parents'}</p></div> },
              { accessorKey: 'severity', header: 'Severity', cell: ({ row }) => <Badge tone={SEVERITY[row.original.severity].tone}>{SEVERITY[row.original.severity].label}</Badge> },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'RESOLVED' ? 'COMPLETED' : row.original.status === 'OPEN' ? 'OPEN' : 'APPLIED'} label={STATUS_LABEL[row.original.status]} /> },
              { id: 'a', header: '', cell: ({ row }) => (can('discipline', 'edit') ? <Button size="sm" variant="ghost" onClick={() => setEditing(row.original)}><Pencil /> Update</Button> : null) },
            ]}
          />
        )}
      </Card>
      <IncidentDialog open={creating} onOpenChange={setCreating} />
      <IncidentDialog open={!!editing} incident={editing} onOpenChange={(o) => !o && setEditing(null)} />
    </>
  );
}

function IncidentDialog({ open, onOpenChange, incident }: { open: boolean; onOpenChange: (o: boolean) => void; incident?: Incident | null }) {
  const { me } = useApp();
  const invalidate = useInvalidate();
  const cats = me.settings.disciplineCategories ?? [];
  const blank = { incidentDate: todayISO(), category: cats[0] ?? '', severity: 'LOW', title: '', description: '', actionTaken: '', status: 'OPEN', visibleToFamily: true, notifyParent: true };
  const [v, setV] = React.useState(blank);
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setStudent(null);
    setV(incident ? { ...blank, ...incident, incidentDate: incident.incidentDate.slice(0, 10), actionTaken: incident.actionTaken ?? '', notifyParent: false } : blank);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, incident]);
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={incident ? `Update: ${incident.studentName}` : 'Record incident'}
      description={incident ? incident.classLabel : 'Facts only — what happened, when, and what the school did about it.'}
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {incident && incident.status !== 'RESOLVED' && (
            <Button
              variant="success"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api(`/api/discipline/${incident.id}`, { method: 'PUT', body: { status: 'RESOLVED', actionTaken: v.actionTaken || null } });
                  toast.success('Incident resolved');
                  invalidate(['/api/discipline']);
                  onOpenChange(false);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <CheckCircle2 /> Resolve
            </Button>
          )}
          <Button
            loading={busy}
            disabled={(!incident && !student) || v.title.trim().length < 3 || v.description.trim().length < 3}
            onClick={async () => {
              setBusy(true);
              try {
                const payload = { incidentDate: v.incidentDate, category: v.category, severity: v.severity, title: v.title, description: v.description, actionTaken: v.actionTaken || null, visibleToFamily: v.visibleToFamily };
                if (incident) await api(`/api/discipline/${incident.id}`, { method: 'PUT', body: payload });
                else await api('/api/discipline', { method: 'POST', body: { ...payload, studentId: student!.id, notifyParent: v.notifyParent } });
                toast.success(incident ? 'Incident updated' : 'Incident recorded');
                invalidate(['/api/discipline']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {!incident && (
          <Field label="Student" required className="sm:col-span-2">
            <StudentPicker value={student} onChange={setStudent} />
          </Field>
        )}
        <Field label="Date" required>
          <Input type="date" max={todayISO()} value={v.incidentDate} onChange={(e) => set('incidentDate', e.target.value)} />
        </Field>
        <Field label="Category" required>
          <Select value={v.category} onChange={(e) => set('category', e.target.value)} options={cats.map((c) => ({ value: c, label: c }))} />
        </Field>
        <Field label="Severity" required>
          <Select value={v.severity} onChange={(e) => set('severity', e.target.value)} options={Object.entries(SEVERITY).map(([value, s]) => ({ value, label: s.label }))} />
        </Field>
        <Field label="Title" required>
          <Input value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="Late to school 3 days this week" />
        </Field>
        <Field label="What happened" required className="sm:col-span-2">
          <Textarea rows={3} value={v.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        <Field label="Action taken" className="sm:col-span-2">
          <Textarea rows={2} value={v.actionTaken} onChange={(e) => set('actionTaken', e.target.value)} placeholder="Spoke to the student; parent called on…" />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={v.visibleToFamily} onCheckedChange={(c) => set('visibleToFamily', c)} /> Share with parent and student
        </label>
        {!incident && v.visibleToFamily && (
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={v.notifyParent} onCheckedChange={(c) => set('notifyParent', c)} /> Notify parent now
          </label>
        )}
      </div>
    </Dialog>
  );
}

function FamilyDiscipline() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<Incident[]>(child ? '/api/discipline' : null, { studentId: child?.id });
  return (
    <>
      <PageHeader title="Discipline" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={Gavel} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={CheckCircle2} title="Nothing to report" description="No discipline notes have been shared." />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((i) => (
            <Card key={i.id}>
              <CardBody>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">{i.title}</p>
                  <Badge tone={SEVERITY[i.severity].tone}>{SEVERITY[i.severity].label}</Badge>
                  <StatusBadge status={i.status === 'RESOLVED' ? 'COMPLETED' : 'OPEN'} label={STATUS_LABEL[i.status]} />
                  <span className="ml-auto text-xs text-ink-faint">{formatDate(i.incidentDate)} · {i.category}</span>
                </div>
                <p className="mt-2 text-sm text-ink-soft">{i.description}</p>
                {i.actionTaken && (
                  <p className="mt-2 rounded-xl bg-canvas px-3 py-2 text-sm">
                    <b>Action taken:</b> {i.actionTaken}
                  </p>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
