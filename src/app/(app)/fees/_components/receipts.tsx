'use client';

import * as React from 'react';
import { Download, MoreHorizontal, Printer, Search, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { cn, downloadCsv, formatDateTime, formatINR, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Card, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';
import { Menu, MenuContent, MenuItem, MenuTrigger, usePrompt } from '@/components/ui/overlay';

interface PaymentRow {
  id: string;
  receiptNo: string;
  amount: number;
  mode: string;
  status: string;
  referenceNo: string | null;
  chequeNo: string | null;
  paidAt: string;
  collectedByName: string | null;
  cancelReason: string | null;
  studentName: string;
  admissionNo: string;
  classLabel: string;
}

export function Receipts() {
  const { can } = useApp();
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const monthStart = todayISO().slice(0, 8) + '01';
  const [from, setFrom] = React.useState(monthStart);
  const [to, setTo] = React.useState(todayISO());
  const [mode, setMode] = React.useState('');
  const [status, setStatus] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const params = { from, to, mode: mode || undefined, status: status || undefined, search: search || undefined, page, pageSize: 25 };
  const { data, isLoading, error } = usePagedQuery<PaymentRow>('/api/fees/payments', params);
  const sum = (data as unknown as { sumAmount?: number })?.sumAmount ?? 0;

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="h-9 w-40" aria-label="From" />
        <span className="text-xs text-ink-faint">to</span>
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="h-9 w-40" aria-label="To" />
        <Select className="h-9 w-36" value={mode} onChange={(e) => { setMode(e.target.value); setPage(1); }} options={['CASH', 'UPI', 'CARD', 'NET_BANKING', 'BANK_TRANSFER', 'CHEQUE', 'DD', 'ONLINE'].map((m) => ({ value: m, label: m.replace('_', ' ') }))} placeholder="Any mode" />
        <Select className="h-9 w-32" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} options={[{ value: 'SUCCESS', label: 'Valid' }, { value: 'CANCELLED', label: 'Cancelled' }]} placeholder="All" />
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Receipt, UTR or student" className="h-9 pl-9" />
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="ml-auto"
          disabled={!data?.data.length}
          onClick={() =>
            downloadCsv(`receipts-${from}-to-${to}`, (data?.data ?? []).map((p) => ({ Receipt: p.receiptNo, Date: p.paidAt.slice(0, 10), Student: p.studentName, 'Adm No': p.admissionNo, Class: p.classLabel, Mode: p.mode, Reference: p.referenceNo ?? p.chequeNo ?? '', Amount: p.amount, Status: p.status, 'Collected by': p.collectedByName ?? 'Online' })))
          }
        >
          <Download /> Export page
        </Button>
      </div>
      <div className="border-b border-line px-5 py-3 text-sm">
        Total collected in range: <b className="text-emerald-600">{formatINR(sum)}</b> · {data?.total ?? 0} receipts
      </div>
      <DataTable<PaymentRow>
        data={data?.data}
        loading={isLoading}
        error={error?.message}
        pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
        emptyTitle="No receipts in this range"
        columns={[
          { accessorKey: 'receiptNo', header: 'Receipt', cell: ({ row }) => <div><p className={cn('font-medium', row.original.status === 'CANCELLED' && 'line-through opacity-60')}>{row.original.receiptNo}</p><p className="text-xs text-ink-faint">{formatDateTime(row.original.paidAt)}</p></div> },
          { accessorKey: 'studentName', header: 'Student', cell: ({ row }) => <div><p>{row.original.studentName}</p><p className="text-xs text-ink-faint">{row.original.admissionNo} · {row.original.classLabel}</p></div> },
          { accessorKey: 'mode', header: 'Mode', cell: ({ row }) => <div><p>{row.original.mode.replace('_', ' ')}</p><p className="text-xs text-ink-faint">{row.original.referenceNo ?? row.original.chequeNo ?? ''}</p></div> },
          { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => <span className="font-semibold">{formatINR(getValue())}</span> },
          { accessorKey: 'collectedByName', header: 'Collected by', cell: ({ getValue }) => <span className="text-sm text-ink-soft">{getValue() ?? 'Online'}</span> },
          { accessorKey: 'status', header: 'Status', cell: ({ row }) => <span title={row.original.cancelReason ?? ''}><StatusBadge status={row.original.status} label={row.original.status === 'SUCCESS' ? 'Valid' : undefined} /></span> },
          {
            id: 'a',
            header: '',
            cell: ({ row }) => (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label="Receipt actions">
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => window.open(`/print/receipt/${row.original.id}`, '_blank')}>
                    <Printer /> Print receipt
                  </MenuItem>
                  {can('fees', 'delete') && row.original.status === 'SUCCESS' && (
                    <MenuItem
                      danger
                      onSelect={async () => {
                        const reason = await prompt({ title: `Cancel receipt ${row.original.receiptNo}?`, description: 'The amount goes back to the student’s dues and the ledger entry is removed. The receipt stays on record as cancelled.', label: 'Reason', placeholder: 'e.g. cheque bounced', minLength: 3, confirmLabel: 'Cancel receipt' });
                        if (!reason) return;
                        try {
                          await api(`/api/fees/payments/${row.original.id}`, { method: 'POST', body: { reason } });
                          toast.success('Receipt cancelled');
                          invalidate(['/api/fees', '/api/dashboard']);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <XCircle /> Cancel receipt
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            ),
          },
        ]}
      />
    </Card>
  );
}
