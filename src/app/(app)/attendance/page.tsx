'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Camera, CheckCheck, ClipboardList, Download, Printer, ScanLine, Table2, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, useLookups } from '@/lib/lookups';
import { cn, currentPeriod, downloadCsv, formatDate, periodLabel, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader, Progress, StatCard } from '@/components/ui/display';
import { Field, Input, Select } from '@/components/ui/form';
import { Tabs, TabPanel } from '@/components/ui/overlay';

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
const STATUS_BTNS: Array<{ value: Status; short: string; cls: string }> = [
  { value: 'PRESENT', short: 'P', cls: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white data-[on=true]:border-emerald-600' },
  { value: 'ABSENT', short: 'A', cls: 'data-[on=true]:bg-rose-600 data-[on=true]:text-white data-[on=true]:border-rose-600' },
  { value: 'LATE', short: 'L', cls: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white data-[on=true]:border-amber-500' },
  { value: 'HALF_DAY', short: 'H', cls: 'data-[on=true]:bg-orange-400 data-[on=true]:text-white data-[on=true]:border-orange-400' },
  { value: 'LEAVE', short: 'LV', cls: 'data-[on=true]:bg-sky-500 data-[on=true]:text-white data-[on=true]:border-sky-500' },
];

interface RosterRow {
  studentId: string;
  name: string;
  rollNo: string | null;
  admissionNo: string;
  photoUrl: string | null;
  status: Status | null;
  remarks: string | null;
  onApprovedLeave: boolean;
}
interface Roster {
  section: { id: string; label: string; classTeacher: string | null };
  date: string;
  isWorkingDay: boolean;
  holiday: string | null;
  marked: boolean;
  markedBy: string | null;
  roster: RosterRow[];
}

function MarkTab() {
  const params = useSearchParams();
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes'], { mine: true });
  const sections = allSectionOptions(lk);
  const [sectionId, setSectionId] = React.useState(params.get('sectionId') ?? '');
  const [date, setDate] = React.useState(todayISO());
  const { data, isLoading, refetch } = useApiQuery<Roster>(sectionId ? '/api/attendance' : null, { sectionId, date });
  const [draft, setDraft] = React.useState<Record<string, Status>>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.roster.filter((r) => r.status).map((r) => [r.studentId, r.status as Status])));
  }, [data]);

  const counts = Object.values(draft).reduce<Record<string, number>>((a, s) => ({ ...a, [s]: (a[s] ?? 0) + 1 }), {});
  const total = data?.roster.length ?? 0;
  const unmarked = total - Object.keys(draft).length;
  const readOnly = data?.marked ? !can('attendance', 'edit') : !can('attendance', 'create');

  async function save() {
    if (!data) return;
    if (unmarked > 0) return toast.error(`${unmarked} student(s) not marked yet`);
    setSaving(true);
    try {
      const res = await api<{ saved: number; alerted: number }>('/api/attendance', {
        method: 'PUT',
        body: { sectionId, date, entries: data.roster.map((r) => ({ studentId: r.studentId, status: draft[r.studentId], remarks: r.onApprovedLeave ? r.remarks : null })) },
      });
      toast.success(`Attendance saved for ${res.saved} students${res.alerted ? ` · ${res.alerted} SMS alerts queued` : ''}`);
      invalidate(['/api/attendance', '/api/dashboard']);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="flex flex-wrap items-end gap-3">
          <Field label="Class & section" className="w-56">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} placeholder="Select…" />
          </Field>
          <Field label="Date" className="w-44">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
          {data && (
            <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
              <Badge tone="success">P {counts.PRESENT ?? 0}</Badge>
              <Badge tone="danger">A {counts.ABSENT ?? 0}</Badge>
              <Badge tone="warning">L {(counts.LATE ?? 0) + (counts.HALF_DAY ?? 0)}</Badge>
              <Badge tone="info">LV {counts.LEAVE ?? 0}</Badge>
              {unmarked > 0 && <Badge>{unmarked} unmarked</Badge>}
            </div>
          )}
        </CardBody>
      </Card>

      {!sectionId ? (
        <Card>
          <EmptyState title="No sections assigned to you" description="Ask the administrator to allocate you as class or subject teacher." />
        </Card>
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <Card>
          <CardHeader
            title={`${data.section.label} · ${formatDate(data.date, 'long')}`}
            description={data.holiday ? `Holiday: ${data.holiday}` : !data.isWorkingDay ? 'Not a working day' : data.marked ? `Marked by ${data.markedBy ?? '—'}` : 'Not marked yet'}
            actions={
              !readOnly && (
                <Button variant="soft" size="sm" onClick={() => setDraft(Object.fromEntries(data.roster.map((r) => [r.studentId, r.onApprovedLeave ? 'LEAVE' : 'PRESENT'])))}>
                  <CheckCheck /> Mark all present
                </Button>
              )
            }
          />
          {data.roster.length === 0 ? (
            <EmptyState title="No students in this section" />
          ) : (
            <ul className="divide-y divide-line">
              {data.roster.map((r) => (
                <li key={r.studentId} className={cn('flex flex-wrap items-center gap-3 px-4 py-2.5 sm:px-5', draft[r.studentId] === 'ABSENT' && 'bg-rose-50/60 dark:bg-rose-500/5')}>
                  <span className="w-7 text-right text-xs font-semibold text-ink-faint">{r.rollNo ?? '–'}</span>
                  <Avatar name={r.name} src={r.photoUrl} size={32} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.name}</p>
                    <p className="truncate text-[11px] text-ink-faint">{r.onApprovedLeave ? r.remarks : r.admissionNo}</p>
                  </div>
                  <div className="flex gap-1" role="radiogroup" aria-label={`Attendance for ${r.name}`}>
                    {STATUS_BTNS.map((b) => (
                      <button
                        key={b.value}
                        type="button"
                        role="radio"
                        aria-checked={draft[r.studentId] === b.value}
                        data-on={draft[r.studentId] === b.value}
                        disabled={readOnly}
                        onClick={() => setDraft((d) => ({ ...d, [r.studentId]: b.value }))}
                        title={b.value.replace('_', ' ').toLowerCase()}
                        className={cn('h-9 min-w-9 rounded-lg border border-line px-2 text-xs font-bold text-ink-soft transition-colors hover:bg-canvas disabled:cursor-not-allowed', b.cls)}
                      >
                        {b.short}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {!readOnly && data.roster.length > 0 && (
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
              <p className="text-xs text-ink-soft">Parents of absent students are alerted automatically.</p>
              <Button onClick={save} loading={saving}>
                <UserCheck /> {data.marked ? 'Update attendance' : 'Save attendance'}
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function SummaryTab() {
  const [date, setDate] = React.useState(todayISO());
  const { data, isLoading } = useApiQuery<{ holiday: string | null; isWorkingDay: boolean; sections: Array<{ sectionId: string; label: string; classTeacher: string | null; strength: number; marked: number; present: number; absent: number; leave: number }> }>('/api/attendance/report', { view: 'summary', date });
  const tot = (data?.sections ?? []).reduce((a, s) => ({ strength: a.strength + s.strength, present: a.present + s.present, absent: a.absent + s.absent, marked: a.marked + (s.marked ? 1 : 0) }), { strength: 0, present: 0, absent: 0, marked: 0 });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <Field label="Date">
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </Card>
        <StatCard label="Present" value={`${tot.present} / ${tot.strength}`} icon={UserCheck} tone="emerald" />
        <StatCard label="Absent" value={tot.absent} icon={ClipboardList} tone="rose" />
        <StatCard label="Sections marked" value={`${tot.marked} / ${data?.sections.length ?? 0}`} icon={CheckCheck} />
      </div>
      <Card>
        <CardHeader title="Class-wise report" description={data?.holiday ? `Holiday: ${data.holiday}` : undefined} actions={<Button variant="secondary" size="sm" onClick={() => window.print()}><Printer /> Print</Button>} />
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-5 py-2.5">Class</th>
                  <th className="px-5 py-2.5">Class teacher</th>
                  <th className="px-5 py-2.5">Strength</th>
                  <th className="px-5 py-2.5">Present</th>
                  <th className="px-5 py-2.5">Absent</th>
                  <th className="px-5 py-2.5">Leave</th>
                  <th className="w-48 px-5 py-2.5">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {data?.sections.map((s) => {
                  const pct = s.marked ? Math.round((s.present / s.marked) * 100) : null;
                  return (
                    <tr key={s.sectionId} className="border-b border-line/60">
                      <td className="px-5 py-2.5 font-medium">{s.label}</td>
                      <td className="px-5 py-2.5 text-ink-soft">{s.classTeacher ?? '—'}</td>
                      <td className="px-5 py-2.5">{s.strength}</td>
                      <td className="px-5 py-2.5 text-emerald-700">{s.marked ? s.present : '—'}</td>
                      <td className="px-5 py-2.5 text-rose-600">{s.marked ? s.absent : '—'}</td>
                      <td className="px-5 py-2.5">{s.marked ? s.leave : '—'}</td>
                      <td className="px-5 py-2.5">
                        {pct === null ? (
                          <Badge tone="warning">Not marked</Badge>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Progress value={pct} tone={pct >= 90 ? 'success' : pct >= 75 ? 'warning' : 'danger'} className="h-1.5" />
                            <span className="text-xs">{pct}%</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function RegisterTab() {
  const { data: lk } = useLookups(['classes'], { mine: true });
  const sections = allSectionOptions(lk);
  const [sectionId, setSectionId] = React.useState('');
  const [month, setMonth] = React.useState(currentPeriod());
  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  const { data, isLoading } = useApiQuery<{ section: string; days: Array<{ day: number; working: boolean }>; students: Array<{ studentId: string; name: string; rollNo: string | null; marks: string[]; present: number; absent: number; total: number; percent: number | null }> }>(
    sectionId ? '/api/attendance/report' : null,
    { view: 'register', sectionId, month }
  );
  const color: Record<string, string> = { P: 'text-emerald-600', A: 'bg-rose-100 font-bold text-rose-700 dark:bg-rose-500/20', L: 'text-amber-600', H: 'text-orange-500', LV: 'text-sky-600', HO: 'text-slate-400' };
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <Field label="Section" className="w-52">
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} />
        </Field>
        <Field label="Month" className="w-44">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <div className="ml-auto flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={!data?.students.length}
            onClick={() =>
              downloadCsv(`attendance-${data!.section}-${month}`, data!.students.map((s) => ({ Roll: s.rollNo ?? '', Name: s.name, ...Object.fromEntries(s.marks.map((m, i) => [String(i + 1), m])), Present: s.present, Absent: s.absent, '%': s.percent ?? '' })))
            }
          >
            <Download /> CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => window.print()}>
            <Printer /> Print
          </Button>
        </div>
      </div>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">Student</th>
                {data.days.map((d) => (
                  <th key={d.day} className={cn('w-7 px-1 py-2 text-center font-medium', !d.working && 'text-rose-400')}>
                    {d.day}
                  </th>
                ))}
                <th className="px-2 py-2">P</th>
                <th className="px-2 py-2">A</th>
                <th className="px-2 py-2">%</th>
              </tr>
            </thead>
            <tbody>
              {data.students.map((s) => (
                <tr key={s.studentId} className="border-b border-line/60">
                  <td className="sticky left-0 z-10 whitespace-nowrap bg-surface px-3 py-1.5 font-medium">
                    <span className="mr-1.5 text-ink-faint">{s.rollNo}</span>
                    {s.name}
                  </td>
                  {s.marks.map((m, i) => (
                    <td key={i} className={cn('px-0.5 py-1.5 text-center', color[m], !data.days[i].working && !m && 'bg-canvas')}>
                      {m}
                    </td>
                  ))}
                  <td className="px-2 text-center font-semibold">{s.present}</td>
                  <td className="px-2 text-center">{s.absent}</td>
                  <td className={cn('px-2 text-center font-semibold', (s.percent ?? 100) < 75 && 'text-rose-600')}>{s.percent ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-ink-faint">P present · A absent · L late · H half day · LV leave · HO holiday. Students below 75% are highlighted.</p>
        </div>
      )}
    </Card>
  );
}

function ScanTab() {
  const [code, setCode] = React.useState('');
  const [last, setLast] = React.useState<Array<{ name: string; classLabel: string; photoUrl: string | null; alreadyMarked: boolean; at: string }>>([]);
  const [camera, setCamera] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const busy = React.useRef(false);

  const submit = React.useCallback(async (value: string) => {
    if (!value.trim() || busy.current) return;
    busy.current = true;
    try {
      const r = await api<{ name: string; classLabel: string; photoUrl: string | null; alreadyMarked: boolean }>('/api/attendance/scan', { method: 'POST', body: { code: value.trim() } });
      setLast((l) => [{ ...r, at: new Date().toLocaleTimeString('en-IN') }, ...l].slice(0, 20));
      toast.success(`${r.name} marked present`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      busy.current = false;
      setCode('');
      inputRef.current?.focus();
    }
  }, []);

  React.useEffect(() => {
    if (!camera) return;
    type Detector = { detect: (v: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> };
    const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    if (!BD) {
      toast.error('Camera scanning is not supported in this browser. Use a USB scanner or Chrome on Android.');
      setCamera(false);
      return;
    }
    let stream: MediaStream | null = null;
    let stop = false;
    const lastSeen = new Map<string, number>();
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        const detector = new BD({ formats: ['qr_code', 'code_128', 'code_39'] });
        while (!stop) {
          const found = await detector.detect(videoRef.current).catch(() => []);
          for (const f of found) {
            const t = lastSeen.get(f.rawValue) ?? 0;
            if (Date.now() - t > 4000) {
              lastSeen.set(f.rawValue, Date.now());
              await submit(f.rawValue);
            }
          }
          await new Promise((r) => setTimeout(r, 300));
        }
      } catch {
        toast.error('Could not open the camera');
        setCamera(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [camera, submit]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Scan ID cards" icon={ScanLine} description="Plug in a USB barcode/QR scanner and scan student ID cards, or use the phone camera. Each scan marks the student present for today." />
        <CardBody className="space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(code);
            }}
          >
            <Input ref={inputRef} autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Scan or type admission number…" className="h-12 text-lg" />
          </form>
          <Button variant={camera ? 'danger-soft' : 'secondary'} onClick={() => setCamera((c) => !c)}>
            <Camera /> {camera ? 'Stop camera' : 'Use camera'}
          </Button>
          {camera && <video ref={videoRef} className="aspect-video w-full rounded-xl bg-black object-cover" muted playsInline />}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Recent scans" />
        {last.length === 0 ? (
          <EmptyState title="No scans yet" />
        ) : (
          <ul className="divide-y divide-line">
            {last.map((s, i) => (
              <li key={i} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={s.name} src={s.photoUrl} size={40} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-ink-faint">{s.classLabel}</p>
                </div>
                <span className="text-xs text-ink-faint">{s.at}</span>
                {s.alreadyMarked && <Badge tone="warning">re-scan</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

const CAL_COLOR: Record<string, string> = { PRESENT: 'bg-emerald-500 text-white', LATE: 'bg-amber-400 text-white', HALF_DAY: 'bg-orange-400 text-white', ABSENT: 'bg-rose-500 text-white', LEAVE: 'bg-sky-500 text-white', HOLIDAY: 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200' };

function FamilyAttendance() {
  const child = useFocusChild();
  const [month, setMonth] = React.useState(currentPeriod());
  const { data, isLoading } = useApiQuery<{ days: Array<{ date: string; status: string | null; remarks: string | null; working: boolean }>; present: number; total: number; percent: number | null }>(
    child ? '/api/attendance/report' : null,
    { view: 'student', studentId: child?.id, month }
  );
  if (!child) return <EmptyState title="No student linked" />;
  const first = data?.days[0] ? (new Date(data.days[0].date).getUTCDay() + 6) % 7 : 0;
  return (
    <>
      <PageHeader title="Attendance" description={`${child.name} · ${child.classLabel}`} icon={UserCheck} actions={<Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-44" />} />
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title={periodLabel(month)} />
            <CardBody>
              <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-medium text-ink-faint">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-1.5">
                {Array.from({ length: first }).map((_, i) => (
                  <span key={`b${i}`} />
                ))}
                {data.days.map((d) => (
                  <div key={d.date} title={d.remarks ?? d.status ?? ''} className={cn('flex aspect-square flex-col items-center justify-center rounded-xl text-sm font-semibold', d.status ? CAL_COLOR[d.status] : d.working ? 'bg-canvas text-ink-soft' : 'text-ink-faint')}>
                    {new Date(d.date).getUTCDate()}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-soft">
                {Object.entries({ PRESENT: 'Present', ABSENT: 'Absent', LATE: 'Late', LEAVE: 'Leave', HOLIDAY: 'Holiday' }).map(([k, v]) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <span className={cn('size-3 rounded', CAL_COLOR[k])} /> {v}
                  </span>
                ))}
              </div>
            </CardBody>
          </Card>
          <div className="space-y-4">
            <StatCard label="This month" value={data.percent === null ? '—' : `${data.percent}%`} icon={UserCheck} tone={data.percent !== null && data.percent < 75 ? 'rose' : 'emerald'} hint={`${data.present} of ${data.total} days present`} />
            {data.percent !== null && data.percent < 75 && (
              <Card className="border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                Attendance is below 75%. Students need at least 75% attendance to sit annual examinations.
              </Card>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default function AttendancePage() {
  const { isFamily, can } = useApp();
  const [tab, setTab] = React.useState('mark');
  if (isFamily) return <FamilyAttendance />;
  return (
    <>
      <PageHeader title="Student attendance" description="Mark daily attendance, scan ID cards and view registers." icon={UserCheck} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'mark', label: <><UserCheck className="size-4" /> Mark</> },
          { value: 'summary', label: <><ClipboardList className="size-4" /> Class-wise</> },
          { value: 'register', label: <><Table2 className="size-4" /> Monthly register</> },
          ...(can('attendance', 'create') ? [{ value: 'scan', label: <><ScanLine className="size-4" /> Scan cards</> }] : []),
        ]}
      >
        <TabPanel value="mark">
          <React.Suspense>
            <MarkTab />
          </React.Suspense>
        </TabPanel>
        <TabPanel value="summary">
          <SummaryTab />
        </TabPanel>
        <TabPanel value="register">
          <RegisterTab />
        </TabPanel>
        <TabPanel value="scan">
          <ScanTab />
        </TabPanel>
      </Tabs>
    </>
  );
}
