'use client';

import * as React from 'react';
import { BarChart3, CheckCircle2, ClipboardList, Download, Lock, Plus, Trash2, Unlock, Vote } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, downloadCsv, formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { AudiencePicker, audienceLabel, type AudienceValue } from '@/components/audience-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Segmented, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

type FieldType = 'SINGLE' | 'MULTI' | 'TEXT' | 'PARAGRAPH' | 'NUMBER' | 'DATE' | 'RATING';
interface FormField {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
}
interface FieldResult {
  id: string;
  label: string;
  type: FieldType;
  answered: number;
  counts?: Array<{ option: string; count: number }>;
  average?: number;
  texts?: Array<{ value: string; by?: string }>;
}
interface FormRow {
  id: string;
  title: string;
  description: string | null;
  kind: 'POLL' | 'SURVEY' | 'FORM';
  fields: FormField[];
  audience: AudienceValue;
  anonymous: boolean;
  allowEdit: boolean;
  status: string;
  isOpen: boolean;
  closesAt: string | null;
  createdByName: string;
  createdAt: string;
  responseCount: number;
  myAnswer: Record<string, unknown> | null;
  canManage: boolean;
  canSeeResults: boolean;
  results: FieldResult[] | null;
}

const TYPE_LABEL: Record<FieldType, string> = { SINGLE: 'One choice', MULTI: 'Several choices', TEXT: 'Short answer', PARAGRAPH: 'Paragraph', NUMBER: 'Number', DATE: 'Date', RATING: 'Rating 1–5' };

export default function PollsPage() {
  const { can, isFamily } = useApp();
  const [creating, setCreating] = React.useState(false);
  const [filling, setFilling] = React.useState<FormRow | null>(null);
  const [results, setResults] = React.useState<FormRow | null>(null);
  const { data, isLoading } = useApiQuery<FormRow[]>('/api/forms');
  const open = (data ?? []).filter((f) => f.isOpen);
  const closed = (data ?? []).filter((f) => !f.isOpen);
  return (
    <>
      <PageHeader
        title="Polls & Forms"
        description={isFamily ? 'Quick polls and forms from the school.' : 'Polls, surveys and custom forms with targeted audiences and live results.'}
        icon={Vote}
        actions={
          can('polls', 'create') && !isFamily && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New poll or form
            </Button>
          )
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Vote} title="No polls or forms yet" description={isFamily ? 'Polls and forms from the school appear here.' : 'Ask parents to pick a PTM slot, collect trip consent, or survey staff.'} />
        </Card>
      ) : (
        <div className="space-y-8">
          {[
            { label: 'Open', rows: open },
            { label: 'Closed', rows: closed },
          ]
            .filter((g) => g.rows.length)
            .map((g) => (
              <section key={g.label}>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-faint">{g.label}</h2>
                <div className="grid gap-4 lg:grid-cols-2">
                  {g.rows.map((f) => (
                    <FormCard key={f.id} f={f} onFill={() => setFilling(f)} onResults={() => setResults(f)} />
                  ))}
                </div>
              </section>
            ))}
        </div>
      )}
      <CreateDialog open={creating} onOpenChange={setCreating} />
      <FillDialog form={filling} onClose={() => setFilling(null)} />
      <ResultsDialog form={results} onClose={() => setResults(null)} />
    </>
  );
}

