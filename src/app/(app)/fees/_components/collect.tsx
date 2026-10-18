'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Printer, Receipt, RotateCcw, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate, formatINR, periodLabel, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, StatusBadge } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Switch } from '@/components/ui/form';

interface Due {
  id: string;
  invoiceNo: string;
  period: string;
  title?: string | null;
  dueDate: string;
  total: number;
  paidAmount: number;
  balance: number;
  lateFee: number;
  overdue: boolean;
  status: string;
  studentId: string;
  studentName: string;
  items: Array<{ id: string; description: string; amount: number; discount: number }>;
}
interface DuesRes {
  student: { id: string; name: string; admissionNo: string; classLabel: string; photoUrl: string | null; guardianId: string | null; guardian: { fatherName: string | null; primaryPhone: string; familyCode: string | null } | null };
  members: string[];
  totalDue: number;
  advance: number;
  allowAdvance: boolean;
  overdue: number;
  invoices: Due[];
  recent: Array<{ id: string; receiptNo: string; amount: number; mode: string; paidAt: string; status: string }>;
}

const MODES = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card / POS' },
  { value: 'NET_BANKING', label: 'Net banking' },
  { value: 'BANK_TRANSFER', label: 'Bank transfer / NEFT' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'DD', label: 'Demand draft' },
];

