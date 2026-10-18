'use client';

import * as React from 'react';
import Link from 'next/link';
import { Award, CalendarRange, CheckCircle2, ClipboardList, FileBarChart, Plus, Printer, Scale, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { cn, formatDate } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { Checkbox, Field, Input } from '@/components/ui/form';
import { Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { Gradebook, RemarksEntry } from './_components/gradebook';

interface ExamRow {
  id: string;
  name: string;
  term: string | null;
  startDate: string;
  endDate: string;
  isPublished: boolean;
  classCount: number;
  _count: { marks: number };
}

function ExamList() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<ExamRow[]>('/api/exams');
  const { data: lk } = useLookups(['classes']);
  const [open, setOpen] = React.useState(false);
  const [classIds, setClassIds] = React.useState<string[] | null>(null);

  return (
    <>
      {can('exams', 'create') && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus /> New exam
          </Button>
        </div>
      )}
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Award} title="No exams this session" description="Create a unit test, half-yearly or annual exam to start entering marks." />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((e) => (
            <Card key={e.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3 px-5 pt-5">
                <div>
                  <p className="text-base font-semibold">{e.name}</p>
                  <p className="text-xs text-ink-soft">
                    {formatDate(e.startDate)} – {formatDate(e.endDate)} {e.term ? `· ${e.term.replace('_', ' ')}` : ''}
                  </p>
                </div>
                {e.isPublished ? <Badge tone="success" dot>Published</Badge> : <Badge tone="warning" dot>Draft</Badge>}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 px-5 text-sm">
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-ink-faint">Classes</p>
                  <p className="font-semibold">{e.classCount}</p>
                </div>
                <div className="rounded-xl bg-canvas px-3 py-2">
                  <p className="text-xs text-ink-faint">Marks entered</p>
                  <p className="font-semibold">{e._count.marks}</p>
                </div>
              </div>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-line px-5 py-3 pt-3">
                <Button asChild size="sm" variant="soft">
                  <Link href={`/exams/${e.id}?tab=marks`}>
                    <ClipboardList /> Marks
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link href={`/exams/${e.id}?tab=results`}>
                    <FileBarChart /> Results
                  </Link>
                </Button>
                {can('exams', 'edit') && (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/exams/${e.id}?tab=setup`}>
                      <CalendarRange /> Date sheet
                    </Link>
                  </Button>
                )}
                {can('exams', 'delete') && e._count.marks === 0 && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete exam"
                    onClick={async () => {
                      if (!(await confirm({ title: `Delete ${e.name}?`, confirmLabel: 'Delete' }))) return;
                      try {
                        await api(`/api/exams/${e.id}`, { method: 'DELETE' });
                        invalidate(['/api/exams']);
                      } catch (err) {
                        toast.error((err as Error).message);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) setClassIds((lk?.classes ?? []).map((c) => c.id));
        }}
        title="New exam"
        fields={[
          { name: 'name', label: 'Exam name', required: true, placeholder: 'Half Yearly Examination', span: 2 },
          { name: 'term', label: 'Term', type: 'select', options: [{ value: 'TERM_1', label: 'Term 1' }, { value: 'TERM_2', label: 'Term 2' }, { value: 'ANNUAL', label: 'Annual' }, { value: 'PRE_BOARD', label: 'Pre-board' }] },
          { name: 'maxMarks', label: 'Default max marks per subject', type: 'number', required: true },
          { name: 'startDate', label: 'Start date', type: 'date', required: true },
          { name: 'endDate', label: 'End date', type: 'date', required: true },
        ]}
        initial={{ maxMarks: 100, term: 'TERM_1' }}
        onSubmit={async (v) => {
          await api('/api/exams', { method: 'POST', body: { ...v, classIds } });
          toast.success('Exam created — date sheet seeded from class subjects');
          invalidate(['/api/exams']);
        }}
      >
        <div className="mt-4">
          <p className="label">Classes taking this exam</p>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-line p-3 sm:grid-cols-4">
            {(lk?.classes ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={!!classIds?.includes(c.id)} onCheckedChange={(v) => setClassIds((ids) => (v ? [...(ids ?? []), c.id] : (ids ?? []).filter((x) => x !== c.id)))} /> {c.label}
              </label>
            ))}
          </div>
        </div>
      </FormDialog>
    </>
  );
}

interface GradeRow {
  grade: string;
  minPercent: number;
  maxPercent: number;
  gradePoint?: number | null;
  remark?: string | null;
  isPass: boolean;
}

function Grading() {
  const { can, role } = useApp();
  const invalidate = useInvalidate();
  const { data } = useApiQuery<{ grades: GradeRow[]; criteria: { overallPassPercent: number; subjectPassPercent: number; maxFailedSubjects: number; showRank: boolean } }>('/api/grades');
  const [grades, setGrades] = React.useState<GradeRow[]>([]);
  const [criteria, setCriteria] = React.useState({ overallPassPercent: 33, subjectPassPercent: 33, maxFailedSubjects: 0, showRank: true });
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) {
      setGrades([...data.grades].sort((a, b) => b.minPercent - a.minPercent));
      setCriteria(data.criteria);
    }
  }, [data]);
  const editable = role === 'SUPER_ADMIN' || role === 'ADMIN' || can('settings', 'edit');
  const upd = (i: number, p: Partial<GradeRow>) => setGrades((g) => g.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Card>
        <CardHeader title="Grading scale" description="Used on result sheets and report cards. Default follows the CBSE 8-point scale." icon={Scale} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2">Grade</th>
                <th className="px-4 py-2">From %</th>
                <th className="px-4 py-2">To %</th>
                <th className="px-4 py-2">Grade point</th>
                <th className="px-4 py-2">Remark</th>
                <th className="px-4 py-2">Pass</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g, i) => (
                <tr key={i} className="border-b border-line/60">
                  <td className="px-4 py-1.5"><Input className="h-8 w-16" disabled={!editable} value={g.grade} onChange={(e) => upd(i, { grade: e.target.value })} /></td>
                  <td className="px-4 py-1.5"><Input className="h-8 w-20" type="number" disabled={!editable} value={g.minPercent} onChange={(e) => upd(i, { minPercent: Number(e.target.value) })} /></td>
                  <td className="px-4 py-1.5"><Input className="h-8 w-20" type="number" disabled={!editable} value={g.maxPercent} onChange={(e) => upd(i, { maxPercent: Number(e.target.value) })} /></td>
                  <td className="px-4 py-1.5"><Input className="h-8 w-16" type="number" disabled={!editable} value={g.gradePoint ?? ''} onChange={(e) => upd(i, { gradePoint: e.target.value === '' ? null : Number(e.target.value) })} /></td>
                  <td className="px-4 py-1.5"><Input className="h-8 w-36" disabled={!editable} value={g.remark ?? ''} onChange={(e) => upd(i, { remark: e.target.value })} /></td>
                  <td className="px-4 py-1.5"><Checkbox disabled={!editable} checked={g.isPass} onCheckedChange={(v) => upd(i, { isPass: !!v })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <div className="flex justify-between border-t border-line px-5 py-3">
            <Button variant="ghost" size="sm" onClick={() => setGrades((g) => [...g, { grade: '', minPercent: 0, maxPercent: 0, isPass: true }])}>
              <Plus /> Add grade
            </Button>
          </div>
        )}
      </Card>
      <Card>
        <CardHeader title="Pass criteria" />
        <CardBody className="space-y-4">
          <Field label="Overall pass %">
            <Input type="number" disabled={!editable} value={criteria.overallPassPercent} onChange={(e) => setCriteria({ ...criteria, overallPassPercent: Number(e.target.value) })} />
          </Field>
          <Field label="Pass % in each subject">
            <Input type="number" disabled={!editable} value={criteria.subjectPassPercent} onChange={(e) => setCriteria({ ...criteria, subjectPassPercent: Number(e.target.value) })} />
          </Field>
          <Field label="Subjects a student may fail and still pass (compartment)">
            <Input type="number" disabled={!editable} value={criteria.maxFailedSubjects} onChange={(e) => setCriteria({ ...criteria, maxFailedSubjects: Number(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox disabled={!editable} checked={criteria.showRank} onCheckedChange={(v) => setCriteria({ ...criteria, showRank: !!v })} /> Show class rank on report cards
          </label>
          {editable && (
            <Button
              className="w-full"
              loading={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await api('/api/grades', { method: 'PUT', body: { grades: grades.filter((g) => g.grade), criteria } });
                  toast.success('Grading saved');
                  invalidate(['/api/grades', '/api/exams', '/api/me']);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save grading
            </Button>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

interface FamilyResult {
  exam: { id: string; name: string };
  subjects: Array<{ id: string; name: string; maxMarks: number }>;
  result: { totalObtained: number; totalMax: number; percentage: number; grade: string | null; remark: string | null; result: string; rank: number | null; subjects: Array<{ subjectId: string; subjectName: string; marks: number | null; maxMarks: number; isAbsent: boolean; passed: boolean; grade: string | null }> } | null;
  classSize: number;
  showRank: boolean;
}

function FamilyExam({ exam, studentId }: { exam: ExamRow; studentId: string }) {
  const { data } = useApiQuery<FamilyResult>(`/api/exams/${exam.id}/results`, { studentId });
  const r = data?.result;
  return (
    <Card>
      <CardHeader
        title={exam.name}
        icon={Award}
        description={r ? `${r.totalObtained}/${r.totalMax} · ${r.percentage}% · Grade ${r.grade ?? '—'}${data?.showRank && r.rank ? ` · Rank ${r.rank} of ${data.classSize}` : ''}` : 'Loading…'}
        actions={
          r && (
            <>
              <StatusBadge status={r.result} />
              <Button size="sm" variant="secondary" onClick={() => window.open(`/print/report-card?examIds=${exam.id}&studentId=${studentId}`, '_blank')}>
                <Printer /> Report card
              </Button>
            </>
          )
        }
      />
      {r && (
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
          {r.subjects.map((s) => (
            <div key={s.subjectId} className="flex items-center justify-between gap-3 bg-surface px-5 py-3">
              <span className="text-sm">{s.subjectName}</span>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-canvas">
                  <div className={cn('h-full rounded-full', s.passed ? 'bg-emerald-500' : 'bg-rose-500')} style={{ width: `${((s.marks ?? 0) / s.maxMarks) * 100}%` }} />
                </div>
                <span className={cn('w-16 text-right text-sm font-semibold', !s.passed && 'text-rose-600')}>{s.isAbsent ? 'AB' : `${s.marks}/${s.maxMarks}`}</span>
                {s.grade && <Badge tone="brand">{s.grade}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function FamilyExams() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<ExamRow[]>('/api/exams');
  if (!child) return <EmptyState title="No student linked" />;
  return (
    <>
      <PageHeader title="Results" description={`${child.name} · ${child.classLabel}`} icon={Award} />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={CheckCircle2} title="No results published yet" description="You’ll be notified when the school publishes results." />
        </Card>
      ) : (
        <div className="space-y-6">
          {[...data].reverse().map((e) => (
            <FamilyExam key={e.id} exam={e} studentId={child.id} />
          ))}
        </div>
      )}
    </>
  );
}

export default function ExamsPage() {
  const { isFamily, can } = useApp();
  const [tab, setTab] = React.useState('exams');
  if (isFamily) return <FamilyExams />;
  return (
    <>
      <PageHeader title="Exams & results" description="Exams, date sheets, marks entry, result sheets and report cards." icon={Award} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'exams', label: 'Exams' },
          { value: 'gradebook', label: 'Gradebook' },
          ...(can('exams', 'edit') ? [{ value: 'remarks', label: 'Report-card remarks' }] : []),
          { value: 'grading', label: <><Scale className="size-4" /> Grading & pass criteria</> },
        ]}
      >
        <TabPanel value="exams">
          <ExamList />
        </TabPanel>
        <TabPanel value="gradebook">
          <Gradebook />
        </TabPanel>
        <TabPanel value="remarks">
          <RemarksEntry />
        </TabPanel>
        <TabPanel value="grading">
          <Grading />
        </TabPanel>
      </Tabs>
    </>
  );
}
