'use client';

import * as React from 'react';
import { CalendarClock, Copy, ExternalLink, GraduationCap, Phone, Plus, Search, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { cn, formatDate, formatDateTime, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { CredentialsDialog, type Credential } from '@/components/people';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

type Stage = 'ENQUIRY' | 'APPLIED' | 'DOCS_VERIFIED' | 'TEST_SCHEDULED' | 'SEAT_OFFERED' | 'ADMITTED' | 'REJECTED' | 'WITHDRAWN';
interface App {
  id: string;
  applicationNo: string;
  stage: Stage;
  source: string;
  classId: string;
  classLabel: string;
  studentName: string;
  gender: string | null;
  dob: string | null;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string | null;
  previousSchool: string | null;
  notes: string | null;
  followUpAt: string | null;
  studentId: string | null;
  createdAt: string;
}

const PIPELINE: Array<{ stage: Stage; label: string; tone: string }> = [
  { stage: 'ENQUIRY', label: 'Enquiry', tone: 'border-t-sky-400' },
  { stage: 'APPLIED', label: 'Applied', tone: 'border-t-indigo-400' },
  { stage: 'DOCS_VERIFIED', label: 'Docs verified', tone: 'border-t-violet-400' },
  { stage: 'TEST_SCHEDULED', label: 'Test / interview', tone: 'border-t-amber-400' },
  { stage: 'SEAT_OFFERED', label: 'Seat offered', tone: 'border-t-emerald-400' },
];

function AppCard({ a, onOpen }: { a: App; onOpen: () => void }) {
  const due = a.followUpAt && new Date(a.followUpAt) <= new Date(Date.now() + 86_400_000);
  return (
    <button onClick={onOpen} className="w-full rounded-xl border border-line bg-surface p-3 text-left shadow-sm transition-shadow hover:shadow-pop">
      <p className="text-sm font-semibold">{a.studentName}</p>
      <p className="text-xs text-ink-faint">
        {a.classLabel} · {a.applicationNo}
      </p>
      <p className="mt-2 flex items-center gap-1 text-xs text-ink-soft">
        <Phone className="size-3" /> {a.guardianName} · {a.guardianPhone}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Badge>{a.source.replace('_', ' ').toLowerCase()}</Badge>
        {a.followUpAt && (
          <Badge tone={due ? 'warning' : 'neutral'}>
            <CalendarClock className="size-3" /> {formatDate(a.followUpAt)}
          </Badge>
        )}
      </div>
    </button>
  );
}

function Detail({ app, onClose }: { app: App; onClose: () => void }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [notes, setNotes] = React.useState(app.notes ?? '');
  const [follow, setFollow] = React.useState(app.followUpAt ? app.followUpAt.slice(0, 16) : '');
  const [sectionId, setSectionId] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [creds, setCreds] = React.useState<Credential[]>([]);
  const [busy, setBusy] = React.useState(false);
  const save = async (patch: Record<string, unknown>, msg = 'Saved') => {
    try {
      await api(`/api/admissions/${app.id}`, { method: 'PATCH', body: patch });
      toast.success(msg);
      invalidate(['/api/admissions', '/api/dashboard']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const closed = app.stage === 'ADMITTED' || app.stage === 'REJECTED' || app.stage === 'WITHDRAWN';
  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()} title={app.studentName} description={`${app.applicationNo} · ${app.classLabel} · applied ${formatDateTime(app.createdAt)}`} size="lg" side>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-ink-faint">Parent</p>
              <p className="font-medium">{app.guardianName}</p>
              <a href={`tel:${app.guardianPhone}`} className="text-xs text-brand-600">
                {app.guardianPhone}
              </a>
            </div>
            <div>
              <p className="text-xs text-ink-faint">Child</p>
              <p className="font-medium">{app.gender?.toLowerCase() ?? '—'} · DOB {formatDate(app.dob)}</p>
              <p className="text-xs text-ink-faint">{app.previousSchool ?? 'No previous school'}</p>
            </div>
          </div>
          {!closed && can('admissions', 'edit') && (
            <>
              <Field label="Move to stage">
                <div className="flex flex-wrap gap-2">
                  {PIPELINE.map((p) => (
                    <Button key={p.stage} size="sm" variant={app.stage === p.stage ? 'primary' : 'secondary'} onClick={() => save({ stage: p.stage }, `Moved to ${p.label}`)}>
                      {p.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="danger-soft" onClick={() => save({ stage: 'REJECTED' }, 'Marked rejected')}>
                    Reject
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => save({ stage: 'WITHDRAWN' }, 'Marked withdrawn')}>
                    Withdrawn
                  </Button>
                </div>
              </Field>
              <Field label="Notes">
                <Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Call log, documents pending, test score…" />
              </Field>
              <div className="flex flex-wrap items-end gap-3">
                <Field label="Next follow-up" className="flex-1">
                  <Input type="datetime-local" value={follow} onChange={(e) => setFollow(e.target.value)} />
                </Field>
                <Button variant="secondary" onClick={() => save({ notes, followUpAt: follow ? new Date(follow).toISOString() : null })}>
                  Save notes
                </Button>
              </div>
            </>
          )}
          {app.stage === 'SEAT_OFFERED' && can('admissions', 'edit') && can('students', 'create') && (
            <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/5">
              <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-200">
                <GraduationCap className="size-4" /> Admit as student
              </p>
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sectionOptions(lk, app.classId)} placeholder="Choose section…" />
              <label className="flex items-start gap-2 text-xs">
                <Checkbox checked={consent} onCheckedChange={(v) => setConsent(!!v)} /> Parent has given consent for data processing (DPDP Act).
              </label>
              <Button
                loading={busy}
                disabled={!sectionId || !consent}
                onClick={async () => {
                  setBusy(true);
                  try {
                    const r = await api<{ admissionNo: string; credentials: Credential[] }>(`/api/admissions/${app.id}/admit`, { method: 'POST', body: { sectionId, admissionDate: todayISO(), consent: true } });
                    toast.success(`Admitted — ${r.admissionNo}`);
                    invalidate(['/api/admissions', '/api/students', '/api/dashboard']);
                    if (r.credentials.length) setCreds(r.credentials);
                    else onClose();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <UserPlus /> Admit now
              </Button>
            </div>
          )}
          {app.studentId && (
            <Button asChild variant="soft">
              <a href={`/students/${app.studentId}`}>
                <ExternalLink /> Open student record
              </a>
            </Button>
          )}
        </div>
      </Dialog>
      <CredentialsDialog
        credentials={creds}
        onClose={() => {
          setCreds([]);
          onClose();
        }}
      />
    </>
  );
}

export default function AdmissionsPage() {
  const { can, me } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [search, setSearch] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [view, setView] = React.useState<'open' | 'closed'>('open');
  const { data, isLoading } = useApiQuery<{ rows: App[]; stages: Record<Stage, number> }>('/api/admissions', { search: search || undefined, classId: classId || undefined });
  const [open, setOpen] = React.useState<App | null>(null);
  const [creating, setCreating] = React.useState(false);
  const applyUrl = typeof window !== 'undefined' ? `${window.location.origin}/apply/${me.school.code}` : '';
  const closed = (data?.rows ?? []).filter((r) => ['ADMITTED', 'REJECTED', 'WITHDRAWN'].includes(r.stage));

  return (
    <>
      <PageHeader
        title="Admissions"
        description="Enquiries and applications from walk-ins, calls and the online form."
        icon={UserPlus}
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                navigator.clipboard?.writeText(applyUrl);
                toast.success('Online admission link copied — share it on WhatsApp or your website');
              }}
            >
              <Copy /> Copy online form link
            </Button>
            {can('admissions', 'create') && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> New enquiry
              </Button>
            )}
          </>
        }
      />
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, phone, application no." className="h-9 pl-9" />
          </div>
          <Select className="h-9 w-36" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} placeholder="All classes" />
          <div className="ml-auto flex gap-1 text-xs">
            <Button size="sm" variant={view === 'open' ? 'soft' : 'ghost'} onClick={() => setView('open')}>
              Pipeline
            </Button>
            <Button size="sm" variant={view === 'closed' ? 'soft' : 'ghost'} onClick={() => setView('closed')}>
              Closed ({closed.length})
            </Button>
          </div>
        </div>
      </Card>
      {isLoading ? (
        <LoadingBlock />
      ) : view === 'open' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE.map((col) => {
            const items = (data?.rows ?? []).filter((r) => r.stage === col.stage);
            return (
              <div key={col.stage} className={cn('flex w-72 shrink-0 flex-col rounded-2xl border border-t-4 border-line bg-canvas/60', col.tone)}>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <p className="text-sm font-semibold">{col.label}</p>
                  <Badge>{items.length}</Badge>
                </div>
                <div className="space-y-2 px-2 pb-2">
                  {items.length ? items.map((a) => <AppCard key={a.id} a={a} onOpen={() => setOpen(a)} />) : <p className="px-2 py-6 text-center text-xs text-ink-faint">Empty</p>}
                </div>
              </div>
            );
          })}
        </div>
      ) : !closed.length ? (
        <Card>
          <EmptyState title="No closed applications" />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {closed.map((a) => (
            <div key={a.id} className="relative">
              <AppCard a={a} onOpen={() => setOpen(a)} />
              <Badge tone={a.stage === 'ADMITTED' ? 'success' : 'danger'} className="absolute right-3 top-3">
                {a.stage.toLowerCase()}
              </Badge>
            </div>
          ))}
        </div>
      )}
      {open && <Detail app={open} onClose={() => setOpen(null)} />}
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="New enquiry"
        fields={[
          { name: 'studentName', label: 'Child’s name', required: true },
          { name: 'classId', label: 'Class sought', type: 'select', required: true, options: classOptions(lk) },
          { name: 'gender', label: 'Gender', type: 'select', options: [{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }] },
          { name: 'dob', label: 'Date of birth', type: 'date' },
          { name: 'guardianName', label: 'Parent’s name', required: true },
          { name: 'guardianPhone', label: 'Parent’s mobile', type: 'tel', required: true },
          { name: 'guardianEmail', label: 'Email', type: 'email' },
          { name: 'source', label: 'Source', type: 'select', options: ['WALK_IN', 'PHONE', 'REFERRAL', 'CAMPAIGN', 'ONLINE'].map((s) => ({ value: s, label: s.replace('_', ' ').toLowerCase() })) },
          { name: 'previousSchool', label: 'Previous school' },
          { name: 'followUpAt', label: 'Follow up on', type: 'datetime-local' },
          { name: 'notes', label: 'Notes', type: 'textarea' },
        ]}
        initial={{ source: 'WALK_IN' }}
        onSubmit={async (v) => {
          await api('/api/admissions', { method: 'POST', body: { ...v, followUpAt: v.followUpAt ? new Date(v.followUpAt).toISOString() : null } });
          toast.success('Enquiry recorded');
          invalidate(['/api/admissions', '/api/dashboard']);
        }}
      />
    </>
  );
}
