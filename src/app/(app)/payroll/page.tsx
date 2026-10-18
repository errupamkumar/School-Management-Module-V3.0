'use client';

import * as React from 'react';
import { Banknote, CheckCircle2, Download, Printer, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { RowSelectionState } from '@tanstack/react-table';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { currentPeriod, downloadCsv, formatDate, formatINR, periodLabel, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardHeader, EmptyState, LoadingBlock, PageHeader, StatCard } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Field, Input, Select } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, useConfirm } from '@/components/ui/overlay';

interface Row {
  employeeId: string;
  name: string;
  code: string;
  designation: string;
  photoUrl: string | null;
  bank: string | null;
  basic: number;
  allowances: number;
  deductions: number;
  net: number;
  slip: { id: string; slipNo: string; net: number; paidAt: string; mode: string } | null;
}

function SalarySheet() {
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { can } = useApp();
  const [month, setMonth] = React.useState(currentPeriod());
  const { data, isLoading } = useApiQuery<{ rows: Row[]; totals: { payable: number; paid: number } }>('/api/payroll', { month });
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [edits, setEdits] = React.useState<Record<string, { bonus: number; deductions: number }>>({});
  const [payOpen, setPayOpen] = React.useState(false);
  const [mode, setMode] = React.useState('BANK_TRANSFER');
  const [paidOn, setPaidOn] = React.useState(todayISO());
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    setSelection({});
    setEdits({});
  }, [month]);
  const unpaid = (data?.rows ?? []).filter((r) => !r.slip);
  const ids = Object.keys(selection).filter((k) => selection[k] && unpaid.some((u) => u.employeeId === k));
  const net = (r: Row) => r.basic + r.allowances + (edits[r.employeeId]?.bonus ?? 0) - (edits[r.employeeId]?.deductions ?? r.deductions);
  const selectedTotal = unpaid.filter((r) => ids.includes(r.employeeId)).reduce((a, r) => a + net(r), 0);

  return (
    <>
      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <Field label="Salary month">
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
          </Field>
        </Card>
        <StatCard label="Payable" value={formatINR(data?.totals.payable ?? 0, true)} icon={Banknote} />
        <StatCard label="Paid" value={formatINR(data?.totals.paid ?? 0, true)} icon={CheckCircle2} tone="emerald" hint={`${(data?.rows.length ?? 0) - unpaid.length} of ${data?.rows.length ?? 0} staff`} />
      </div>
      <Card>
        <CardHeader
          title={`Salary sheet · ${periodLabel(month)}`}
          actions={
            <>
              <Button variant="secondary" size="sm" disabled={!data?.rows.length} onClick={() => downloadCsv(`salary-sheet-${month}`, data!.rows.map((r) => ({ Code: r.code, Name: r.name, Designation: r.designation, Basic: r.basic, Allowances: r.allowances, Deductions: r.deductions, Net: r.net, Bank: r.bank ?? '', Status: r.slip ? `Paid ${r.slip.slipNo}` : 'Unpaid' })))}>
                <Download /> Bank sheet (CSV)
              </Button>
              {can('payroll', 'edit') && (
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="secondary" size="sm">
                      <Download /> Paybooks
                    </Button>
                  </MenuTrigger>
                  <MenuContent align="end">
                    <MenuLabel>Export for Paybooks payroll</MenuLabel>
                    <MenuItem onSelect={() => (window.location.href = '/api/payroll/export?kind=employees')}>Employee master (CSV)</MenuItem>
                    <MenuItem onSelect={() => (window.location.href = `/api/payroll/export?kind=attendance&month=${month}`)}>Attendance &amp; LOP for {periodLabel(month)} (CSV)</MenuItem>
                  </MenuContent>
                </Menu>
              )}
              {can('payroll', 'create') && (
                <Button size="sm" disabled={!ids.length} onClick={() => setPayOpen(true)}>
                  <Banknote /> Pay {ids.length || ''} selected
                </Button>
              )}
            </>
          }
        />
        {isLoading ? (
          <LoadingBlock />
        ) : (
          <DataTable<Row>
            selectable
            rowSelection={selection}
            onRowSelectionChange={setSelection}
            getRowId={(r) => r.employeeId}
            data={data?.rows}
            pageSize={100}
            columns={[
              { accessorKey: 'name', header: 'Employee', cell: ({ row }) => <div className="flex items-center gap-3"><Avatar name={row.original.name} src={row.original.photoUrl} size={32} /><div><p className="font-medium">{row.original.name}</p><p className="text-xs text-ink-faint">{row.original.code} · {row.original.designation}</p></div></div> },
              { accessorKey: 'basic', header: 'Basic', cell: ({ getValue }) => formatINR(getValue(), true) },
              { accessorKey: 'allowances', header: 'Allowances', cell: ({ getValue }) => formatINR(getValue(), true) },
              {
                id: 'bonus',
                header: 'Bonus',
                cell: ({ row }) =>
                  row.original.slip ? '—' : <Input type="number" min={0} className="h-8 w-24" value={edits[row.original.employeeId]?.bonus ?? 0} onClick={(e) => e.stopPropagation()} onChange={(e) => setEdits((s) => ({ ...s, [row.original.employeeId]: { bonus: Number(e.target.value), deductions: s[row.original.employeeId]?.deductions ?? row.original.deductions } }))} />,
              },
              {
                id: 'ded',
                header: 'Deductions',
                cell: ({ row }) =>
                  row.original.slip ? formatINR(row.original.deductions, true) : <Input type="number" min={0} className="h-8 w-24" value={edits[row.original.employeeId]?.deductions ?? row.original.deductions} onClick={(e) => e.stopPropagation()} onChange={(e) => setEdits((s) => ({ ...s, [row.original.employeeId]: { bonus: s[row.original.employeeId]?.bonus ?? 0, deductions: Number(e.target.value) } }))} />,
              },
              { id: 'net', header: 'Net pay', cell: ({ row }) => <span className="font-semibold">{formatINR(row.original.slip?.net ?? net(row.original), true)}</span> },
              {
                id: 'status',
                header: 'Status',
                cell: ({ row }) =>
                  row.original.slip ? (
                    <div className="flex items-center gap-1">
                      <Badge tone="success" dot>
                        {row.original.slip.slipNo}
                      </Badge>
                      <Button variant="ghost" size="icon-sm" aria-label="Print payslip" onClick={(e) => { e.stopPropagation(); window.open(`/print/payslip/${row.original.slip!.id}`, '_blank'); }}>
                        <Printer />
                      </Button>
                      {can('payroll', 'delete') && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Reverse payment"
                          onClick={async (e) => {
                            e.stopPropagation();
                            if (!(await confirm({ title: `Reverse ${row.original.slip!.slipNo}?`, description: 'Deletes the payslip and its ledger entry. Use only for payments made in error.', confirmLabel: 'Reverse' }))) return;
                            await api(`/api/payroll/slips/${row.original.slip!.id}`, { method: 'DELETE' });
                            toast.success('Reversed');
                            invalidate(['/api/payroll', '/api/accounts']);
                          }}
                        >
                          <Undo2 />
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Badge tone="warning" dot>
                      Unpaid
                    </Badge>
                  ),
              },
            ]}
          />
        )}
      </Card>
      <Dialog
        open={payOpen}
        onOpenChange={setPayOpen}
        title={`Pay ${ids.length} salaries for ${periodLabel(month)}`}
        description={`Total ${formatINR(selectedTotal, true)}. Each employee is notified and the expense is posted to Accounts.`}
        footer={
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const items = unpaid.filter((r) => ids.includes(r.employeeId)).map((r) => ({ employeeId: r.employeeId, basic: r.basic, allowances: r.allowances, bonus: edits[r.employeeId]?.bonus ?? 0, deductions: edits[r.employeeId]?.deductions ?? r.deductions }));
                const res = await api<{ paid: number }>('/api/payroll', { method: 'POST', body: { month, mode, paidOn, items } });
                toast.success(`${res.paid} salaries paid`);
                setPayOpen(false);
                setSelection({});
                invalidate(['/api/payroll', '/api/accounts', '/api/dashboard']);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Confirm payment
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mode">
            <Select value={mode} onChange={(e) => setMode(e.target.value)} options={['BANK_TRANSFER', 'NET_BANKING', 'CHEQUE', 'CASH', 'UPI'].map((m) => ({ value: m, label: m.replace('_', ' ') }))} />
          </Field>
          <Field label="Paid on">
            <Input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>
      </Dialog>
    </>
  );
}

function MySlips() {
  const { data, isLoading } = useApiQuery<Array<{ id: string; slipNo: string; month: string; net: number; paidAt: string; mode: string }>>('/api/payroll', { mine: '1' });
  if (isLoading) return <LoadingBlock />;
  return (
    <Card>
      <CardHeader title="My payslips" />
      {!data?.length ? (
        <EmptyState title="No payslips yet" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
              <div>
                <p className="font-semibold">{periodLabel(s.month)}</p>
                <p className="text-xs text-ink-faint">
                  {s.slipNo} · paid {formatDate(s.paidAt)} · {s.mode.replace('_', ' ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold">{formatINR(s.net, true)}</span>
                <Button variant="secondary" size="sm" onClick={() => window.open(`/print/payslip/${s.id}`, '_blank')}>
                  <Printer /> Payslip
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function PayrollPage() {
  const { can } = useApp();
  const manager = can('payroll', 'create');
  return (
    <>
      <PageHeader title={manager ? 'Payroll' : 'My salary'} description={manager ? 'Monthly salary run, payslips and bank transfer sheet.' : 'Download your payslips.'} icon={Banknote} />
      {manager ? <SalarySheet /> : <MySlips />}
    </>
  );
}
