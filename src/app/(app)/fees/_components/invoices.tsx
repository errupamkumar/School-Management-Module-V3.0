'use client';

import * as React from 'react';
import { FilePlus2, FileUp, Printer, Search, XCircle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, useLookups } from '@/lib/lookups';
import { currentPeriod, formatDate, formatINR, periodLabel } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Card, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Segmented, Select, Switch } from '@/components/ui/form';
import { FeesImportDialog, InstantInvoiceDialog } from './instant';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, usePrompt } from '@/components/ui/overlay';
import { MoreHorizontal } from 'lucide-react';

interface InvoiceRow {
  id: string;
  invoiceNo: string;
  period: string;
  title?: string | null;
  dueDate: string;
  total: number;
  paidAmount: number;
  balance: number;
  status: string;
  studentName: string;
  admissionNo: string;
  classLabel: string;
}

export function Invoices() {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const prompt = usePrompt();
  const { data: lk } = useLookups(['classes']);
  const [period, setPeriod] = React.useState(currentPeriod());
  const [classId, setClassId] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const [genOpen, setGenOpen] = React.useState(false);
  const [instantOpen, setInstantOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [kind, setKind] = React.useState<'month' | 'instant'>('month');
  const { data, isLoading, error } = usePagedQuery<InvoiceRow>('/api/fees/invoices', { period: kind === 'instant' ? 'INSTANT' : period || undefined, classId: classId || undefined, status: status || undefined, search: search || undefined, page, pageSize: 25 });
  const meta = data as unknown as { sumTotal?: number; sumPaid?: number } | undefined;

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Segmented size="sm" value={kind} onChange={(v) => { setKind(v); setPage(1); }} options={[{ value: 'month', label: 'Monthly' }, { value: 'instant', label: 'One-off' }]} />
          {kind === 'month' && <Input type="month" value={period} onChange={(e) => { setPeriod(e.target.value); setPage(1); }} className="h-9 w-40" aria-label="Billing month" />}
          <Select className="h-9 w-36" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} options={classOptions(lk)} placeholder="All classes" />
          <Select
            className="h-9 w-36"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[{ value: 'DUE', label: 'Unpaid + partial' }, { value: 'UNPAID', label: 'Unpaid' }, { value: 'PARTIAL', label: 'Partial' }, { value: 'PAID', label: 'Paid' }, { value: 'CANCELLED', label: 'Cancelled' }]}
            placeholder="Any status"
          />
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Invoice no. or student" className="h-9 pl-9" />
          </div>
          {can('fees', 'create') && (
            <div className="ml-auto flex flex-wrap gap-2">
              <Button size="sm" variant="ghost" onClick={() => setImportOpen(true)}>
                <FileUp /> Import
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setInstantOpen(true)}>
                <Zap /> Instant invoice
              </Button>
              <Button size="sm" onClick={() => setGenOpen(true)}>
                <FilePlus2 /> Generate invoices
              </Button>
            </div>
          )}
        </div>
        {data && (
          <div className="flex flex-wrap gap-6 border-b border-line px-5 py-3 text-sm">
            <span>
              Billed <b>{formatINR(meta?.sumTotal ?? 0, true)}</b>
            </span>
            <span>
              Collected <b className="text-emerald-600">{formatINR(meta?.sumPaid ?? 0, true)}</b>
            </span>
            <span>
              Balance <b className="text-rose-600">{formatINR((meta?.sumTotal ?? 0) - (meta?.sumPaid ?? 0), true)}</b>
            </span>
          </div>
        )}
        <DataTable<InvoiceRow>
          data={data?.data}
          loading={isLoading}
          error={error?.message}
          pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
          emptyTitle="No invoices for this filter"
          emptyDescription="Generate the month’s invoices from the fee structure."
          columns={[
            { accessorKey: 'invoiceNo', header: 'Invoice', cell: ({ row }) => <div><p className="font-medium">{row.original.invoiceNo}</p><p className="text-xs text-ink-faint">{periodLabel(row.original.period, row.original.title)}</p></div> },
            { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p>{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.admissionNo} · {row.original.classLabel}</p></div> },
            { accessorKey: 'dueDate', header: 'Due', cell: ({ getValue }) => formatDate(getValue()) },
            { accessorKey: 'total', header: 'Amount', cell: ({ getValue }) => formatINR(getValue(), true) },
            { accessorKey: 'balance', header: 'Balance', cell: ({ getValue }) => <span className={Number(getValue()) > 0 ? 'font-semibold text-rose-600' : ''}>{formatINR(getValue(), true)}</span> },
            { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
            {
              id: 'a',
              header: '',
              cell: ({ row }) => (
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Invoice actions">
                      <MoreHorizontal />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem onSelect={() => window.open(`/print/invoice/${row.original.id}`, '_blank')}>
                      <Printer /> Print challan
                    </MenuItem>
                    {can('fees', 'delete') && row.original.paidAmount === 0 && row.original.status !== 'CANCELLED' && (
                      <MenuItem
                        danger
                        onSelect={async () => {
                          const reason = await prompt({ title: `Cancel invoice ${row.original.invoiceNo}?`, label: 'Reason', placeholder: 'e.g. raised twice by mistake', minLength: 3, confirmLabel: 'Cancel invoice' });
                          if (!reason) return;
                          try {
                            await api(`/api/fees/invoices/${row.original.id}`, { method: 'DELETE', body: { reason } });
                            toast.success('Invoice cancelled');
                            invalidate(['/api/fees']);
                          } catch (e) {
                            toast.error((e as Error).message);
                          }
                        }}
                      >
                        <XCircle /> Cancel invoice
                      </MenuItem>
                    )}
                  </MenuContent>
                </Menu>
              ),
            },
          ]}
        />
      </Card>
      <GenerateDialog open={genOpen} onOpenChange={setGenOpen} defaultPeriod={period} onDone={() => invalidate(['/api/fees', '/api/dashboard'])} />
      <InstantInvoiceDialog open={instantOpen} onOpenChange={setInstantOpen} onDone={() => { setKind('instant'); invalidate(['/api/fees', '/api/dashboard']); }} />
      <FeesImportDialog open={importOpen} onOpenChange={setImportOpen} onDone={() => invalidate(['/api/fees', '/api/dashboard'])} />
    </>
  );
}

