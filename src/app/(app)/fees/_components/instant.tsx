'use client';

import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery } from '@/lib/api-client';
import { classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { formatINR } from '@/lib/utils';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { CsvImportDialog } from '@/components/csv-import';
import { Button } from '@/components/ui/button';
import { Field, Input, Segmented, Select, Switch } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Item {
  description: string;
  amount: string;
  feeHeadId: string;
}

/** Instant fees: a one-off invoice outside the monthly structure. */
export function InstantInvoiceDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const { data: lk } = useLookups(['classes']);
  const { data: heads } = useApiQuery<Array<{ id: string; name: string; isActive: boolean }>>(open ? '/api/fees/heads' : null);
  const [title, setTitle] = React.useState('');
  const [target, setTarget] = React.useState<'students' | 'class'>('students');
  const [picked, setPicked] = React.useState<PickedStudent[]>([]);
  const [classId, setClassId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [dueDate, setDueDate] = React.useState('');
  const [items, setItems] = React.useState<Item[]>([{ description: '', amount: '', feeHeadId: '' }]);
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setTitle('');
      setPicked([]);
      setClassId('');
      setSectionId('');
      setItems([{ description: '', amount: '', feeHeadId: '' }]);
      const d = new Date(Date.now() + 7 * 86_400_000);
      setDueDate(d.toISOString().slice(0, 10));
    }
  }, [open]);

  const total = items.reduce((a, it) => a + (Number(it.amount) || 0), 0);
  const ready = title.trim().length >= 3 && dueDate && total > 0 && items.every((it) => it.description.trim() && Number(it.amount) > 0) && (target === 'students' ? picked.length > 0 : !!classId);

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ created: number; total: number; advanceApplied: number }>('/api/fees/invoices', {
        method: 'POST',
        body: {
          title: title.trim(),
          dueDate,
          notify,
          items: items.map((it) => ({ description: it.description.trim(), amount: Number(it.amount), feeHeadId: it.feeHeadId || null })),
          ...(target === 'students' ? { studentIds: picked.map((p) => p.id) } : { classId, sectionId: sectionId || undefined }),
        },
      });
      toast.success(`${r.created} invoice${r.created === 1 ? '' : 's'} raised${r.advanceApplied ? ` · ${formatINR(r.advanceApplied)} paid from advance` : ''}`);
      onDone();
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Instant invoice"
      description="Charge a one-off amount — a trip, costume, re-exam or lost ID card — without changing the fee structure. Advance balances are used automatically."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button loading={busy} disabled={!ready} onClick={submit}>
            Raise {total > 0 ? formatINR(total) : ''} invoice
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
          <Field label="What is it for?" required>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Science City trip" maxLength={80} />
          </Field>
          <Field label="Due date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </Field>
        </div>
        <Field label="Bill to">
          <Segmented value={target} onChange={setTarget} options={[{ value: 'students', label: 'Chosen students' }, { value: 'class', label: 'Whole class / section' }]} />
        </Field>
        {target === 'students' ? (
          <div className="space-y-2">
            <StudentPicker value={null} onChange={(s) => s && !picked.some((p) => p.id === s.id) && setPicked((list) => [...list, s])} placeholder="Add a student…" />
            <div className="flex flex-wrap gap-2">
              {picked.map((p) => (
                <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                  {p.name} · {p.classLabel}
                  <button type="button" aria-label={`Remove ${p.name}`} onClick={() => setPicked((list) => list.filter((x) => x.id !== p.id))}>
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Class" required>
              <Select value={classId} onChange={(e) => { setClassId(e.target.value); setSectionId(''); }} options={classOptions(lk)} placeholder="Choose…" />
            </Field>
            <Field label="Section">
              <Select value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sectionOptions(lk, classId)} placeholder="All sections" />
            </Field>
          </div>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">Items</p>
          {items.map((it, i) => (
            <div key={i} className="grid grid-cols-[1fr_7rem_auto] gap-2 sm:grid-cols-[1fr_10rem_7rem_auto]">
              <Input value={it.description} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} placeholder="Bus and entry ticket" aria-label="Item description" />
              <Select className="hidden sm:block" value={it.feeHeadId} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, feeHeadId: e.target.value } : x)))} options={(heads ?? []).filter((h) => h.isActive).map((h) => ({ value: h.id, label: h.name }))} placeholder="Fee head (optional)" aria-label="Fee head" />
              <Input type="number" min={1} step="0.01" value={it.amount} onChange={(e) => setItems((l) => l.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))} placeholder="₹" aria-label="Amount" />
              <Button variant="ghost" size="icon-sm" aria-label="Remove item" disabled={items.length === 1} onClick={() => setItems((l) => l.filter((_, j) => j !== i))}>
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button variant="ghost" size="sm" disabled={items.length >= 20} onClick={() => setItems((l) => [...l, { description: '', amount: '', feeHeadId: '' }])}>
            <Plus /> Add item
          </Button>
        </div>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={notify} onCheckedChange={setNotify} /> Notify parents in the app
        </label>
      </div>
    </Dialog>
  );
}

/** Fees import: opening dues or past receipts from a spreadsheet. */
export function FeesImportDialog({ open, onOpenChange, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void }) {
  const [kind, setKind] = React.useState<'DUES' | 'PAYMENTS'>('DUES');
  const spec: { columns: string[]; required: string[]; sample: Record<string, string> } =
    kind === 'DUES'
      ? { columns: ['admissionNo', 'title', 'amount', 'dueDate', 'description'], required: ['admissionNo', 'title', 'amount', 'dueDate'], sample: { admissionNo: 'ADM00001', title: 'Opening balance 2025-26', amount: '4500', dueDate: '30/04/2026', description: 'Dues carried from previous software' } }
      : { columns: ['admissionNo', 'amount', 'date', 'mode', 'reference', 'remarks'], required: ['admissionNo', 'amount', 'date'], sample: { admissionNo: 'ADM00001', amount: '2500', date: '05/04/2026', mode: 'UPI', reference: '412345678901', remarks: 'April fee' } };
  return (
    <CsvImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title={kind === 'DUES' ? 'Import dues' : 'Import past receipts'}
      description={kind === 'DUES' ? 'Each row becomes an invoice — use it for opening balances when moving from another system.' : 'Each row becomes a receipt allocated to the oldest dues; amounts beyond the dues are kept as advance if allowed.'}
      endpoint="/api/fees/import"
      extra={{ kind }}
      {...spec}
      onDone={onDone}
    >
      <Segmented value={kind} onChange={setKind} options={[{ value: 'DUES', label: 'Dues / opening balances' }, { value: 'PAYMENTS', label: 'Past receipts' }]} />
    </CsvImportDialog>
  );
}
