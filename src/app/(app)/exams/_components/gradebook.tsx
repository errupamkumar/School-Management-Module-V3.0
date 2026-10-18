'use client';

import * as React from 'react';
import { BookCheck, Download, MessageSquareQuote, Save } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery } from '@/lib/api-client';
import { allSectionOptions, useLookups } from '@/lib/lookups';
import { downloadCsv } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock } from '@/components/ui/display';
import { Field, Input, Select } from '@/components/ui/form';

interface Exam {
  id: string;
  name: string;
}
interface Book {
  exams: Array<{ id: string; name: string; weight: number; share: number }>;
  subjects: Array<{ id: string; name: string }>;
  rows: Array<{ studentId: string; name: string; rollNo: string | null; admissionNo: string; subjects: Record<string, { percent: number | null; grade: string | null }>; overall: number | null; grade: string | null; rank: number | null }>;
}

/** Weighted gradebook across several exams for one section. */
export function Gradebook() {
  const { data: lk } = useLookups(['classes']);
  const { data: exams } = useApiQuery<Exam[]>('/api/exams');
  const [sectionId, setSectionId] = React.useState('');
  const [weights, setWeights] = React.useState<Record<string, string>>({});
  const chosen = Object.entries(weights).filter(([, w]) => Number(w) > 0);
  const param = chosen.map(([id, w]) => `${id}:${Number(w)}`).join(',');
  const { data, isLoading, error } = useApiQuery<Book>(sectionId && chosen.length ? '/api/exams/gradebook' : null, { sectionId, exams: param });
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="grid gap-4 lg:grid-cols-[16rem_1fr]">
          <Field label="Section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={allSectionOptions(lk)} placeholder="Choose…" />
          </Field>
          <Field label="Exams and weights" hint="Give each exam a weight (e.g. 20, 30, 50). Leave blank to skip it.">
            <div className="flex flex-wrap gap-2">
              {(exams ?? []).map((e) => (
                <label key={e.id} className="flex items-center gap-2 rounded-xl border border-line px-2 py-1 text-sm">
                  {e.name}
                  <Input className="h-8 w-16" type="number" min={0} max={100} value={weights[e.id] ?? ''} onChange={(ev) => setWeights((w) => ({ ...w, [e.id]: ev.target.value }))} aria-label={`Weight for ${e.name}`} />
                </label>
              ))}
              {!exams?.length && <span className="text-sm text-ink-faint">No exams this year.</span>}
            </div>
          </Field>
        </CardBody>
      </Card>
      {!sectionId || !chosen.length ? (
        <Card>
          <EmptyState icon={BookCheck} title="Build a gradebook" description="Pick a section and give weights to the exams to combine — e.g. Periodic Test 20%, Half-yearly 30%, Annual 50%." />
        </Card>
      ) : isLoading ? (
        <LoadingBlock />
      ) : error ? (
        <Card><EmptyState icon={BookCheck} title="Could not build the gradebook" description={error.message} /></Card>
      ) : data ? (
        <Card>
          <div className="flex flex-wrap items-center gap-2 border-b border-line p-3 text-sm">
            {data.exams.map((e) => (
              <Badge key={e.id} tone="brand">
                {e.name} · {e.share}%
              </Badge>
            ))}
            <Button
              size="sm"
              variant="secondary"
              className="ml-auto"
              onClick={() =>
                downloadCsv(
                  'gradebook',
                  data.rows.map((r) => ({ Roll: r.rollNo ?? '', 'Adm. no.': r.admissionNo, Student: r.name, ...Object.fromEntries(data.subjects.flatMap((s) => [[`${s.name} %`, r.subjects[s.id]?.percent ?? ''], [`${s.name} grade`, r.subjects[s.id]?.grade ?? '']])), 'Overall %': r.overall ?? '', Grade: r.grade ?? '', Rank: r.rank ?? '' }))
                )
              }
            >
              <Download /> Export
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-canvas text-xs text-ink-soft">
                <tr>
                  <th className="px-3 py-2 text-left">Roll</th>
                  <th className="px-3 py-2 text-left">Student</th>
                  {data.subjects.map((s) => (
                    <th key={s.id} className="px-3 py-2 text-right">
                      {s.name}
                    </th>
                  ))}
                  <th className="px-3 py-2 text-right">Overall</th>
                  <th className="px-3 py-2 text-right">Rank</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.rows.map((r) => (
                  <tr key={r.studentId}>
                    <td className="px-3 py-2 text-ink-faint">{r.rollNo ?? '—'}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    {data.subjects.map((s) => (
                      <td key={s.id} className="px-3 py-2 text-right tabular-nums">
                        {r.subjects[s.id]?.percent ?? '—'}
                        {r.subjects[s.id]?.grade && <span className="ml-1 text-xs text-ink-faint">{r.subjects[s.id].grade}</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {r.overall ?? '—'}
                      {r.grade && <span className="ml-1 text-xs text-brand-600">{r.grade}</span>}
                    </td>
                    <td className="px-3 py-2 text-right">{r.rank ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

/** Report-card remarks for a section and exam, with the school's remark bank. */
export function RemarksEntry() {
  const { me } = useApp();
  const { data: lk } = useLookups(['classes']);
  const { data: exams } = useApiQuery<Exam[]>('/api/exams');
  const [examId, setExamId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const { data, isLoading } = useApiQuery<Array<{ studentId: string; name: string; rollNo: string | null; text: string }>>(examId && sectionId ? '/api/remarks' : null, { examId, sectionId });
  const [texts, setTexts] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setTexts(Object.fromEntries((data ?? []).map((r) => [r.studentId, r.text]))), [data]);
  const bank = me.settings.remarkBank ?? [];
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="grid gap-4 sm:grid-cols-2">
          <Field label="Exam">
            <Select value={examId} onChange={(e) => setExamId(e.target.value)} options={(exams ?? []).map((e) => ({ value: e.id, label: e.name }))} placeholder="Choose…" />
          </Field>
          <Field label="Section">
            <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={allSectionOptions(lk)} placeholder="Choose…" />
          </Field>
        </CardBody>
      </Card>
      {!examId || !sectionId ? (
        <Card>
          <EmptyState icon={MessageSquareQuote} title="Write report-card remarks" description="Choose an exam and a section. Remarks print on the report card under “Class teacher’s remarks”." />
        </Card>
      ) : isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <Card>
          <datalist id="remark-bank">
            {bank.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
          <ul className="divide-y divide-line">
            {data.map((r) => (
              <li key={r.studentId} className="grid gap-2 px-5 py-3 sm:grid-cols-[14rem_1fr]">
                <p className="text-sm font-medium">
                  <span className="mr-2 text-ink-faint">{r.rollNo ?? '—'}</span>
                  {r.name}
                </p>
                <Input list="remark-bank" value={texts[r.studentId] ?? ''} maxLength={500} onChange={(e) => setTexts((t) => ({ ...t, [r.studentId]: e.target.value }))} placeholder="Type or pick from the remark bank…" aria-label={`Remark for ${r.name}`} />
              </li>
            ))}
          </ul>
          <div className="flex justify-end border-t border-line px-5 py-3">
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const r = await api<{ saved: number }>('/api/remarks', { method: 'POST', body: { examId, entries: data.map((s) => ({ studentId: s.studentId, text: (texts[s.studentId] ?? '').trim() })) } });
                  toast.success(`${r.saved} remarks saved`);
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Save /> Save remarks
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
