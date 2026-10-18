'use client';

import * as React from 'react';
import { CheckCircle2, Clock, Eye, MonitorCheck, Play, Plus, Send, Trash2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, sectionOptions, subjectOptions, useLookups } from '@/lib/lookups';
import { cn, downloadCsv, formatDateTime } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface ExamRow {
  id: string;
  title: string;
  instructions: string | null;
  classLabel: string;
  subjectName: string;
  startsAt: string;
  endsAt: string;
  durationMins: number;
  totalMarks: number;
  negativeMarks: number;
  status: 'DRAFT' | 'PUBLISHED';
  resultsPublished: boolean;
  createdByName: string;
  questionCount: number;
  window: 'UPCOMING' | 'LIVE' | 'CLOSED';
  _count: { attempts: number };
  attempts?: Array<{ studentId: string; status: string; score: number | null; submittedAt: string | null; deadline: string }>;
}
interface StudentQ {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'FILL_BLANK' | 'SHORT' | 'LONG';
  text: string;
  options: string[];
  marks: number;
}

const WINDOW = { UPCOMING: { label: 'Upcoming', tone: 'info' as const }, LIVE: { label: 'Live now', tone: 'success' as const }, CLOSED: { label: 'Closed', tone: 'neutral' as const } };
const TYPE = { MCQ: 'Multiple choice', TRUE_FALSE: 'True / false', FILL_BLANK: 'Fill in the blank', SHORT: 'Short answer', LONG: 'Long answer' };

export default function OnlineExamsPage() {
  const { role, isFamily } = useApp();
  if (role === 'STUDENT') return <StudentExams />;
  if (isFamily) return <ParentExams />;
  return <StaffExams />;
}

// --------------------------------------------------------------------------- staff