function GenerateDialog({ open, onOpenChange, defaultPeriod, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; defaultPeriod: string; onDone: () => void }) {
  const { data: lk } = useLookups(['classes']);
  const [period, setPeriod] = React.useState(defaultPeriod);
  const [all, setAll] = React.useState(true);
  const [classIds, setClassIds] = React.useState<string[]>([]);
  const [notify, setNotify] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setPeriod(defaultPeriod), [defaultPeriod, open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Generate monthly invoices"
      description="Creates one invoice per active student from the fee structure, applying discounts, concessions and transport fees. Students who already have an invoice for the month are skipped."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={!period || (!all && !classIds.length)}
            onClick={async () => {
              setBusy(true);
              try {
                const r = await api<{ created: number; skipped: number; empty: number; advanceInvoices: number }>('/api/fees/invoices/generate', { method: 'POST', body: { period, classIds: all ? undefined : classIds, notify } });
                toast.success(`${r.created} invoices generated · ${r.skipped} already existed${r.empty ? ` · ${r.empty} had nothing to bill` : ''}${r.advanceInvoices ? ` · ${r.advanceInvoices} settled from advance` : ''}`);
                onDone();
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Generate for {periodLabel(period)}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Billing month">
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </Field>
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={all} onCheckedChange={setAll} /> All classes
        </label>
        {!all && (
          <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto rounded-xl border border-line p-3 sm:grid-cols-3">
            {(lk?.classes ?? []).map((c) => (
              <label key={c.id} className="flex items-center gap-2 text-sm">
                <Checkbox checked={classIds.includes(c.id)} onCheckedChange={(v) => setClassIds((ids) => (v ? [...ids, c.id] : ids.filter((x) => x !== c.id)))} /> {c.label}
              </label>
            ))}
          </div>
        )}
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={notify} onCheckedChange={setNotify} /> Notify parents in the app
        </label>
      </div>
    </Dialog>
  );
}
