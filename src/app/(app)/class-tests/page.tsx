'use client';

import * as React from 'react';
import { ClipboardCheck, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, findSection, subjectOptions, useLookups } from '@/lib/lookups';
import { cn, formatDate, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface TestRow {
  id: string;
  title: string;
  testDate: string;
  maxMarks: number;
  subject: string;
  classLabel: string;
  entered: number;
  average: number | null;
  sectionId: string | null;
}

function MarksDialog({ testId, onClose }: { testId: string; onClose: () => void }) {
  const { data, isLoading } = useApiQuery<{ test: { title: string; maxMarks: number }; rows: Array<{ studentId: string; name: string; rollNo: string | null; marks: number | null; isAbsent: boolean }> }>(`/api/class-tests/${testId}/marks`);
  const [draft, setDraft] = React.useState<Record<string, { marks: string; isAbsent: boolean }>>({});
  const invalidate = useInvalidate();
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.rows.map((r) => [r.studentId, { marks: r.marks === null ? '' : String(r.marks), isAbsent: r.isAbsent }])));
  }, [data]);
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={data ? `${data.test.title} — marks /${Number(data.test.maxMarks)}` : 'Marks'}
      size="lg"
      footer={
        <Button
          onClick={async () => {
            try {
              const entries = Object.entries(draft).filter(([, v]) => v.isAbsent || v.marks !== '').map(([studentId, v]) => ({ studentId, marks: v.isAbsent ? null : Number(v.marks), isAbsent: v.isAbsent }));
              await api(`/api/class-tests/${testId}/marks`, { method: 'PUT', body: { entries } });
              toast.success('Marks saved');
              invalidate(['/api/class-tests']);
              onClose();
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <Save /> Save
        </Button>
      }
    >
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {data.rows.map((r, i) => {
            const d = draft[r.studentId] ?? { marks: '', isAbsent: false };
            return (
              <li key={r.studentId} className="flex items-center gap-3 px-4 py-2">
                <span className="w-6 text-right text-xs text-ink-faint">{r.rollNo ?? i + 1}</span>
                <span className="flex-1 truncate text-sm">{r.name}</span>
                <Input type="number" min={0} max={Number(data.test.maxMarks)} disabled={d.isAbsent} value={d.marks} onChange={(e) => setDraft((s) => ({ ...s, [r.studentId]: { ...d, marks: e.target.value } }))} className="h-8 w-20 text-right" aria-label={`Marks for ${r.name}`} />
                <label className="flex items-center gap-1 text-xs">
                  <Checkbox checked={d.isAbsent} onCheckedChange={(v) => setDraft((s) => ({ ...s, [r.studentId]: { marks: '', isAbsent: !!v } }))} /> AB
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}

function StaffTests() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects'], { mine: true });
  const [sectionId, setSectionId] = React.useState('');
  const { data, isLoading } = useApiQuery<TestRow[]>('/api/class-tests', { sectionId: sectionId || undefined });
  const [open, setOpen] = React.useState(false);
  const [marksFor, setMarksFor] = React.useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Class tests"
        description="Quick tests, quizzes and weekly assessments with marks tracking."
        icon={ClipboardCheck}
        actions={
          can('class_tests', 'create') && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New test
            </Button>
          )
        }
      />
      <Card>
        <div className="border-b border-line p-3">
          <Select className="h-9 w-48" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={allSectionOptions(lk)} placeholder="All my sections" />
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState title="No class tests yet" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.title}</p>
                  <p className="text-xs text-ink-faint">
                    {t.subject} · {t.classLabel} · {formatDate(t.testDate)} · max {Number(t.maxMarks)}
                  </p>
                </div>
                <Badge tone={t.entered ? 'success' : 'warning'}>{t.entered ? `${t.entered} marked` : 'No marks'}</Badge>
                {t.average !== null && <Badge tone="brand">avg {t.average}</Badge>}
                {can('class_tests', 'create') && (
                  <Button size="sm" variant="soft" onClick={() => setMarksFor(t.id)}>
                    Enter marks
                  </Button>
                )}
                {can('class_tests', 'delete') && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete test"
                    onClick={async () => {
                      if (!(await confirm({ title: `Delete ${t.title}?`, description: 'Its marks will be deleted too.', confirmLabel: 'Delete' }))) return;
                      try {
                        await api(`/api/class-tests/${t.id}`, { method: 'DELETE' });
                        invalidate(['/api/class-tests']);
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="New class test"
        fields={(v) => [
          { name: 'sectionId', label: 'Section', type: 'select', required: true, options: allSectionOptions(lk) },
          { name: 'subjectId', label: 'Subject', type: 'select', required: true, options: subjectOptions(lk, findSection(lk, v.sectionId)?.cls.id) },
          { name: 'title', label: 'Title', required: true, placeholder: 'Weekly test — Chapter 4', span: 2 },
          { name: 'testDate', label: 'Date', type: 'date', required: true },
          { name: 'maxMarks', label: 'Maximum marks', type: 'number', required: true },
        ]}
        initial={{ testDate: todayISO(), maxMarks: 20, sectionId: sectionId || '' }}
        onSubmit={async (v) => {
          const s = findSection(lk, v.sectionId);
          await api('/api/class-tests', { method: 'POST', body: { ...v, classId: s?.cls.id } });
          toast.success('Test created');
          invalidate(['/api/class-tests']);
        }}
      />
      {marksFor && <MarksDialog testId={marksFor} onClose={() => setMarksFor(null)} />}
    </>
  );
}

function FamilyTests() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<Array<{ id: string; title: string; testDate: string; maxMarks: number; subject: string; mine: { marks: number | null; isAbsent: boolean } | null }>>(child ? '/api/class-tests' : null, { studentId: child?.id });
  return (
    <>
      <PageHeader title="Class tests" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={ClipboardCheck} />
      <Card>
        <CardHeader title="Recent tests" />
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState title="No tests yet" />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t) => {
              const pct = t.mine?.marks != null ? Math.round((Number(t.mine.marks) / Number(t.maxMarks)) * 100) : null;
              return (
                <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{t.title}</p>
                    <p className="text-xs text-ink-faint">
                      {t.subject} · {formatDate(t.testDate)}
                    </p>
                  </div>
                  <span className={cn('text-sm font-bold', pct !== null && pct < 40 && 'text-rose-600')}>{t.mine ? (t.mine.isAbsent ? 'Absent' : `${Number(t.mine.marks)}/${Number(t.maxMarks)}`) : 'Not marked'}</span>
                  {pct !== null && <Badge tone={pct >= 75 ? 'success' : pct >= 40 ? 'warning' : 'danger'}>{pct}%</Badge>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}

export default function ClassTestsPage() {
  const { isFamily } = useApp();
  return isFamily ? <FamilyTests /> : <StaffTests />;
}