function StaffExams() {
  const { can } = useApp();
  const [creating, setCreating] = React.useState(false);
  const [open, setOpen] = React.useState<ExamRow | null>(null);
  const { data, isLoading } = useApiQuery<ExamRow[]>('/api/online-exams');
  return (
    <>
      <PageHeader
        title="Online Exams"
        description="Timed tests from the question bank. Objective answers are marked instantly; you mark written answers."
        icon={MonitorCheck}
        actions={
          can('online_exams', 'create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New online exam
            </Button>
          )
        }
      />
      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={MonitorCheck} title="No online exams yet" description="Add questions to the question bank, then create a timed exam for a class or section." />
        ) : (
          <DataTable<ExamRow>
            data={data}
            onRowClick={setOpen}
            columns={[
              { accessorKey: 'title', header: 'Exam', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-ink-faint">{row.original.subjectName} · {row.original.classLabel}</p></div> },
              { accessorKey: 'startsAt', header: 'Window', cell: ({ row }) => <div className="text-xs"><p>{formatDateTime(row.original.startsAt)}</p><p className="text-ink-faint">to {formatDateTime(row.original.endsAt)} · {row.original.durationMins} min</p></div> },
              { id: 'q', header: 'Questions', cell: ({ row }) => `${row.original.questionCount} · ${row.original.totalMarks} marks` },
              { id: 'state', header: 'State', cell: ({ row }) => (row.original.status === 'DRAFT' ? <Badge>Draft</Badge> : <Badge tone={WINDOW[row.original.window].tone}>{WINDOW[row.original.window].label}</Badge>) },
              { id: 'att', header: 'Attempts', cell: ({ row }) => <span>{row.original._count.attempts}{row.original.resultsPublished && <Badge tone="success" className="ml-2">Results out</Badge>}</span> },
            ]}
          />
        )}
      </Card>
      <CreateExam open={creating} onOpenChange={setCreating} />
      {open && <ExamDetail id={open.id} onClose={() => setOpen(null)} />}
    </>
  );
}

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function CreateExam({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes', 'subjects']);
  const [v, setV] = React.useState({ title: '', instructions: '', classId: '', sectionId: '', subjectId: '', startsAt: '', endsAt: '', durationMins: '30', negativeMarks: '0', shuffle: true });
  const [picked, setPicked] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const { data: bank } = useApiQuery<Array<{ id: string; type: keyof typeof TYPE; text: string; marks: number; difficulty: string }>>(open && v.classId && v.subjectId ? '/api/questions' : null, { classId: v.classId, subjectId: v.subjectId });
  React.useEffect(() => {
    if (!open) return;
    const s = new Date(Date.now() + 24 * 3600_000);
    s.setHours(10, 0, 0, 0);
    setV({ title: '', instructions: 'Read every question carefully. Your answers are saved automatically. The test submits itself when time is up.', classId: '', sectionId: '', subjectId: '', startsAt: localInput(s), endsAt: localInput(new Date(s.getTime() + 2 * 3600_000)), durationMins: '30', negativeMarks: '0', shuffle: true });
    setPicked([]);
  }, [open]);
  React.useEffect(() => setPicked([]), [v.classId, v.subjectId]);
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  const total = (bank ?? []).filter((q) => picked.includes(q.id)).reduce((a, q) => a + Number(q.marks), 0);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New online exam"
      description="Saved as a draft. Publish it to tell students and parents."
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={v.title.trim().length < 3 || !v.classId || !v.subjectId || !picked.length}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/online-exams', { method: 'POST', body: { ...v, sectionId: v.sectionId || null, startsAt: new Date(v.startsAt).toISOString(), endsAt: new Date(v.endsAt).toISOString(), durationMins: Number(v.durationMins), negativeMarks: Number(v.negativeMarks), questionIds: picked } });
                toast.success('Exam saved as draft');
                invalidate(['/api/online-exams']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save draft ({picked.length} questions · {total} marks)
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title" required className="sm:col-span-2">
            <Input value={v.title} onChange={(e) => set('title', e.target.value)} placeholder="Unit test 3 — Trigonometry" />
          </Field>
          <Field label="Class" required>
            <Select value={v.classId} onChange={(e) => setV((s) => ({ ...s, classId: e.target.value, sectionId: '' }))} options={classOptions(lk)} placeholder="Choose…" />
          </Field>
          <Field label="Section">
            <Select value={v.sectionId} onChange={(e) => set('sectionId', e.target.value)} options={sectionOptions(lk, v.classId)} placeholder="All sections" />
          </Field>
          <Field label="Subject" required className="sm:col-span-2">
            <Select value={v.subjectId} onChange={(e) => set('subjectId', e.target.value)} options={subjectOptions(lk)} placeholder="Choose…" />
          </Field>
          <Field label="Opens" required>
            <Input type="datetime-local" value={v.startsAt} onChange={(e) => set('startsAt', e.target.value)} />
          </Field>
          <Field label="Closes" required>
            <Input type="datetime-local" value={v.endsAt} onChange={(e) => set('endsAt', e.target.value)} />
          </Field>
          <Field label="Duration (minutes)" required>
            <Input type="number" min={5} max={360} value={v.durationMins} onChange={(e) => set('durationMins', e.target.value)} />
          </Field>
          <Field label="Negative marks per wrong answer">
            <Input type="number" min={0} max={10} step="0.25" value={v.negativeMarks} onChange={(e) => set('negativeMarks', e.target.value)} />
          </Field>
          <Field label="Instructions" className="sm:col-span-2">
            <Textarea rows={3} value={v.instructions} onChange={(e) => set('instructions', e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 text-sm sm:col-span-2">
            <Switch checked={v.shuffle} onCheckedChange={(c) => set('shuffle', c)} /> Shuffle question order for each student
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Questions from the bank</p>
          {!v.classId || !v.subjectId ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-faint">Choose a class and subject to see the question bank.</p>
          ) : !bank?.length ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-ink-faint">No questions for this class and subject yet. Add some under Question Papers.</p>
          ) : (
            <div className="max-h-[26rem] space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              <label className="flex items-center gap-2 border-b border-line px-1 pb-2 text-xs font-medium">
                <Checkbox checked={picked.length === bank.length} onCheckedChange={(c) => setPicked(c ? bank.map((q) => q.id) : [])} /> Select all ({bank.length})
              </label>
              {bank.map((q) => (
                <label key={q.id} className="flex items-start gap-2 rounded-lg px-1 py-1.5 text-sm hover:bg-canvas">
                  <Checkbox className="mt-0.5" checked={picked.includes(q.id)} onCheckedChange={(c) => setPicked((p) => (c ? [...p, q.id] : p.filter((x) => x !== q.id)))} />
                  <span className="flex-1">
                    <span className="line-clamp-2">{q.text}</span>
                    <span className="text-xs text-ink-faint">
                      {TYPE[q.type]} · {q.marks} marks · {q.difficulty.toLowerCase()}
                      {['SHORT', 'LONG'].includes(q.type) && ' · marked by you'}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
    </Dialog>
  );
}

interface Sheet {
  id: string;
  studentName: string;
  admissionNo: string;
  rollNo: string | null;
  status: string;
  submittedAt: string | null;
  autoScore: number | null;
  score: number | null;
  manualMarks: Record<string, number>;
  written: Record<string, string>;
}

function ExamDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [tab, setTab] = React.useState('sheets');
  const { data: exam } = useApiQuery<ExamRow & { preview: StudentQ[] }>(`/api/online-exams/${id}`);
  const { data: sheets } = useApiQuery<{ roster: number; totalMarks: number; descriptive: Array<{ id: string; text: string; marks: number; key: string | null }>; attempts: Sheet[] }>(`/api/online-exams/${id}/attempts`);
  const [marking, setMarking] = React.useState<Sheet | null>(null);
  const refresh = () => invalidate(['/api/online-exams']);
  const put = async (body: Record<string, unknown>, ok: string) => {
    try {
      await api(`/api/online-exams/${id}`, { method: 'PUT', body });
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (!exam) return null;
  const pending = (sheets?.attempts ?? []).filter((a) => a.status === 'SUBMITTED').length;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={exam.title}
      description={`${exam.subjectName} · ${exam.classLabel} · ${formatDateTime(exam.startsAt)} – ${formatDateTime(exam.endsAt)} · ${exam.durationMins} min · ${exam.totalMarks} marks`}
      size="2xl"
      footer={
        <>
          {can('online_exams', 'delete') && (
            <Button
              variant="danger-soft"
              onClick={async () => {
                if (!(await confirm({ title: `Delete "${exam.title}"?`, description: 'Answer sheets are deleted too.', confirmLabel: 'Delete' }))) return;
                try {
                  await api(`/api/online-exams/${id}`, { method: 'DELETE' });
                  refresh();
                  onClose();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <Trash2 /> Delete
            </Button>
          )}
          {can('online_exams', 'edit') && exam.status === 'DRAFT' && <Button onClick={() => put({ status: 'PUBLISHED' }, 'Published — students and parents notified')}><Send /> Publish</Button>}
          {can('online_exams', 'edit') && exam.status === 'PUBLISHED' && !exam._count.attempts && <Button variant="secondary" onClick={() => put({ status: 'DRAFT' }, 'Back to draft')}>Unpublish</Button>}
          {can('online_exams', 'edit') && exam.status === 'PUBLISHED' && (
            <Button variant={exam.resultsPublished ? 'secondary' : 'success'} disabled={!exam.resultsPublished && pending > 0} onClick={() => put({ resultsPublished: !exam.resultsPublished }, exam.resultsPublished ? 'Results hidden' : 'Results published')}>
              {exam.resultsPublished ? 'Hide results' : pending ? `Mark ${pending} sheet(s) first` : <><CheckCircle2 /> Publish results</>}
            </Button>
          )}
        </>
      }
    >
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'sheets', label: 'Answer sheets', count: sheets?.attempts.length }, { value: 'paper', label: 'Paper', count: exam.preview.length }]}>
        <TabPanel value="sheets">
          {!sheets ? (
            <LoadingBlock />
          ) : (
            <>
              <div className="mb-3 flex items-center gap-3 text-sm text-ink-soft">
                <span>
                  {sheets.attempts.length} of {sheets.roster} students attempted
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  className="ml-auto"
                  disabled={!sheets.attempts.length}
                  onClick={() => downloadCsv(`online-exam-${exam.title}`, sheets.attempts.map((a) => ({ Student: a.studentName, 'Adm. no.': a.admissionNo, Roll: a.rollNo ?? '', Status: a.status, 'Auto marks': a.autoScore ?? '', Score: a.score ?? '', 'Out of': sheets.totalMarks, Submitted: a.submittedAt ? formatDateTime(a.submittedAt) : '' })))}
                >
                  Export
                </Button>
              </div>
              {!sheets.attempts.length ? (
                <EmptyState icon={MonitorCheck} title="No attempts yet" />
              ) : (
                <DataTable<Sheet>
                  data={sheets.attempts}
                  columns={[
                    { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p className="font-medium">{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.admissionNo}{row.original.rollNo ? ` · roll ${row.original.rollNo}` : ''}</p></div> },
                    { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'GRADED' ? 'COMPLETED' : row.original.status === 'SUBMITTED' ? 'PENDING' : 'APPLIED'} label={row.original.status === 'GRADED' ? 'Marked' : row.original.status === 'SUBMITTED' ? 'Needs marking' : 'Writing'} /> },
                    { id: 'score', header: 'Score', cell: ({ row }) => (row.original.score !== null ? <b>{row.original.score} / {sheets.totalMarks}</b> : row.original.autoScore !== null ? <span className="text-ink-soft">{row.original.autoScore} auto + written</span> : '—') },
                    { id: 'a', header: '', cell: ({ row }) => (sheets.descriptive.length && row.original.status !== 'IN_PROGRESS' && can('online_exams', 'edit') ? <Button size="sm" variant="ghost" onClick={() => setMarking(row.original)}>Mark written answers</Button> : null) },
                  ]}
                />
              )}
            </>
          )}
        </TabPanel>
        <TabPanel value="paper">
          <ol className="space-y-3">
            {exam.preview.map((q, i) => (
              <li key={q.id} className="rounded-xl border border-line p-3 text-sm">
                <p>
                  <b>Q{i + 1}.</b> {q.text} <span className="text-xs text-ink-faint">({q.marks} marks · {TYPE[q.type]})</span>
                </p>
                {q.options.length > 0 && (
                  <ol className="ml-6 mt-1 list-[upper-alpha] text-ink-soft">
                    {q.options.map((o) => (
                      <li key={o}>{o}</li>
                    ))}
                  </ol>
                )}
              </li>
            ))}
          </ol>
        </TabPanel>
      </Tabs>
      {marking && sheets && <MarkSheet examId={id} sheet={marking} questions={sheets.descriptive} onClose={() => setMarking(null)} />}
    </Dialog>
  );
}

function MarkSheet({ examId, sheet, questions, onClose }: { examId: string; sheet: Sheet; questions: Array<{ id: string; text: string; marks: number; key: string | null }>; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [marks, setMarks] = React.useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, sheet.manualMarks[q.id] !== undefined ? String(sheet.manualMarks[q.id]) : sheet.written[q.id]?.trim() ? '' : '0'])));
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Mark · ${sheet.studentName}`}
      description={`Objective questions: ${sheet.autoScore ?? 0} marks (auto-marked)`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const body = Object.fromEntries(Object.entries(marks).filter(([, v]) => v !== '').map(([k, v]) => [k, Number(v)]));
                await api(`/api/online-exams/${examId}/attempts`, { method: 'PATCH', body: { attemptId: sheet.id, marks: body } });
                toast.success('Marks saved');
                invalidate(['/api/online-exams']);
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Save marks
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id} className="rounded-xl border border-line p-3">
            <p className="text-sm font-medium">
              {i + 1}. {q.text} <span className="text-xs text-ink-faint">(max {q.marks})</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-lg bg-canvas px-3 py-2 text-sm">{sheet.written[q.id]?.trim() || <span className="italic text-ink-faint">Not answered</span>}</p>
            {q.key && <p className="mt-1 text-xs text-ink-faint">Marking scheme: {q.key}</p>}
            <Input className="mt-2 w-28" type="number" min={0} max={q.marks} step="0.5" value={marks[q.id]} onChange={(e) => setMarks((m) => ({ ...m, [q.id]: e.target.value }))} aria-label={`Marks for question ${i + 1}`} />
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// --------------------------------------------------------------------------- student

function StudentExams() {
  const { me } = useApp();
  const invalidate = useInvalidate();
  const [taking, setTaking] = React.useState<ExamRow | null>(null);
  const [review, setReview] = React.useState<ExamRow | null>(null);
  const { data, isLoading } = useApiQuery<ExamRow[]>('/api/online-exams');
  if (taking) return <TakeExam exam={taking} onDone={() => { setTaking(null); invalidate(['/api/online-exams']); }} />;
  return (
    <>
      <PageHeader title="Online Exams" description="Your timed online tests." icon={MonitorCheck} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card><EmptyState icon={MonitorCheck} title="No online exams" description="Exams set by your teachers appear here." /></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.map((e) => {
            const a = e.attempts?.find((x) => x.studentId === me.user.studentId);
            const inProgress = a?.status === 'IN_PROGRESS';
            return (
              <Card key={e.id}>
                <CardBody>
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      <p className="font-semibold">{e.title}</p>
                      <p className="text-xs text-ink-faint">{e.subjectName} · {e.questionCount} questions · {e.totalMarks} marks · {e.durationMins} min</p>
                    </div>
                    <Badge tone={WINDOW[e.window].tone}>{WINDOW[e.window].label}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-ink-soft">
                    <Clock className="mr-1 inline size-3.5" /> {formatDateTime(e.startsAt)} – {formatDateTime(e.endsAt)}
                  </p>
                  {e.negativeMarks > 0 && <p className="mt-1 text-xs text-rose-600">−{e.negativeMarks} for each wrong objective answer</p>}
                  <div className="mt-4 flex items-center gap-2">
                    {a && !inProgress && <StatusBadge status="COMPLETED" label={e.resultsPublished && a.score !== null ? `Score ${a.score} / ${e.totalMarks}` : 'Submitted'} />}
                    {(!a || inProgress) && e.window === 'LIVE' && (
                      <Button onClick={() => setTaking(e)}>
                        <Play /> {inProgress ? 'Resume' : 'Start exam'}
                      </Button>
                    )}
                    {a && !inProgress && e.resultsPublished && (
                      <Button variant="secondary" onClick={() => setReview(e)}>
                        <Eye /> See answers
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      {review && <ReviewDialog exam={review} onClose={() => setReview(null)} />}
    </>
  );
}

function TakeExam({ exam, onDone }: { exam: ExamRow; onDone: () => void }) {
  const confirm = useConfirm();
  const [state, setState] = React.useState<{ deadline: string; questions: StudentQ[] } | null>(null);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [current, setCurrent] = React.useState(0);
  const [now, setNow] = React.useState(Date.now());
  const [submitting, setSubmitting] = React.useState(false);
  const dirty = React.useRef<Record<string, string>>({});
  const submitted = React.useRef(false);

  React.useEffect(() => {
    (async () => {
      try {
        await api(`/api/online-exams/${exam.id}/attempt`, { method: 'POST', body: {} });
        const r = await api<{ attempt: { deadline: string; answers: Record<string, string> }; questions: StudentQ[] }>(`/api/online-exams/${exam.id}/attempt`);
        if (!r.questions) throw new Error('This attempt has ended.');
        setAnswers(r.attempt.answers ?? {});
        setState({ deadline: r.attempt.deadline, questions: r.questions });
      } catch (e) {
        toast.error((e as Error).message);
        onDone();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.id]);

  const flush = React.useCallback(async () => {
    const batch = dirty.current;
    if (!Object.keys(batch).length) return;
    dirty.current = {};
    try {
      await api(`/api/online-exams/${exam.id}/attempt`, { method: 'PUT', body: { answers: batch } });
    } catch {
      dirty.current = { ...batch, ...dirty.current };
    }
  }, [exam.id]);

  const submit = React.useCallback(
    async (auto = false) => {
      if (submitted.current) return;
      submitted.current = true;
      setSubmitting(true);
      try {
        await api(`/api/online-exams/${exam.id}/attempt`, { method: 'PATCH', body: { answers } });
        toast.success(auto ? 'Time is up — your answers were submitted' : 'Exam submitted');
      } catch (e) {
        toast.error((e as Error).message);
      }
      onDone();
    },
    [answers, exam.id, onDone]
  );

  React.useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const s = setInterval(() => void flush(), 15_000);
    return () => {
      clearInterval(t);
      clearInterval(s);
    };
  }, [flush]);

  const left = state ? Math.max(0, new Date(state.deadline).getTime() - now) : 0;
  React.useEffect(() => {
    if (state && left === 0) void submit(true);
  }, [left, state, submit]);

  if (!state) return <LoadingBlock label="Starting exam…" />;
  const q = state.questions[current];
  const set = (val: string) => {
    setAnswers((a) => ({ ...a, [q.id]: val }));
    dirty.current[q.id] = val;
  };
  const mm = Math.floor(left / 60000);
  const ss = Math.floor((left % 60000) / 1000);
  const answered = state.questions.filter((x) => answers[x.id]?.trim()).length;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="sticky top-16 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm">
        <p className="min-w-0 flex-1 truncate font-semibold">{exam.title}</p>
        <span className="text-sm text-ink-soft">{answered}/{state.questions.length} answered</span>
        <span className={cn('rounded-lg px-3 py-1 font-mono text-lg font-bold', left < 60_000 ? 'bg-rose-100 text-rose-700' : 'bg-canvas')} aria-live="polite">
          {String(mm).padStart(2, '0')}:{String(ss).padStart(2, '0')}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {state.questions.map((x, i) => (
          <button key={x.id} type="button" onClick={() => setCurrent(i)} className={cn('size-8 rounded-lg border text-xs font-semibold', i === current ? 'border-brand-500 bg-brand-600 text-white' : answers[x.id]?.trim() ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-line')} aria-label={`Question ${i + 1}`}>
            {i + 1}
          </button>
        ))}
      </div>
      <Card>
        <CardBody>
          <p className="text-xs text-ink-faint">
            Question {current + 1} of {state.questions.length} · {q.marks} marks · {TYPE[q.type]}
          </p>
          <p className="mt-2 whitespace-pre-wrap text-base font-medium">{q.text}</p>
          <div className="mt-4">
            {q.type === 'MCQ' || q.type === 'TRUE_FALSE' ? (
              <div className="space-y-2">
                {q.options.map((o, i) => {
                  const val = q.type === 'MCQ' ? String(i) : o;
                  const on = answers[q.id] === val;
                  return (
                    <button key={o} type="button" onClick={() => set(val)} className={cn('flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm', on ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-line hover:border-brand-300')}>
                      <span className={cn('flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold', on ? 'border-brand-600 bg-brand-600 text-white' : 'border-line')}>{q.type === 'MCQ' ? String.fromCharCode(65 + i) : ''}</span>
                      {o}
                    </button>
                  );
                })}
              </div>
            ) : q.type === 'FILL_BLANK' || q.type === 'SHORT' ? (
              <Input value={answers[q.id] ?? ''} onChange={(e) => set(e.target.value)} placeholder="Your answer" />
            ) : (
              <Textarea rows={8} value={answers[q.id] ?? ''} onChange={(e) => set(e.target.value)} placeholder="Your answer" />
            )}
          </div>
          <div className="mt-6 flex justify-between">
            <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
              Previous
            </Button>
            {current < state.questions.length - 1 ? (
              <Button onClick={() => { void flush(); setCurrent((c) => c + 1); }}>Next</Button>
            ) : (
              <Button
                variant="success"
                loading={submitting}
                onClick={async () => {
                  if (await confirm({ title: 'Submit the exam?', description: `${answered} of ${state.questions.length} questions answered. You cannot change answers after submitting.`, confirmLabel: 'Submit' })) void submit();
                }}
              >
                <Send /> Submit
              </Button>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function ReviewDialog({ exam, onClose, studentId }: { exam: ExamRow; onClose: () => void; studentId?: string }) {
  const { data } = useApiQuery<{ attempt: { score: number | null; totalMarks: number } | null; review?: Array<StudentQ & { given: string | null; correct: boolean | null; awarded: number | null; key: string | null; keyIndex: number | null }> }>(`/api/online-exams/${exam.id}/attempt`, studentId ? { studentId } : undefined);
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={exam.title} description={data?.attempt ? `Score ${data.attempt.score ?? '—'} / ${data.attempt.totalMarks}` : undefined} size="lg">
      {!data?.review ? (
        <LoadingBlock />
      ) : (
        <ol className="space-y-3">
          {data.review.map((q, i) => (
            <li key={q.id} className="rounded-xl border border-line p-3 text-sm">
              <p className="flex items-start gap-2">
                {q.correct === true ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-500" /> : q.correct === false ? <XCircle className="mt-0.5 size-4 shrink-0 text-rose-500" /> : <Clock className="mt-0.5 size-4 shrink-0 text-ink-faint" />}
                <span className="flex-1">
                  <b>Q{i + 1}.</b> {q.text}
                </span>
                <span className="text-xs text-ink-faint">
                  {q.awarded ?? '—'} / {q.marks}
                </span>
              </p>
              {q.type === 'MCQ' ? (
                <ol className="ml-6 mt-1 list-[upper-alpha]">
                  {q.options.map((o, k) => (
                    <li key={o} className={cn(k === q.keyIndex && 'font-semibold text-emerald-700', String(k) === q.given && k !== q.keyIndex && 'text-rose-600 line-through')}>
                      {o}
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="ml-6 mt-1 space-y-0.5 text-ink-soft">
                  <p>Your answer: {q.given || <i>not answered</i>}</p>
                  {q.key && <p className="text-emerald-700">Answer: {q.key}</p>}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Dialog>
  );
}

// --------------------------------------------------------------------------- parent

function ParentExams() {
  const child = useFocusChild();
  const [review, setReview] = React.useState<ExamRow | null>(null);
  const { data, isLoading } = useApiQuery<ExamRow[]>('/api/online-exams');
  const rows = data ?? [];
  return (
    <>
      <PageHeader title="Online Exams" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={MonitorCheck} />
      {isLoading ? (
        <LoadingBlock />
      ) : !rows.length ? (
        <Card><EmptyState icon={MonitorCheck} title="No online exams" /></Card>
      ) : (
        <Card>
          <DataTable<ExamRow>
            data={rows}
            columns={[
              { accessorKey: 'title', header: 'Exam', cell: ({ row }) => <div><p className="font-medium">{row.original.title}</p><p className="text-xs text-ink-faint">{row.original.subjectName}</p></div> },
              { accessorKey: 'startsAt', header: 'When', cell: ({ row }) => formatDateTime(row.original.startsAt) },
              {
                id: 'status',
                header: 'Your child',
                cell: ({ row }) => {
                  const a = row.original.attempts?.find((x) => x.studentId === child?.id);
                  if (!a) return row.original.window === 'CLOSED' ? <Badge tone="danger">Not attempted</Badge> : <Badge tone={WINDOW[row.original.window].tone}>{WINDOW[row.original.window].label}</Badge>;
                  return a.score !== null && row.original.resultsPublished ? <b>{a.score} / {row.original.totalMarks}</b> : <StatusBadge status="COMPLETED" label="Submitted" />;
                },
              },
              { id: 'a', header: '', cell: ({ row }) => (row.original.resultsPublished && row.original.attempts?.some((x) => x.studentId === child?.id) ? <Button size="sm" variant="ghost" onClick={() => setReview(row.original)}><Eye /> Answers</Button> : null) },
            ]}
          />
        </Card>
      )}
      {review && child && <ReviewDialog exam={review} studentId={child.id} onClose={() => setReview(null)} />}
    </>
  );
}