function Bars({ counts, total, mine }: { counts: Array<{ option: string; count: number }>; total: number; mine?: string[] }) {
  return (
    <div className="space-y-2">
      {counts.map((c) => {
        const pct = total ? Math.round((c.count / total) * 100) : 0;
        return (
          <div key={c.option}>
            <div className="mb-0.5 flex justify-between text-xs">
              <span className={cn(mine?.includes(c.option) && 'font-semibold text-brand-700 dark:text-brand-300')}>
                {c.option} {mine?.includes(c.option) && <CheckCircle2 className="inline size-3" />}
              </span>
              <span className="text-ink-faint">
                {c.count} · {pct}%
              </span>
            </div>
            <div className="h-2 rounded-full bg-line">
              <div className="h-2 rounded-full bg-brand-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FormCard({ f, onFill, onResults }: { f: FormRow; onFill: () => void; onResults: () => void }) {
  const invalidate = useInvalidate();
  const confirm = useConfirm();
  const { can } = useApp();
  const [choice, setChoice] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  const q = f.fields[0];
  const answered = !!f.myAnswer;
  const myPick = q && f.myAnswer ? ([] as string[]).concat((f.myAnswer[q.id] as string | string[]) ?? []) : [];
  const vote = async () => {
    setBusy(true);
    try {
      await api(`/api/forms/${f.id}/respond`, { method: 'POST', body: { answers: { [q.id]: q.type === 'MULTI' ? choice : choice[0] } } });
      toast.success('Thanks — your vote is in');
      invalidate(['/api/forms']);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card className="flex flex-col">
      <CardBody className="flex flex-1 flex-col">
        <div className="flex flex-wrap items-start gap-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">{f.kind === 'POLL' ? <Vote className="size-4" /> : <ClipboardList className="size-4" />}</span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{f.title}</p>
            <p className="text-xs text-ink-faint">
              {f.createdByName} · {f.closesAt ? `closes ${formatDateTime(f.closesAt)}` : f.isOpen ? 'open' : 'closed'}
              {f.anonymous && ' · anonymous'}
            </p>
          </div>
          {answered && <Badge tone="success">Answered</Badge>}
          {!f.isOpen && <Badge>Closed</Badge>}
        </div>
        {f.description && <p className="mt-2 text-sm text-ink-soft">{f.description}</p>}

        {f.kind === 'POLL' && q && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium">{q.label}</p>
            {f.isOpen && (!answered || f.allowEdit) && !(answered && f.results) ? (
              <div className="space-y-2">
                {q.options.map((o) => {
                  const on = choice.includes(o);
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setChoice((c) => (q.type === 'MULTI' ? (on ? c.filter((x) => x !== o) : [...c, o]) : [o]))}
                      className={cn('flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm transition-colors', on ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line hover:border-brand-300')}
                    >
                      <span className={cn('size-4 shrink-0 border-2', q.type === 'MULTI' ? 'rounded' : 'rounded-full', on ? 'border-brand-600 bg-brand-600' : 'border-line')} />
                      {o}
                    </button>
                  );
                })}
                <Button size="sm" className="mt-1" loading={busy} disabled={!choice.length} onClick={vote}>
                  Vote
                </Button>
              </div>
            ) : f.results?.[0]?.counts ? (
              <Bars counts={f.results[0].counts} total={f.results[0].answered} mine={myPick} />
            ) : (
              <p className="text-sm text-ink-soft">{answered ? 'Thanks for voting. Results are shared by the school.' : 'This poll is closed.'}</p>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          {f.kind !== 'POLL' && f.isOpen && (!answered || f.allowEdit) && (
            <Button size="sm" onClick={onFill}>
              {answered ? 'Edit my answers' : 'Fill in'}
            </Button>
          )}
          {f.canManage && (
            <>
              <Button size="sm" variant="secondary" onClick={onResults}>
                <BarChart3 /> Results ({f.responseCount})
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={async () => {
                  try {
                    await api(`/api/forms/${f.id}`, { method: 'PUT', body: { status: f.isOpen ? 'CLOSED' : 'OPEN' } });
                    invalidate(['/api/forms']);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                {f.isOpen ? <><Lock /> Close</> : <><Unlock /> Reopen</>}
              </Button>
              {(can('polls', 'delete') || f.responseCount === 0) && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Delete"
                  onClick={async () => {
                    if (!(await confirm({ title: `Delete "${f.title}"?`, description: 'All responses are deleted too.', confirmLabel: 'Delete' }))) return;
                    try {
                      await api(`/api/forms/${f.id}`, { method: 'DELETE' });
                      invalidate(['/api/forms']);
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </>
          )}
          {!f.canManage && <span className="ml-auto text-xs text-ink-faint">{f.responseCount} {f.responseCount === 1 ? 'response' : 'responses'}</span>}
          {f.canManage && <span className="ml-auto text-xs text-ink-faint">{audienceLabel(f.audience)}</span>}
        </div>
      </CardBody>
    </Card>
  );
}

function FieldInput({ f, value, onChange }: { f: FormField; value: unknown; onChange: (v: unknown) => void }) {
  switch (f.type) {
    case 'SINGLE':
      return <Select value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} options={f.options.map((o) => ({ value: o, label: o }))} placeholder="Choose…" />;
    case 'MULTI': {
      const list = (value as string[]) ?? [];
      return (
        <div className="space-y-1.5">
          {f.options.map((o) => (
            <label key={o} className="flex items-center gap-2 text-sm">
              <Checkbox checked={list.includes(o)} onCheckedChange={(c) => onChange(c ? [...list, o] : list.filter((x) => x !== o))} /> {o}
            </label>
          ))}
        </div>
      );
    }
    case 'PARAGRAPH':
      return <Textarea rows={4} value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'NUMBER':
      return <Input type="number" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'DATE':
      return <Input type="date" value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
    case 'RATING':
      return (
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(n)} className={cn('size-9 rounded-lg border text-sm font-semibold', Number(value) === n ? 'border-brand-500 bg-brand-600 text-white' : 'border-line hover:border-brand-300')} aria-label={`${n} of 5`}>
              {n}
            </button>
          ))}
        </div>
      );
    default:
      return <Input value={(value as string) ?? ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

function FillDialog({ form, onClose }: { form: FormRow | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setAnswers(form?.myAnswer ?? {}), [form]);
  if (!form) return null;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={form.title}
      description={form.description ?? (form.anonymous ? 'Your name is not shown with your answers.' : undefined)}
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
                await api(`/api/forms/${form.id}/respond`, { method: 'POST', body: { answers } });
                toast.success('Submitted — thank you');
                invalidate(['/api/forms']);
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Submit
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {form.fields.map((f) => (
          <Field key={f.id} label={f.label} required={f.required}>
            <FieldInput f={f} value={answers[f.id]} onChange={(v) => setAnswers((a) => ({ ...a, [f.id]: v }))} />
          </Field>
        ))}
      </div>
    </Dialog>
  );
}

function ResultsDialog({ form, onClose }: { form: FormRow | null; onClose: () => void }) {
  const { data, isLoading } = useApiQuery<{ results: FieldResult[]; responseCount: number; anonymous: boolean; responses: Array<{ name: string; role: string; at: string; answers: Record<string, unknown> }> }>(form ? `/api/forms/${form.id}` : null);
  if (!form) return null;
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Results · ${form.title}`}
      description={`${data?.responseCount ?? form.responseCount} response${(data?.responseCount ?? form.responseCount) === 1 ? '' : 's'}${form.anonymous ? ' · anonymous' : ''}`}
      size="lg"
      footer={
        <>
          {!!data?.responses.length && (
            <Button
              variant="secondary"
              onClick={() =>
                downloadCsv(
                  `responses-${form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
                  data.responses.map((r) => ({ Name: r.name, Role: r.role, 'Submitted at': formatDateTime(r.at), ...Object.fromEntries(form.fields.map((f) => [f.label, ([] as unknown[]).concat(r.answers[f.id] ?? '').join('; ')])) }))
                )
              }
            >
              <Download /> Export responses
            </Button>
          )}
          <Button onClick={onClose}>Close</Button>
        </>
      }
    >
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-6">
          {data.results.map((r) => (
            <div key={r.id}>
              <p className="mb-2 text-sm font-semibold">
                {r.label} <span className="font-normal text-ink-faint">· {r.answered} answered{r.average !== undefined ? ` · average ${r.average}` : ''}</span>
              </p>
              {r.counts ? (
                <Bars counts={r.counts} total={r.answered} />
              ) : r.texts?.length ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-3 text-sm">
                  {r.texts.map((t, i) => (
                    <li key={i}>
                      {t.value}
                      {t.by && <span className="text-xs text-ink-faint"> — {t.by}</span>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-faint">No answers yet.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </Dialog>
  );
}

const newId = () => Math.random().toString(36).slice(2, 10);

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const [kind, setKind] = React.useState<'POLL' | 'FORM'>('POLL');
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [fields, setFields] = React.useState<FormField[]>([]);
  const [audience, setAudience] = React.useState<AudienceValue>({ roles: ['PARENT'], classIds: [] });
  const [anonymous, setAnonymous] = React.useState(false);
  const [allowEdit, setAllowEdit] = React.useState(false);
  const [privateResults, setPrivateResults] = React.useState(false);
  const [closesAt, setClosesAt] = React.useState('');
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setKind('POLL');
    setTitle('');
    setDescription('');
    setFields([{ id: newId(), label: '', type: 'SINGLE', required: true, options: ['', ''] }]);
    setAudience({ roles: ['PARENT'], classIds: [] });
    setAnonymous(false);
    setAllowEdit(false);
    setPrivateResults(false);
    setClosesAt('');
  }, [open]);

  const upd = (i: number, patch: Partial<FormField>) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const cleaned = fields.map((f) => ({ ...f, options: ['SINGLE', 'MULTI'].includes(f.type) ? f.options.map((o) => o.trim()).filter(Boolean) : [] }));
  const valid = title.trim().length >= 3 && audience.roles.length > 0 && cleaned.length > 0 && cleaned.every((f) => f.label.trim() && (!['SINGLE', 'MULTI'].includes(f.type) || f.options.length >= 2));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New poll or form"
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!valid}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/forms', {
                  method: 'POST',
                  body: { kind: kind === 'POLL' ? 'POLL' : 'FORM', title, description: description || null, fields: kind === 'POLL' ? cleaned.slice(0, 1) : cleaned, audience, anonymous, allowEdit, resultsVisible: privateResults ? 'CREATOR_ONLY' : 'AFTER_RESPONSE', closesAt: closesAt ? new Date(closesAt).toISOString() : null, notify: true },
                });
                toast.success(kind === 'POLL' ? 'Poll published' : 'Form published');
                invalidate(['/api/forms']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Publish
          </Button>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4">
          <Segmented
            value={kind}
            onChange={(k) => {
              setKind(k);
              if (k === 'POLL') setFields((fs) => [{ ...(fs[0] ?? { id: newId(), label: '', required: true, options: ['', ''] }), type: fs[0]?.type === 'MULTI' ? 'MULTI' : 'SINGLE', options: fs[0]?.options.length ? fs[0].options : ['', ''] }]);
            }}
            options={[{ value: 'POLL', label: 'Quick poll' }, { value: 'FORM', label: 'Form / survey' }]}
          />
          <Field label="Title" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === 'POLL' ? 'Which Saturday suits you for the PTM?' : 'Annual trip consent form'} />
          </Field>
          <Field label="Description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          {fields.map((f, i) => (
            <div key={f.id} className="rounded-xl border border-line p-3">
              <div className="flex flex-wrap gap-2">
                <Input className="min-w-[12rem] flex-1" value={f.label} onChange={(e) => upd(i, { label: e.target.value })} placeholder={`Question ${i + 1}`} aria-label={`Question ${i + 1}`} />
                <Select
                  className="w-40"
                  value={f.type}
                  onChange={(e) => upd(i, { type: e.target.value as FieldType, options: ['SINGLE', 'MULTI'].includes(e.target.value) && f.options.length < 2 ? ['', ''] : f.options })}
                  options={(kind === 'POLL' ? (['SINGLE', 'MULTI'] as FieldType[]) : (Object.keys(TYPE_LABEL) as FieldType[])).map((t) => ({ value: t, label: TYPE_LABEL[t] }))}
                  aria-label="Question type"
                />
                {kind === 'FORM' && (
                  <Button size="icon" variant="ghost" aria-label="Remove question" disabled={fields.length === 1} onClick={() => setFields((fs) => fs.filter((_, j) => j !== i))}>
                    <Trash2 />
                  </Button>
                )}
              </div>
              {['SINGLE', 'MULTI'].includes(f.type) && (
                <div className="mt-2 space-y-1.5 pl-1">
                  {f.options.map((o, k) => (
                    <div key={k} className="flex gap-2">
                      <Input className="h-9" value={o} onChange={(e) => upd(i, { options: f.options.map((x, m) => (m === k ? e.target.value : x)) })} placeholder={`Option ${k + 1}`} aria-label={`Option ${k + 1}`} />
                      <Button size="icon-sm" variant="ghost" aria-label="Remove option" disabled={f.options.length <= 2} onClick={() => upd(i, { options: f.options.filter((_, m) => m !== k) })}>
                        <Trash2 />
                      </Button>
                    </div>
                  ))}
                  <Button size="sm" variant="ghost" disabled={f.options.length >= 20} onClick={() => upd(i, { options: [...f.options, ''] })}>
                    <Plus /> Option
                  </Button>
                </div>
              )}
              {kind === 'FORM' && (
                <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
                  <Switch checked={f.required} onCheckedChange={(c) => upd(i, { required: c })} /> Required
                </label>
              )}
            </div>
          ))}
          {kind === 'FORM' && (
            <Button variant="secondary" size="sm" disabled={fields.length >= 40} onClick={() => setFields((fs) => [...fs, { id: newId(), label: '', type: 'TEXT', required: false, options: [] }])}>
              <Plus /> Add question
            </Button>
          )}
        </div>
        <div className="space-y-4">
          <Field label="Who can answer">
            <AudiencePicker value={audience} onChange={setAudience} />
          </Field>
          <Field label="Closes at (optional)">
            <Input type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} />
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={anonymous} onCheckedChange={setAnonymous} /> Anonymous
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={allowEdit} onCheckedChange={setAllowEdit} /> People can change their answer
          </label>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={privateResults} onCheckedChange={setPrivateResults} /> Keep results private
          </label>
        </div>
      </div>
    </Dialog>
  );
}
