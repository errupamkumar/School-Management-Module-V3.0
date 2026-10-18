'use client';

import * as React from 'react';
import { FileQuestion, Plus, Printer, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, subjectOptions, useLookups } from '@/lib/lookups';
import { formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface Q {
  id: string;
  classId: string;
  subjectId: string;
  chapterId: string | null;
  type: string;
  text: string;
  options: string[] | null;
  answer: string | null;
  marks: number;
  difficulty: string;
}

const TYPES = [
  { value: 'MCQ', label: 'Multiple choice' },
  { value: 'SHORT', label: 'Short answer' },
  { value: 'LONG', label: 'Long answer' },
  { value: 'TRUE_FALSE', label: 'True / false' },
  { value: 'FILL_BLANK', label: 'Fill in the blank' },
];

function BankTab() {
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects']);
  const [classId, setClassId] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const { data: chapters } = useApiQuery<Array<{ id: string; name: string }>>(classId && subjectId ? '/api/chapters' : null, { classId, subjectId });
  return (
    <ResourcePage<Q>
      embedded
      title="Questions"
      entityLabel="Question"
      endpoint="/api/questions"
      module="question_bank"
      params={{ classId: classId || undefined, subjectId: subjectId || undefined }}
      searchPlaceholder="Search question text…"
      dialogSize="lg"
      filters={
        <>
          <Select className="h-9 w-36" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} placeholder="All classes" />
          <Select className="h-9 w-44" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={subjectOptions(lk, classId)} placeholder="All subjects" />
        </>
      }
      columns={[
        { accessorKey: 'text', header: 'Question', cell: ({ row }) => <div className="max-w-xl"><p className="line-clamp-2 text-sm">{row.original.text}</p>{row.original.options && <p className="mt-0.5 text-xs text-ink-faint">{row.original.options.join(' · ')}</p>}</div> },
        { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <Badge>{TYPES.find((t) => t.value === getValue())?.label}</Badge> },
        { accessorKey: 'difficulty', header: 'Level', cell: ({ getValue }) => <Badge tone={getValue() === 'HARD' ? 'danger' : getValue() === 'EASY' ? 'success' : 'warning'}>{String(getValue()).toLowerCase()}</Badge> },
        { accessorKey: 'marks', header: 'Marks', cell: ({ getValue }) => Number(getValue()) },
      ]}
      fields={[
        { name: 'classId', label: 'Class', type: 'select', required: true, options: classOptions(lk) },
        { name: 'subjectId', label: 'Subject', type: 'select', required: true, options: subjectOptions(lk) },
        { name: 'chapterId', label: 'Chapter', type: 'select', options: (chapters ?? []).map((c) => ({ value: c.id, label: c.name })) },
        { name: 'type', label: 'Type', type: 'select', required: true, options: TYPES },
        { name: 'text', label: 'Question', type: 'textarea', required: true },
        { name: 'optionA', label: 'Option A', visible: (v) => v.type === 'MCQ' },
        { name: 'optionB', label: 'Option B', visible: (v) => v.type === 'MCQ' },
        { name: 'optionC', label: 'Option C', visible: (v) => v.type === 'MCQ' },
        { name: 'optionD', label: 'Option D', visible: (v) => v.type === 'MCQ' },
        { name: 'answer', label: 'Answer / marking scheme', type: 'textarea' },
        { name: 'marks', label: 'Marks', type: 'number', required: true },
        { name: 'difficulty', label: 'Difficulty', type: 'select', options: [{ value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }] },
      ]}
      defaults={{ classId, subjectId, type: 'MCQ', marks: 1, difficulty: 'MEDIUM' }}
      fromForm={(v) => {
        const { optionA, optionB, optionC, optionD, ...rest } = v;
        return { ...rest, options: rest.type === 'MCQ' ? [optionA, optionB, optionC, optionD].filter(Boolean) : null };
      }}
      toForm={(q) => ({ ...q, optionA: q.options?.[0] ?? '', optionB: q.options?.[1] ?? '', optionC: q.options?.[2] ?? '', optionD: q.options?.[3] ?? '', marks: Number(q.marks) })}
    />
  );
}

interface Paper {
  id: string;
  title: string;
  classLabel: string;
  subject: string;
  totalMarks: number;
  durationMins: number;
  questionCount: number;
  createdAt: string;
}

