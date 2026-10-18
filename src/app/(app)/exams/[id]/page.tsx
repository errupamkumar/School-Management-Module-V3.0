'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Award, CalendarRange, ClipboardList, Download, Eye, EyeOff, FileBarChart, Printer, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, classOptions, subjectOptions, useLookups, findSection } from '@/lib/lookups';
import { cn, downloadCsv, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, StatCard, StatusBadge } from '@/components/ui/display';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { BarsChart } from '@/components/ui/charts';
import { Users, CheckCircle2, XCircle, Percent } from 'lucide-react';

interface Exam {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isPublished: boolean;
}

function SetupTab({ examId }: { examId: string }) {
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [classId, setClassId] = React.useState('');
  const [applyAll, setApplyAll] = React.useState(false);
  React.useEffect(() => {
    if (!classId && lk?.classes?.length) setClassId(lk.classes[0].id);
  }, [lk, classId]);
  const { data, isLoading } = useApiQuery<{ rows: Array<{ subjectId: string; subjectName: string; included: boolean; date: string | null; startTime: string | null; endTime: string | null; maxMarks: number; passMarks: number; room: string | null }> }>(classId ? `/api/exams/${examId}/schedule` : null, { classId });
  const [rows, setRows] = React.useState<NonNullable<typeof data>['rows']>([]);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => setRows(data?.rows.map((r) => ({ ...r, date: r.date?.slice(0, 10) ?? null })) ?? []), [data]);
  const upd = (id: string, p: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x) => (x.subjectId === id ? { ...x, ...p } : x)));
  return (
    <Card>
      <CardHeader
        title="Date sheet & marks setup"
        description="Tick the subjects in this exam, then set dates, timings and marks."
        actions={<Select className="h-9 w-40" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} />}
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !rows.length ? (
        <EmptyState title="No subjects mapped to this class" description="Map subjects under Classes & Subjects first." />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-2" />
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Start</th>
                  <th className="px-4 py-2">End</th>
                  <th className="px-4 py-2">Max</th>
                  <th className="px-4 py-2">Pass</th>
                  <th className="px-4 py-2">Room</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.subjectId} className={cn('border-b border-line/60', !r.included && 'opacity-50')}>
                    <td className="px-4 py-1.5"><Checkbox checked={r.included} onCheckedChange={(v) => upd(r.subjectId, { included: !!v })} aria-label={r.subjectName} /></td>
                    <td className="px-4 py-1.5 font-medium">{r.subjectName}</td>
                    <td className="px-4 py-1.5"><Input type="date" className="h-8 w-40" value={r.date ?? ''} onChange={(e) => upd(r.subjectId, { date: e.target.value || null })} /></td>
                    <td className="px-4 py-1.5"><Input type="time" className="h-8 w-28" value={r.startTime ?? ''} onChange={(e) => upd(r.subjectId, { startTime: e.target.value || null })} /></td>
                    <td className="px-4 py-1.5"><Input type="time" className="h-8 w-28" value={r.endTime ?? ''} onChange={(e) => upd(r.subjectId, { endTime: e.target.value || null })} /></td>
                    <td className="px-4 py-1.5"><Input type="number" className="h-8 w-20" value={r.maxMarks} onChange={(e) => upd(r.subjectId, { maxMarks: Number(e.target.value) })} /></td>
                    <td className="px-4 py-1.5"><Input type="number" className="h-8 w-20" value={r.passMarks} onChange={(e) => upd(r.subjectId, { passMarks: Number(e.target.value) })} /></td>
                    <td className="px-4 py-1.5"><Input className="h-8 w-24" value={r.room ?? ''} onChange={(e) => upd(r.subjectId, { room: e.target.value })} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={applyAll} onCheckedChange={(v) => setApplyAll(!!v)} /> Apply the same setup to every class that has these subjects
            </label>
            <Button
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const included = rows.filter((r) => r.included);
                  const classIds = applyAll ? (lk?.classes ?? []).map((c) => c.id) : [classId];
                  await api(`/api/exams/${examId}/schedule`, { method: 'PUT', body: { classIds, rows: included.map(({ included: _i, subjectName: _n, ...r }) => r) } });
                  toast.success('Date sheet saved');
                  invalidate([`/api/exams`]);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Save /> Save
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

