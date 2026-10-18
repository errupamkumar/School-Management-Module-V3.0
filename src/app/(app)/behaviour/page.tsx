'use client';

import * as React from 'react';
import { MessageSquarePlus, Save, Star, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, useLookups } from '@/lib/lookups';
import { cn, formatDate, todayISO } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Segmented, Select } from '@/components/ui/form';
import { Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

function Stars({ value, onChange, disabled }: { value: number | undefined; onChange?: (v: number) => void; disabled?: boolean }) {
  return (
    <div className="flex" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          onClick={() => onChange?.(n)}
          className={cn('p-0.5 transition-transform hover:scale-110 disabled:cursor-default disabled:hover:scale-100', (value ?? 0) >= n ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600')}
        >
          <Star className="size-4 fill-current" />
        </button>
      ))}
    </div>
  );
}

function RatingsTab() {
  const { can } = useApp();
  const { data: lk } = useLookups(['classes'], { mine: true });
  const sections = allSectionOptions(lk);
  const [sectionId, setSectionId] = React.useState('');
  const [term, setTerm] = React.useState('TERM_1');
  const [category, setCategory] = React.useState<'BEHAVIOUR' | 'SKILL'>('BEHAVIOUR');
  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  const { data, isLoading } = useApiQuery<{ traits: string[]; rows: Array<{ studentId: string; name: string; rollNo: string | null; ratings: Record<string, number> }> }>(sectionId ? '/api/behaviour' : null, { sectionId, term, category });
  const [draft, setDraft] = React.useState<Record<string, Record<string, number>>>({});
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.rows.map((r) => [r.studentId, { ...r.ratings }])));
  }, [data]);
  const editable = can('behaviour', 'create');
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Select className="h-9 w-44" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} />
        <Select className="h-9 w-32" value={term} onChange={(e) => setTerm(e.target.value)} options={[{ value: 'TERM_1', label: 'Term 1' }, { value: 'TERM_2', label: 'Term 2' }]} />
        <Segmented size="sm" value={category} onChange={setCategory} options={[{ value: 'BEHAVIOUR', label: 'Behaviour' }, { value: 'SKILL', label: 'Skills' }]} />
        {editable && (
          <Button
            size="sm"
            className="ml-auto"
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const ratings = Object.entries(draft).flatMap(([studentId, r]) => Object.entries(r).map(([trait, rating]) => ({ studentId, trait, rating })));
                await api('/api/behaviour', { method: 'PUT', body: { sectionId, term, category, ratings } });
                toast.success(`Saved ${ratings.length} ratings`);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Save /> Save ratings
          </Button>
        )}
      </div>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                <th className="sticky left-0 bg-surface px-4 py-2">Student</th>
                {data.traits.map((t) => (
                  <th key={t} className="whitespace-nowrap px-4 py-2">
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.studentId} className="border-b border-line/60">
                  <td className="sticky left-0 whitespace-nowrap bg-surface px-4 py-2 font-medium">
                    <span className="mr-2 text-xs text-ink-faint">{r.rollNo}</span>
                    {r.name}
                  </td>
                  {data.traits.map((t) => (
                    <td key={t} className="px-4 py-2">
                      <Stars disabled={!editable} value={draft[r.studentId]?.[t]} onChange={(v) => setDraft((d) => ({ ...d, [r.studentId]: { ...d[r.studentId], [t]: v } }))} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-4 py-3 text-xs text-ink-faint">5 = Outstanding (A) · 4 = Very good (B) · 3 = Good (C) · 2 = Fair (D) · 1 = Needs improvement (E). Traits are configurable in School Settings.</p>
        </div>
      )}
    </Card>
  );
}

interface Obs {
  id: string;
  studentId: string;
  studentName: string;
  kind: string;
  note: string;
  observedOn: string;
  createdById: string;
  createdByName: string;
  shareWithParent: boolean;
}

function ObservationsTab({ studentId }: { studentId?: string }) {
  const { can, me } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [open, setOpen] = React.useState(false);
  const sid = studentId ?? student?.id;
  const { data, isLoading } = useApiQuery<Obs[]>('/api/observations', { studentId: sid });
  return (
    <Card>
      {!studentId && (
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <StudentPicker value={student} onChange={setStudent} className="max-w-md" placeholder="Filter by student (optional)…" />
          {can('behaviour', 'create') && (
            <Button size="sm" className="ml-auto" onClick={() => setOpen(true)} disabled={!student}>
              <MessageSquarePlus /> Add observation
            </Button>
          )}
        </div>
      )}
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState title="No observations" description={!studentId && !student ? 'Pick a student to add an observation.' : undefined} />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((o) => (
            <li key={o.id} className="flex gap-3 px-5 py-3">
              <Badge tone={o.kind === 'POSITIVE' ? 'success' : o.kind === 'NEGATIVE' ? 'danger' : 'neutral'}>{o.kind.toLowerCase()}</Badge>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{o.note}</p>
                <p className="mt-0.5 text-xs text-ink-faint">
                  {!studentId && `${o.studentName} · `}
                  {formatDate(o.observedOn)} · {o.createdByName}
                  {!o.shareWithParent && ' · internal'}
                </p>
              </div>
              {!studentId && (can('behaviour', 'delete') || (can('behaviour', 'create') && o.createdById === me.user.id)) && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Delete observation?', confirmLabel: 'Delete' }))) return;
                    try {
                      await api(`/api/observations/${o.id}`, { method: 'DELETE' });
                      invalidate(['/api/observations']);
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
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Observation · ${student?.name ?? ''}`}
        fields={[
          { name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'POSITIVE', label: 'Appreciation' }, { value: 'NEUTRAL', label: 'General note' }, { value: 'NEGATIVE', label: 'Concern' }] },
          { name: 'observedOn', label: 'Date', type: 'date', required: true },
          { name: 'note', label: 'Observation', type: 'textarea', required: true },
          { name: 'shareWithParent', label: 'Share with parent', type: 'switch' },
        ]}
        initial={{ kind: 'POSITIVE', observedOn: todayISO(), shareWithParent: true }}
        onSubmit={async (v) => {
          await api('/api/observations', { method: 'POST', body: { ...v, studentId: student!.id } });
          toast.success('Observation recorded');
          invalidate(['/api/observations']);
        }}
      />
    </Card>
  );
}

function FamilyBehaviour() {
  const child = useFocusChild();
  const { data } = useApiQuery<{ behaviour?: { ratings: Array<{ id: string; term: string; category: string; trait: string; rating: number }> } }>(child ? `/api/students/${child.id}/overview` : null);
  if (!child) return null;
  const ratings = data?.behaviour?.ratings ?? [];
  return (
    <>
      <PageHeader title="Behaviour & skills" description={`${child.name} · ${child.classLabel}`} icon={Star} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Ratings" />
          <CardBody>
            {!ratings.length ? (
              <EmptyState title="Not rated yet" />
            ) : (
              <ul className="space-y-2">
                {ratings.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-sm">
                    <span>
                      {r.trait} <span className="text-xs text-ink-faint">· {r.term.replace('_', ' ').toLowerCase()}</span>
                    </span>
                    <Stars value={r.rating} disabled />
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <ObservationsTab studentId={child.id} />
      </div>
    </>
  );
}

export default function BehaviourPage() {
  const { isFamily } = useApp();
  const [tab, setTab] = React.useState('ratings');
  if (isFamily) return <FamilyBehaviour />;
  return (
    <>
      <PageHeader title="Behaviour & skills" description="Co-scholastic ratings for report cards and teacher observations shared with parents." icon={Star} />
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'ratings', label: 'Ratings' }, { value: 'observations', label: 'Observations' }]}>
        <TabPanel value="ratings">
          <RatingsTab />
        </TabPanel>
        <TabPanel value="observations">
          <ObservationsTab />
        </TabPanel>
      </Tabs>
    </>
  );
}