function PapersTab() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Paper[]>('/api/question-papers');
  const [open, setOpen] = React.useState(false);
  return (
    <>
      {can('question_bank', 'create') && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Wand2 /> Build question paper
          </Button>
        </div>
      )}
      <Card>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={FileQuestion} title="No question papers yet" description="Build one from the question bank in under a minute." />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="flex-1">
                  <p className="font-medium">{p.title}</p>
                  <p className="text-xs text-ink-faint">
                    {p.classLabel} · {p.subject} · {p.questionCount} questions · {Number(p.totalMarks)} marks · {p.durationMins} min · {formatDate(p.createdAt)}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => window.open(`/print/question-paper/${p.id}`, '_blank')}>
                  <Printer /> Print
                </Button>
                <Button size="sm" variant="ghost" onClick={() => window.open(`/print/question-paper/${p.id}?answers=1`, '_blank')}>
                  Answer key
                </Button>
                {can('question_bank', 'delete') && (
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Delete paper"
                    onClick={async () => {
                      if (!(await confirm({ title: `Delete ${p.title}?`, confirmLabel: 'Delete' }))) return;
                      await api(`/api/question-papers/${p.id}`, { method: 'DELETE' });
                      invalidate(['/api/question-papers']);
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
      <PaperBuilder open={open} onOpenChange={setOpen} onSaved={() => invalidate(['/api/question-papers'])} />
    </>
  );
}

function PaperBuilder({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects']);
  const [meta, setMeta] = React.useState({ title: '', classId: '', subjectId: '', durationMins: 180, instructions: 'All questions are compulsory. Marks are indicated against each question.', difficulty: 'MIXED' });
  const [blueprint, setBlueprint] = React.useState([
    { type: 'MCQ', count: 10 },
    { type: 'SHORT', count: 5 },
    { type: 'LONG', count: 3 },
  ]);
  const [proposal, setProposal] = React.useState<{ sections: Array<{ title: string; questionIds: string[]; marks: number }>; totalMarks: number; shortfalls: string[] } | null>(null);
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Build a question paper"
      description="Pick a blueprint and let the system draw random questions from the bank, then save."
      size="lg"
      footer={
        <>
          <Button
            variant="secondary"
            loading={busy}
            disabled={!meta.classId || !meta.subjectId}
            onClick={async () => {
              setBusy(true);
              try {
                setProposal(await api('/api/question-papers/generate', { method: 'POST', body: { classId: meta.classId, subjectId: meta.subjectId, difficulty: meta.difficulty, blueprint: blueprint.filter((b) => b.count > 0) } }));
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Sparkles /> Generate
          </Button>
          <Button
            disabled={!proposal?.sections.length || !meta.title}
            onClick={async () => {
              try {
                await api('/api/question-papers', { method: 'POST', body: { title: meta.title, classId: meta.classId, subjectId: meta.subjectId, durationMins: meta.durationMins, instructions: meta.instructions, sections: proposal!.sections.map((s) => ({ title: s.title, questionIds: s.questionIds })) } });
                toast.success('Question paper saved');
                onSaved();
                onOpenChange(false);
                setProposal(null);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Save paper
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" className="sm:col-span-2">
          <Input value={meta.title} onChange={(e) => setMeta({ ...meta, title: e.target.value })} placeholder="Periodic Test 2 — Mathematics" />
        </Field>
        <Field label="Class">
          <Select value={meta.classId} onChange={(e) => setMeta({ ...meta, classId: e.target.value, subjectId: '' })} options={classOptions(lk)} placeholder="Choose…" />
        </Field>
        <Field label="Subject">
          <Select value={meta.subjectId} onChange={(e) => setMeta({ ...meta, subjectId: e.target.value })} options={subjectOptions(lk, meta.classId)} placeholder="Choose…" />
        </Field>
        <Field label="Duration (minutes)">
          <Input type="number" value={meta.durationMins} onChange={(e) => setMeta({ ...meta, durationMins: Number(e.target.value) })} />
        </Field>
        <Field label="Difficulty">
          <Select value={meta.difficulty} onChange={(e) => setMeta({ ...meta, difficulty: e.target.value })} options={[{ value: 'MIXED', label: 'Mixed' }, { value: 'EASY', label: 'Easy' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HARD', label: 'Hard' }]} />
        </Field>
        <Field label="Instructions" className="sm:col-span-2">
          <Textarea rows={2} value={meta.instructions} onChange={(e) => setMeta({ ...meta, instructions: e.target.value })} />
        </Field>
      </div>
      <Card className="mt-4">
        <CardHeader title="Blueprint" />
        <CardBody className="space-y-2">
          {blueprint.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select className="flex-1" value={b.type} onChange={(e) => setBlueprint((bp) => bp.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} options={TYPES} />
              <Input type="number" min={0} className="w-24" value={b.count} onChange={(e) => setBlueprint((bp) => bp.map((x, j) => (j === i ? { ...x, count: Number(e.target.value) } : x)))} aria-label="Number of questions" />
              <Button variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => setBlueprint((bp) => bp.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setBlueprint((bp) => [...bp, { type: 'SHORT', count: 2 }])}>
            <Plus /> Add section
          </Button>
        </CardBody>
      </Card>
      {proposal && (
        <div className="mt-4 rounded-xl border border-line p-4 text-sm">
          <p className="font-semibold">Proposed paper · {proposal.totalMarks} marks</p>
          <ul className="mt-2 space-y-1">
            {proposal.sections.map((s) => (
              <li key={s.title}>
                {s.title}: {s.questionIds.length} questions ({s.marks} marks)
              </li>
            ))}
          </ul>
          {proposal.shortfalls.length > 0 && <p className="mt-2 text-xs text-amber-700">Not enough questions in the bank — {proposal.shortfalls.join('; ')}</p>}
        </div>
      )}
    </Dialog>
  );
}

export default function QuestionBankPage() {
  const [tab, setTab] = React.useState('bank');
  return (
    <>
      <PageHeader title="Question papers" description="Chapter-wise question bank and a question paper builder with answer keys." icon={FileQuestion} />
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'bank', label: 'Question bank' }, { value: 'papers', label: 'Question papers' }]}>
        <TabPanel value="bank">
          <BankTab />
        </TabPanel>
        <TabPanel value="papers">
          <PapersTab />
        </TabPanel>
      </Tabs>
    </>
  );
}
