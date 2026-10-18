'use client';

import * as React from 'react';
import { BadgeIndianRupee, CheckCircle2, CreditCard, FlaskConical, Printer, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate, formatINR, periodLabel } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader, StatCard, StatusBadge } from '@/components/ui/display';
import { Checkbox } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Overview {
  fees?: {
    billed: number;
    paid: number;
    due: number;
    advance?: number;
    invoices: Array<{ id: string; invoiceNo: string; period: string; title?: string | null; dueDate: string; total: number; paidAmount: number; status: string; items: Array<{ id: string; description: string; amount: number; discount: number }> }>;
    payments: Array<{ id: string; receiptNo: string; amount: number; mode: string; paidAt: string; status: string }>;
  };
}

interface OrderRes {
  paymentId: string;
  orderId: string;
  amount: number;
  keyId: string | null;
  sandbox: boolean;
  name: string;
  description: string;
  prefill: { name: string };
}

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load the payment page. Check your connection.'));
    document.body.appendChild(s);
  });
}

export function FamilyFees() {
  const child = useFocusChild();
  const { me } = useApp();
  const invalidate = useInvalidate();
  const { data, isLoading, refetch } = useApiQuery<Overview>(child ? `/api/students/${child.id}/overview` : null);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [busy, setBusy] = React.useState(false);
  const [sandboxOrder, setSandboxOrder] = React.useState<OrderRes | null>(null);
  const [success, setSuccess] = React.useState<{ receiptNo: string; paymentId: string } | null>(null);

  const due = (data?.fees?.invoices ?? []).filter((i) => i.status === 'UNPAID' || i.status === 'PARTIAL');
  React.useEffect(() => setSelected(Object.fromEntries(due.map((i) => [i.id, true]))), [data]); // eslint-disable-line react-hooks/exhaustive-deps
  const chosen = due.filter((i) => selected[i.id]);
  const chosenTotal = chosen.reduce((a, i) => a + i.total - i.paidAmount, 0);

  async function finish(body: Record<string, unknown>) {
    const r = await api<{ receiptNo: string; paymentId: string }>('/api/fees/online/verify', { method: 'POST', body });
    setSuccess(r);
    invalidate(['/api/students', '/api/dashboard', '/api/notifications']);
    refetch();
  }

  async function pay() {
    if (!child || !chosen.length) return;
    setBusy(true);
    try {
      const order = await api<OrderRes>('/api/fees/online/order', { method: 'POST', body: { studentId: child.id, invoiceIds: chosen.map((i) => i.id) } });
      if (order.sandbox) {
        setSandboxOrder(order);
        return;
      }
      await loadCheckout();
      const rzp = new window.Razorpay!({
        key: order.keyId,
        amount: order.amount,
        currency: 'INR',
        order_id: order.orderId,
        name: order.name,
        description: order.description,
        prefill: order.prefill,
        theme: { color: '#4f46e5' },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await finish({ paymentId: order.paymentId, razorpayOrderId: resp.razorpay_order_id, razorpayPaymentId: resp.razorpay_payment_id, razorpaySignature: resp.razorpay_signature });
          } catch (e) {
            toast.error((e as Error).message);
          }
        },
      });
      rzp.on('payment.failed', () => toast.error('Payment failed. No money was deducted, or it will be refunded automatically.'));
      rzp.open();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : (e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!child) return <EmptyState title="No student linked to this account" />;
  return (
    <>
      <PageHeader title="Fees" description={`${child.name} · ${child.classLabel}`} icon={BadgeIndianRupee} />
      {isLoading || !data?.fees ? (
        <LoadingBlock />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Due now" value={formatINR(data.fees.due, true)} icon={BadgeIndianRupee} tone={data.fees.due > 0 ? 'rose' : 'emerald'} hint={data.fees.advance ? `Advance with school: ${formatINR(data.fees.advance, true)}` : undefined} />
              <StatCard label="Paid this session" value={formatINR(data.fees.paid, true)} icon={CheckCircle2} tone="emerald" />
              <StatCard label="Billed this session" value={formatINR(data.fees.billed, true)} icon={CreditCard} />
            </div>
            <Card>
              <CardHeader title="Invoices" />
              <ul className="divide-y divide-line">
                {data.fees.invoices.map((i) => {
                  const open = i.status === 'UNPAID' || i.status === 'PARTIAL';
                  return (
                    <li key={i.id} className="flex items-start gap-3 px-5 py-3">
                      {open && me.settings.fees.onlinePaymentEnabled ? (
                        <Checkbox className="mt-1" checked={!!selected[i.id]} onCheckedChange={(v) => setSelected((s) => ({ ...s, [i.id]: !!v }))} aria-label={`Select ${periodLabel(i.period, i.title)}`} />
                      ) : (
                        <span className="w-[18px]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                          {periodLabel(i.period, i.title)} <StatusBadge status={i.status} />
                        </p>
                        <p className="text-xs text-ink-faint">
                          {i.invoiceNo} · due {formatDate(i.dueDate)}
                        </p>
                        <p className="mt-1 text-xs text-ink-soft">{i.items.map((it) => `${it.description} ${formatINR(it.amount - it.discount, true)}`).join(' · ')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{formatINR(i.total, true)}</p>
                        {i.paidAmount > 0 && open && <p className="text-[11px] text-emerald-600">paid {formatINR(i.paidAmount, true)}</p>}
                        <button className="mt-1 text-[11px] text-brand-600 hover:underline" onClick={() => window.open(`/print/invoice/${i.id}`, '_blank')}>
                          Challan
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </div>
          <div className="space-y-6">
            <Card className={cn(data.fees.due > 0 && 'ring-2 ring-brand-500/20')}>
              <CardHeader title="Pay online" icon={ShieldCheck} description="UPI, cards, net banking and wallets via Razorpay" />
              <CardBody className="space-y-4">
                {!me.settings.fees.onlinePaymentEnabled ? (
                  <p className="text-sm text-ink-soft">Online payment is not enabled by the school. Please pay at the school office or use the bank details on the challan.</p>
                ) : due.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-emerald-700">
                    <CheckCircle2 className="size-4" /> No dues. Thank you!
                  </p>
                ) : (
                  <>
                    <div className="flex items-end justify-between">
                      <span className="text-sm text-ink-soft">{chosen.length} invoice(s) selected</span>
                      <span className="text-2xl font-bold">{formatINR(chosenTotal, true)}</span>
                    </div>
                    <Button className="w-full" size="lg" loading={busy} disabled={!chosen.length} onClick={pay}>
                      Pay {formatINR(chosenTotal, true)}
                    </Button>
                    <p className="text-[11px] text-ink-faint">A receipt is issued instantly once the payment is confirmed by the bank.</p>
                  </>
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Receipts" />
              {data.fees.payments.length === 0 ? (
                <EmptyState title="No payments yet" />
              ) : (
                <ul className="divide-y divide-line">
                  {data.fees.payments.filter((p) => p.status !== 'PENDING').map((p) => (
                    <li key={p.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <div>
                        <p className={cn('font-medium', p.status === 'CANCELLED' && 'line-through opacity-60')}>{p.receiptNo}</p>
                        <p className="text-xs text-ink-faint">
                          {formatDate(p.paidAt)} · {p.mode}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{formatINR(p.amount, true)}</span>
                        <Button variant="ghost" size="icon-sm" aria-label="Download receipt" onClick={() => window.open(`/print/receipt/${p.id}`, '_blank')}>
                          <Printer />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}

      <Dialog
        open={!!sandboxOrder}
        onOpenChange={(o) => !o && setSandboxOrder(null)}
        title="Test payment (sandbox)"
        description="No real money moves. This simulator is only available in local demo mode; production uses Razorpay."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSandboxOrder(null)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                const o = sandboxOrder!;
                setSandboxOrder(null);
                try {
                  await finish({ paymentId: o.paymentId, sandbox: true });
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Simulate success
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
          <FlaskConical className="size-5 shrink-0" />
          <span>
            {sandboxOrder?.description} — <b>{formatINR((sandboxOrder?.amount ?? 0) / 100, true)}</b>
          </span>
        </div>
      </Dialog>
      <Dialog open={!!success} onOpenChange={(o) => !o && setSuccess(null)} title="Payment successful" size="sm" footer={<Button onClick={() => window.open(`/print/receipt/${success?.paymentId}`, '_blank')}><Printer /> Download receipt</Button>}>
        <div className="flex flex-col items-center gap-2 py-4 text-center">
          <CheckCircle2 className="size-12 text-emerald-500" />
          <p className="text-sm">
            Receipt <Badge tone="success">{success?.receiptNo}</Badge> has been issued.
          </p>
        </div>
      </Dialog>
    </>
  );
}