interface MarksSheet {
  exam: { isPublished: boolean };
  maxMarks: number;
  passMarks: number;
  locked: boolean;
  rows: Array<{ studentId: string; name: string; rollNo: string | null; admissionNo: string; marks: number | null; isAbsent: boolean; remarks: string | null }>;
}

function MarksTab({ examId }: { examId: string }) {
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects'], { mine: true });
  const sections = allSectionOptions(lk);
  const [sectionId, setSectionId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  const { role, me } = useApp();
  const found = findSection(lk, sectionId);
  const classId = found?.cls.id;
  // Teachers enter marks only for subjects they teach here (any subject as class teacher), so list just those.
  const restrict = role === 'TEACHER' && !!found && found.section.classTeacherId !== me.user.employeeId;
  const { data: allocation } = useApiQuery<Array<{ subjectId: string; employeeId: string | null }>>(restrict ? `/api/sections/${sectionId}/teachers` : null);
  const mine = restrict ? new Set((allocation ?? []).filter((a) => a.employeeId === me.user.employeeId).map((a) => a.subjectId)) : null;
  const subjects = subjectOptions(lk, classId).filter((s) => !mine || mine.has(s.value));
  React.useEffect(() => {
    if (subjects.length && !subjects.some((s) => s.value === subjectId)) setSubjectId(subjects[0].value);
  }, [subjects, subjectId]);
  const { data, isLoading, error, refetch } = useApiQuery<MarksSheet>(sectionId && subjectId ? `/api/exams/${examId}/marks` : null, { sectionId, subjectId }, { retry: false });
  const [draft, setDraft] = React.useState<Record<string, { marks: string; isAbsent: boolean }>>({});
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.rows.map((r) => [r.studentId, { marks: r.marks === null ? '' : String(r.marks), isAbsent: r.isAbsent }])));
  }, [data]);
  const over = data ? Object.values(draft).some((d) => !d.isAbsent && d.marks !== '' && Number(d.marks) > data.maxMarks) : false;
  const entered = Object.values(draft).filter((d) => d.isAbsent || d.marks !== '').length;

  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <Field label="Section" className="w-44">
          <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} />
        </Field>
        <Field label="Subject" className="w-48">
          <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjects} />
        </Field>
        {data && (
          <div className="ml-auto flex items-center gap-2 text-xs">
            <Badge>Max {data.maxMarks}</Badge>
            <Badge>Pass {data.passMarks}</Badge>
            <Badge tone={entered === data.rows.length ? 'success' : 'warning'}>
              {entered}/{data.rows.length} entered
            </Badge>
          </div>
        )}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <EmptyState title="Can’t enter marks here" description={error.message} />
      ) : !data ? (
        <EmptyState title="Choose a section and subject" />
      ) : (
        <>
          {data.locked && <p className="border-b border-line bg-amber-50 px-5 py-2 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">Results are published — marks are read-only for teachers.</p>}
          <ul className="divide-y divide-line">
            {data.rows.map((r, i) => {
              const d = draft[r.studentId] ?? { marks: '', isAbsent: false };
              const bad = !d.isAbsent && d.marks !== '' && Number(d.marks) > data.maxMarks;
              const fail = !d.isAbsent && d.marks !== '' && Number(d.marks) < data.passMarks;
              return (
                <li key={r.studentId} className="flex items-center gap-3 px-5 py-2">
                  <span className="w-8 text-right text-xs text-ink-faint">{r.rollNo ?? i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{r.name}</span>
                  <Input
                    data-row={i}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={data.maxMarks}
                    step="0.5"
                    disabled={d.isAbsent || data.locked}
                    value={d.marks}
                    aria-label={`Marks for ${r.name}`}
                    invalid={bad}
                    className={cn('h-9 w-24 text-right', fail && 'text-rose-600')}
                    onChange={(e) => setDraft((s) => ({ ...s, [r.studentId]: { ...d, marks: e.target.value } }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        (document.querySelector(`[data-row="${i + 1}"]`) as HTMLInputElement | null)?.focus();
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        (document.querySelector(`[data-row="${i - 1}"]`) as HTMLInputElement | null)?.focus();
                      }
                    }}
                  />
                  <span className="w-10 text-xs text-ink-faint">/ {data.maxMarks}</span>
                  <label className="flex items-center gap-1.5 text-xs">
                    <Checkbox disabled={data.locked} checked={d.isAbsent} onCheckedChange={(v) => setDraft((s) => ({ ...s, [r.studentId]: { marks: v ? '' : d.marks, isAbsent: !!v } }))} /> Absent
                  </label>
                </li>
              );
            })}
          </ul>
          {!data.locked && (
            <div className="sticky bottom-0 flex items-center justify-between border-t border-line bg-surface/95 px-5 py-3 backdrop-blur">
              <span className="text-xs text-ink-soft">{over ? <span className="text-rose-600">Some marks exceed the maximum.</span> : 'Tip: press Enter to move to the next student.'}</span>
              <Button
                loading={saving}
                disabled={over}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const entries = Object.entries(draft)
                      .filter(([, v]) => v.isAbsent || v.marks !== '')
                      .map(([studentId, v]) => ({ studentId, marks: v.isAbsent ? null : Number(v.marks), isAbsent: v.isAbsent }));
                    if (!entries.length) return toast.error('Enter at least one mark');
                    await api(`/api/exams/${examId}/marks`, { method: 'PUT', body: { sectionId, subjectId, entries } });
                    toast.success(`Saved ${entries.length} marks`);
                    refetch();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save /> Save marks
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
}

interface ResultSheet {
  classLabel: string;
  subjects: Array<{ id: string; name: string; maxMarks: number }>;
  results: Array<{ studentId: string; name: string; rollNo: string | null; admissionNo: string; sectionName: string; subjects: Array<{ subjectId: string; marks: number | null; isAbsent: boolean; passed: boolean; grade: string | null }>; totalObtained: number; totalMax: number; percentage: number; grade: string | null; result: string; rank: number | null }>;
  summary: { students: number; passed: number; failed: number; incomplete: number; average: number | null; topper: string | null; subjectAverages: Array<{ subject: string; average: number | null }> };
}

function ResultsTab({ exam }: { exam: Exam }) {
  const { role, can } = useApp();
  const invalidate = useInvalidate();
  const confirm = useConfirm();
  const { data: lk } = useLookups(['classes'], { mine: true });
  const sections = allSectionOptions(lk);
  const [sectionId, setSectionId] = React.useState('');
  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  const { data, isLoading } = useApiQuery<ResultSheet>(sectionId ? `/api/exams/${exam.id}/results` : null, { sectionId });
  const canPublish = (role === 'SUPER_ADMIN' || role === 'ADMIN') && can('exams', 'edit');

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <Select className="w-44" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} />
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!data} onClick={() => window.open(`/print/report-card?examIds=${exam.id}&sectionId=${sectionId}`, '_blank')}>
              <Printer /> Report cards (section)
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={!data}
              onClick={() =>
                downloadCsv(`${exam.name}-${data!.classLabel}`, data!.results.map((r) => ({ Roll: r.rollNo ?? '', Name: r.name, ...Object.fromEntries(data!.subjects.map((s) => { const m = r.subjects.find((x) => x.subjectId === s.id); return [s.name, m?.isAbsent ? 'AB' : m?.marks ?? '']; })), Total: r.totalObtained, '%': r.percentage, Grade: r.grade ?? '', Result: r.result, Rank: r.rank ?? '' })))
              }
            >
              <Download /> Result sheet
            </Button>
            {canPublish && (
              <Button
                size="sm"
                variant={exam.isPublished ? 'danger-soft' : 'primary'}
                onClick={async () => {
                  const publish = !exam.isPublished;
                  if (!(await confirm({ title: publish ? `Publish ${exam.name} results?` : 'Withhold results?', description: publish ? 'Parents and students will be notified and can download report cards.' : 'Results will be hidden from parents and students.', confirmLabel: publish ? 'Publish' : 'Withhold', tone: publish ? 'primary' : 'danger' }))) return;
                  await api(`/api/exams/${exam.id}/publish`, { method: 'POST', body: { publish } });
                  toast.success(publish ? 'Results published' : 'Results withheld');
                  invalidate(['/api/exams']);
                }}
              >
                {exam.isPublished ? <><EyeOff /> Withhold</> : <><Eye /> Publish results</>}
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Students" value={data.summary.students} icon={Users} hint={data.summary.incomplete ? `${data.summary.incomplete} incomplete` : 'All marks entered'} />
            <StatCard label="Passed" value={data.summary.passed} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Failed" value={data.summary.failed} icon={XCircle} tone="rose" />
            <StatCard label="Class average" value={data.summary.average === null ? '—' : `${data.summary.average}%`} icon={Percent} tone="violet" hint={data.summary.topper ? `Topper: ${data.summary.topper}` : undefined} />
          </div>
          <Card>
            <CardHeader title="Subject-wise average %" />
            <CardBody>
              <BarsChart data={data.summary.subjectAverages.map((s) => ({ subject: s.subject, average: s.average ?? 0 }))} xKey="subject" series={[{ key: 'average', label: 'Average %' }]} height={220} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title={`Result sheet · ${data.classLabel}`} />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                    <th className="sticky left-0 bg-surface px-3 py-2">Student</th>
                    {data.subjects.map((s) => (
                      <th key={s.id} className="whitespace-nowrap px-3 py-2 text-center">
                        {s.name}
                        <br />
                        <span className="font-normal normal-case">/{s.maxMarks}</span>
                      </th>
                    ))}
                    <th className="px-3 py-2 text-center">Total</th>
                    <th className="px-3 py-2 text-center">%</th>
                    <th className="px-3 py-2 text-center">Grade</th>
                    <th className="px-3 py-2 text-center">Rank</th>
                    <th className="px-3 py-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((r) => (
                    <tr key={r.studentId} className="border-b border-line/60">
                      <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-2">
                        <Link href={`/students/${r.studentId}`} className="font-medium hover:underline">
                          {r.name}
                        </Link>
                        <span className="ml-1.5 text-xs text-ink-faint">{r.rollNo}</span>
                      </td>
                      {data.subjects.map((s) => {
                        const m = r.subjects.find((x) => x.subjectId === s.id);
                        return (
                          <td key={s.id} className={cn('px-3 py-2 text-center', m && !m.passed && (m.marks !== null || m.isAbsent) && 'font-semibold text-rose-600')}>
                            {m?.isAbsent ? 'AB' : m?.marks ?? <span className="text-ink-faint">—</span>}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center font-semibold">{r.totalObtained}</td>
                      <td className="px-3 py-2 text-center">{r.percentage}</td>
                      <td className="px-3 py-2 text-center">{r.grade && <Badge tone="brand">{r.grade}</Badge>}</td>
                      <td className="px-3 py-2 text-center">{r.rank ?? '—'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.result} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { can, isFamily } = useApp();
  // The section result sheet and marks entry are staff screens; families see results on /exams.
  React.useEffect(() => {
    if (isFamily) router.replace('/exams');
  }, [isFamily, router]);
  const { data: exams } = useApiQuery<Exam[]>(isFamily ? null : '/api/exams');
  const exam = exams?.find((e) => e.id === id);
  const tabs = [
    ...(can('exams', 'edit') ? [{ value: 'setup', label: <><CalendarRange className="size-4" /> Date sheet</> }, { value: 'marks', label: <><ClipboardList className="size-4" /> Marks entry</> }] : []),
    { value: 'results', label: <><FileBarChart className="size-4" /> Results</> },
  ];
  const tab = tabs.some((t) => t.value === params.get('tab')) ? params.get('tab')! : tabs[0].value;
  if (!exam) return <LoadingBlock />;
  return (
    <>
      <Link href="/exams" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Exams
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
          <Award className="size-5" />
        </span>
        <div>
          <h1 className="text-xl font-bold">{exam.name}</h1>
          <p className="text-sm text-ink-soft">
            {formatDate(exam.startDate)} – {formatDate(exam.endDate)}
          </p>
        </div>
        {exam.isPublished ? <Badge tone="success" dot>Published</Badge> : <Badge tone="warning" dot>Draft</Badge>}
      </div>
      <Tabs value={tab} onValueChange={(v) => router.replace(`/exams/${id}?tab=${v}`, { scroll: false })} tabs={tabs}>
        <TabPanel value="setup">
          <SetupTab examId={id} />
        </TabPanel>
        <TabPanel value="marks">
          <MarksTab examId={id} />
        </TabPanel>
        <TabPanel value="results">
          <ResultsTab exam={exam} />
        </TabPanel>
      </Tabs>
    </>
  );
}