export function CollectFee() {
  const params = useSearchParams();
  const { me } = useApp();
  const invalidate = useInvalidate();
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [family, setFamily] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [amount, setAmount] = React.useState('');
  const [mode, setMode] = React.useState('CASH');
  const [reference, setReference] = React.useState('');
  const [chequeNo, setChequeNo] = React.useState('');
  const [bankName, setBankName] = React.useState('');
  const [date, setDate] = React.useState(todayISO());
  const [remarks, setRemarks] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<Array<{ id: string; receiptNo: string; amount: number }> | null>(null);
  const preselect = params.get('studentId');

  const { data: pre } = useApiQuery<PickedStudent & { name: string }>(preselect && !student ? `/api/students/${preselect}` : null);
  React.useEffect(() => {
    if (pre && !student) setStudent({ id: pre.id, name: pre.name, admissionNo: pre.admissionNo, classLabel: pre.classLabel, photoUrl: pre.photoUrl });
  }, [pre, student]);

  const { data, isLoading, refetch } = useApiQuery<DuesRes>(student ? '/api/fees/dues' : null, { studentId: student?.id, family: family ? '1' : '0' });

  React.useEffect(() => {
    if (data) {
      setSelected(Object.fromEntries(data.invoices.map((i) => [i.id, true])));
      setDone(null);
    }
  }, [data]);

  const chosen = (data?.invoices ?? []).filter((i) => selected[i.id]);
  const chosenTotal = Math.round(chosen.reduce((a, i) => a + i.balance, 0) * 100) / 100;
  React.useEffect(() => setAmount(chosenTotal ? String(chosenTotal) : ''), [chosenTotal]);

  const needsRef = ['UPI', 'NET_BANKING', 'BANK_TRANSFER', 'CARD'].includes(mode);
  const needsCheque = ['CHEQUE', 'DD'].includes(mode);
  const amt = Number(amount);
  const partial = amt > 0 && amt < chosenTotal;
  const partialBlocked = partial && !me.settings.fees.allowPartialPayment;
  const extra = Math.round((amt - chosenTotal) * 100) / 100;
  const advanceMode = !!data?.allowAdvance && (!data.invoices.length || chosen.length === data.invoices.length);
  const tooMuch = extra > 0 && !advanceMode;

  async function collect() {
    if (!data || (!chosen.length && !advanceMode)) return;
    setBusy(true);
    try {
      const res = await api<Array<{ id: string; receiptNo: string; amount: number }>>('/api/fees/collect', {
        method: 'POST',
        body: { studentIds: family ? data.members : [data.student.id], invoiceIds: chosen.length ? chosen.map((i) => i.id) : undefined, amount: amt, mode, paidAt: date, referenceNo: reference || null, chequeNo: chequeNo || null, bankName: bankName || null, remarks: remarks || null },
      });
      setDone(res);
      toast.success(`Collected ${formatINR(amt)} · ${res.map((r) => r.receiptNo).join(', ')}`);
      setReference('');
      setChequeNo('');
      setRemarks('');
      invalidate(['/api/fees', '/api/dashboard', '/api/students']);
      refetch();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Collection failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div className="space-y-4">
        <Card>
          <CardBody className="flex flex-wrap items-center gap-3">
            <StudentPicker value={student} onChange={(s) => { setStudent(s); setFamily(false); }} className="min-w-[18rem] flex-1" />
            {data?.student.guardianId && (
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={family} onCheckedChange={setFamily} /> <Users className="size-4 text-ink-faint" /> Whole family
              </label>
            )}
          </CardBody>
        </Card>

        {!student ? (
          <Card>
            <EmptyState icon={Receipt} title="Find a student to collect fees" description="Search by name, admission number or parent’s mobile. Turn on “Whole family” to collect for all siblings in one go." />
          </Card>
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : (
          <Card>
            <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
              <Avatar name={data.student.name} src={data.student.photoUrl} size={44} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{data.student.name}</p>
                <p className="text-xs text-ink-soft">
                  {data.student.admissionNo} · {data.student.classLabel} · {data.student.guardian?.fatherName} · {data.student.guardian?.primaryPhone}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-faint">Total outstanding{family ? ' (family)' : ''}</p>
                <p className={cn('text-xl font-bold', data.totalDue > 0 ? 'text-rose-600' : 'text-emerald-600')}>{formatINR(data.totalDue)}</p>
                {data.advance > 0 && <p className="text-xs font-medium text-emerald-600">Advance balance {formatINR(data.advance)}</p>}
              </div>
            </div>
            {data.invoices.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No pending dues" description={data.allowAdvance ? 'All invoices are paid. You can still take an advance — it is used automatically on the next invoices.' : 'All invoices are paid.'} />
            ) : (
              <ul className="divide-y divide-line">
                {data.invoices.map((inv) => (
                  <li key={inv.id} className="flex items-start gap-3 px-5 py-3">
                    <Checkbox className="mt-1" checked={!!selected[inv.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [inv.id]: !!v }))} aria-label={`Select ${inv.invoiceNo}`} />
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                        {periodLabel(inv.period, inv.title)} {family && <span className="text-xs font-normal text-ink-soft">· {inv.studentName}</span>}
                        {inv.overdue && <Badge tone="danger">Overdue</Badge>}
                        <StatusBadge status={inv.status} />
                      </p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {inv.invoiceNo} · due {formatDate(inv.dueDate)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-soft">
                        {inv.items.map((it) => (
                          <span key={it.id}>
                            {it.description}: {formatINR(it.amount - it.discount, true)}
                            {it.discount > 0 && <span className="text-emerald-600"> (−{formatINR(it.discount, true)})</span>}
                          </span>
                        ))}
                        {inv.lateFee > 0 && <span className="text-rose-600">Late fee: {formatINR(inv.lateFee, true)}</span>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatINR(inv.balance)}</p>
                      {inv.paidAmount > 0 && <p className="text-[11px] text-ink-faint">paid {formatINR(inv.paidAmount, true)}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card className="xl:sticky xl:top-20">
          <CardHeader title="Payment" icon={Receipt} />
          <CardBody className="space-y-4">
            {done ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
                <p className="font-semibold">Payment recorded</p>
                {done.map((r) => (
                  <div key={r.id} className="flex items-center justify-between rounded-xl border border-line px-3 py-2 text-sm">
                    <span>
                      {r.receiptNo} · {formatINR(r.amount, true)}
                    </span>
                    <Button size="sm" variant="secondary" onClick={() => window.open(`/print/receipt/${r.id}`, '_blank')}>
                      <Printer /> Print
                    </Button>
                  </div>
                ))}
                <Button variant="ghost" onClick={() => { setDone(null); setStudent(null); }}>
                  <RotateCcw /> Next student
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-xl bg-canvas p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-ink-soft">Selected invoices</span>
                    <span>{chosen.length}</span>
                  </div>
                  <div className="mt-1 flex justify-between font-semibold">
                    <span>Payable</span>
                    <span>{formatINR(chosenTotal)}</span>
                  </div>
                </div>
                <Field
                  label="Amount received"
                  error={partialBlocked ? 'Partial payment is disabled in settings' : tooMuch ? (data?.allowAdvance ? 'Select all invoices to take extra as advance' : 'More than the selected dues') : undefined}
                  hint={partial && !partialBlocked ? 'Partial payment — allocated to the oldest dues first' : extra > 0 && advanceMode ? `${formatINR(extra)} will be kept as advance for future fees` : undefined}
                >
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-faint">₹</span>
                    <Input type="number" inputMode="decimal" min={1} max={advanceMode ? undefined : chosenTotal} step="0.01" className="pl-7 text-lg font-semibold" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </div>
                </Field>
                <Field label="Payment mode">
                  <Select value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} />
                </Field>
                {needsRef && (
                  <Field label="Transaction / UTR reference" required>
                    <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. 4321098765" />
                  </Field>
                )}
                {needsCheque && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Cheque / DD no." required>
                      <Input value={chequeNo} onChange={(e) => setChequeNo(e.target.value)} />
                    </Field>
                    <Field label="Bank">
                      <Input value={bankName} onChange={(e) => setBankName(e.target.value)} />
                    </Field>
                  </div>
                )}
                <Field label="Payment date">
                  <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
                </Field>
                <Field label="Remarks">
                  <Input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
                </Field>
                <Button
                  className="w-full"
                  size="lg"
                  loading={busy}
                  disabled={(!chosen.length && !advanceMode) || !(amt > 0) || tooMuch || partialBlocked || (needsRef && !reference) || (needsCheque && !chequeNo)}
                  onClick={collect}
                >
                  Collect {amt > 0 ? formatINR(amt) : ''}
                </Button>
              </>
            )}
          </CardBody>
        </Card>
        {data && data.recent.length > 0 && (
          <Card>
            <CardHeader title="Recent receipts" />
            <ul className="divide-y divide-line">
              {data.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <div>
                    <p className={cn('font-medium', r.status === 'CANCELLED' && 'line-through opacity-60')}>{r.receiptNo}</p>
                    <p className="text-xs text-ink-faint">
                      {formatDate(r.paidAt)} · {r.mode}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Print" onClick={() => window.open(`/print/receipt/${r.id}`, '_blank')}>
                    <Printer />
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
