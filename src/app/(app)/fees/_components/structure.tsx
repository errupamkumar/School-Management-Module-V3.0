'use client';

import * as React from 'react';
import { Copy, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, LoadingBlock } from '@/components/ui/display';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Item {
  feeHeadId: string;
  amount: number;
  frequency: string;
  months: number[] | null;
  dueDay: number;
  lateFeeType: string;
  lateFeeAmount: number;
}
interface Matrix {
  academicYear: string;
  heads: Array<{ id: string; name: string; kind: string; isActive: boolean }>;
  classes: Array<{ id: string; label: string; students: number; items: Item[] }>;
}

const FREQ = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'QUARTERLY', label: 'Quarterly' },
  { value: 'HALF_YEARLY', label: 'Half-yearly' },
  { value: 'YEARLY', label: 'Yearly' },
  { value: 'ONE_TIME', label: 'One time (admission)' },
];
const PER_YEAR: Record<string, number> = { MONTHLY: 12, QUARTERLY: 4, HALF_YEARLY: 2, YEARLY: 1, ONE_TIME: 0 };

export function FeeStructure() {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['years']);
  const [year, setYear] = React.useState('');
  const { data, isLoading } = useApiQuery<Matrix>('/api/fees/structures', { academicYear: year || undefined });
  const [edit, setEdit] = React.useState<Matrix['classes'][number] | null>(null);
  const [copyOpen, setCopyOpen] = React.useState(false);
  React.useEffect(() => {
    if (data && !year) setYear(data.academicYear);
  }, [data, year]);

  const annual = (items: Item[]) => items.reduce((a, i) => a + i.amount * (PER_YEAR[i.frequency] ?? 0), 0);

  return (
    <>
      <Card>
        <CardHeader
          title={`Fee structure ${data?.academicYear ?? ''}`}
          description="Amounts per class and fee head. Invoices are generated from this every month."
          actions={
            <>
              <Select className="h-9 w-32" value={year} onChange={(e) => setYear(e.target.value)} options={(lk?.years ?? []).map((y) => ({ value: y.name, label: y.name }))} />
              {can('fees', 'edit') && (
                <Button variant="secondary" size="sm" onClick={() => setCopyOpen(true)}>
                  <Copy /> Copy from another year
                </Button>
              )}
            </>
          }
        />
        {isLoading || !data ? (
          <LoadingBlock />
        ) : !data.heads.length ? (
          <EmptyState title="Create fee heads first" description="Add heads like Tuition Fee, Transport, Exam Fee under the Setup tab." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-2.5">Class</th>
                  {data.heads.filter((h) => h.isActive).map((h) => (
                    <th key={h.id} className="whitespace-nowrap px-4 py-2.5">
                      {h.name}
                    </th>
                  ))}
                  <th className="px-4 py-2.5">Annual total</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.classes.map((c) => (
                  <tr key={c.id} className="border-b border-line/60">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium">
                      {c.label} <span className="text-xs text-ink-faint">({c.students})</span>
                    </td>
                    {data.heads.filter((h) => h.isActive).map((h) => {
                      const it = c.items.find((i) => i.feeHeadId === h.id);
                      return (
                        <td key={h.id} className="whitespace-nowrap px-4 py-2.5">
                          {it ? (
                            <>
                              {formatINR(it.amount, true)} <span className="text-[10px] text-ink-faint">{it.frequency.replace('_', ' ').toLowerCase()}</span>
                            </>
                          ) : (
                            <span className="text-ink-faint">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="whitespace-nowrap px-4 py-2.5 font-semibold">{formatINR(annual(c.items), true)}</td>
                    <td className="px-4 py-2.5">
                      {can('fees', 'edit') && (
                        <Button variant="ghost" size="icon-sm" aria-label={`Edit ${c.label}`} onClick={() => setEdit(c)}>
                          <Pencil />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {edit && data && <EditClassStructure cls={edit} matrix={data} onClose={() => setEdit(null)} onSaved={() => invalidate(['/api/fees/structures'])} />}
      {data && <CopyDialog open={copyOpen} onOpenChange={setCopyOpen} target={data.academicYear} years={(lk?.years ?? []).map((y) => y.name)} onDone={() => invalidate(['/api/fees/structures'])} />}
    </>
  );
}

function EditClassStructure({ cls, matrix, onClose, onSaved }: { cls: Matrix['classes'][number]; matrix: Matrix; onClose: () => void; onSaved: () => void }) {
  const [rows, setRows] = React.useState(() =>
    matrix.heads
      .filter((h) => h.isActive)
      .map((h) => {
        const it = cls.items.find((i) => i.feeHeadId === h.id);
        return { feeHeadId: h.id, name: h.name, on: !!it, amount: it?.amount ?? 0, frequency: it?.frequency ?? (h.kind === 'ONE_TIME' ? 'ONE_TIME' : 'MONTHLY'), dueDay: it?.dueDay ?? 10, lateFeeType: it?.lateFeeType ?? 'NONE', lateFeeAmount: it?.lateFeeAmount ?? 0, months: it?.months ?? null };
      })
  );
  const [applyTo, setApplyTo] = React.useState<string[]>([cls.id]);
  const [saving, setSaving] = React.useState(false);
  const upd = (id: string, p: Partial<(typeof rows)[number]>) => setRows((r) => r.map((x) => (x.feeHeadId === id ? { ...x, ...p } : x)));
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Fee structure · ${cls.label} · ${matrix.academicYear}`}
      size="xl"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api('/api/fees/structures', {
                  method: 'PUT',
                  body: { academicYear: matrix.academicYear, classIds: applyTo, items: rows.filter((r) => r.on && r.amount > 0).map((r) => ({ feeHeadId: r.feeHeadId, amount: Number(r.amount), frequency: r.frequency, dueDay: Number(r.dueDay), lateFeeType: r.lateFeeType, lateFeeAmount: Number(r.lateFeeAmount), months: r.months })) },
                });
                toast.success(`Saved for ${applyTo.length} class(es)`);
                onSaved();
                onClose();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.feeHeadId} className="grid grid-cols-2 items-end gap-2 rounded-xl border border-line p-3 md:grid-cols-[auto_1fr_8rem_9rem_5rem_8rem_7rem]">
            <Checkbox className="mb-3" checked={r.on} onCheckedChange={(v) => upd(r.feeHeadId, { on: !!v })} aria-label={r.name} />
            <p className="mb-2.5 text-sm font-medium">{r.name}</p>
            <Field label="Amount ₹">
              <Input type="number" min={0} disabled={!r.on} value={r.amount} onChange={(e) => upd(r.feeHeadId, { amount: Number(e.target.value) })} />
            </Field>
            <Field label="Frequency">
              <Select disabled={!r.on} value={r.frequency} onChange={(e) => upd(r.feeHeadId, { frequency: e.target.value })} options={FREQ} />
            </Field>
            <Field label="Due day">
              <Input type="number" min={1} max={28} disabled={!r.on} value={r.dueDay} onChange={(e) => upd(r.feeHeadId, { dueDay: Number(e.target.value) })} />
            </Field>
            <Field label="Late fee">
              <Select disabled={!r.on} value={r.lateFeeType} onChange={(e) => upd(r.feeHeadId, { lateFeeType: e.target.value })} options={[{ value: 'NONE', label: 'None' }, { value: 'FIXED', label: 'Fixed' }, { value: 'PER_DAY', label: 'Per day' }]} />
            </Field>
            <Field label="Fine ₹">
              <Input type="number" min={0} disabled={!r.on || r.lateFeeType === 'NONE'} value={r.lateFeeAmount} onChange={(e) => upd(r.feeHeadId, { lateFeeAmount: Number(e.target.value) })} />
            </Field>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <p className="label">Also apply to</p>
        <div className="flex flex-wrap gap-2">
          {matrix.classes.map((c) => (
            <label key={c.id} className="flex items-center gap-1.5 rounded-lg border border-line px-2 py-1 text-xs">
              <Checkbox checked={applyTo.includes(c.id)} disabled={c.id === cls.id} onCheckedChange={(v) => setApplyTo((a) => (v ? [...a, c.id] : a.filter((x) => x !== c.id)))} /> {c.label}
            </label>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-ink-faint">
        <Badge>Note</Badge> Changes apply to invoices generated from now on. Existing invoices are not altered.
      </p>
    </Dialog>
  );
}

function CopyDialog({ open, onOpenChange, target, years, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; target: string; years: string[]; onDone: () => void }) {
  const [from, setFrom] = React.useState('');
  const [pct, setPct] = React.useState('10');
  const [busy, setBusy] = React.useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Copy fee structure into ${target}`}
      description="Replaces the whole structure for this year. Use the increase to apply an annual fee hike."
      footer={
        <Button
          loading={busy}
          disabled={!from}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api<{ copied: number }>('/api/fees/structures', { method: 'PUT', body: { academicYear: target, copyFrom: from, increasePercent: Number(pct) } });
              toast.success(`Copied ${r.copied} fee lines`);
              onDone();
              onOpenChange(false);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Copy
        </Button>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <Field label="Copy from">
          <Select value={from} onChange={(e) => setFrom(e.target.value)} options={years.filter((y) => y !== target).map((y) => ({ value: y, label: y }))} placeholder="Choose year" />
        </Field>
        <Field label="Increase %">
          <Input type="number" value={pct} onChange={(e) => setPct(e.target.value)} />
        </Field>
      </div>
    </Dialog>
  );
}
