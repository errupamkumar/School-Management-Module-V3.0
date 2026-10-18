'use client';

import * as React from 'react';
import { BookOpenCheck, Download, FileCode2, Landmark, Plus, Printer, Search, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { cn, downloadCsv, formatDate, formatINR, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog, ResourcePage } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, LoadingBlock, PageHeader, StatCard } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';
import { Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { ShareBars } from '@/components/ui/charts';

interface Statement {
  opening: number;
  income: number;
  expense: number;
  closing: number;
  lines: Array<{ id: string; date: string; description: string; head: string; party: string | null; referenceNo: string | null; source: string; income: number | null; expense: number | null; balance: number }>;
  byHead: Array<{ head: string; type: string; amount: number }>;
}

function fyStart() {
  const d = new Date();
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-04-01`;
}

function StatementTab() {
  const [from, setFrom] = React.useState(todayISO().slice(0, 8) + '01');
  const [to, setTo] = React.useState(todayISO());
  const { data, isLoading } = useApiQuery<Statement>('/api/accounts/statement', { from, to });
  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="flex flex-wrap items-center gap-3">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" aria-label="From" />
          <span className="text-xs text-ink-faint">to</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" aria-label="To" />
          <Button variant="secondary" size="sm" onClick={() => { setFrom(fyStart()); setTo(todayISO()); }}>
            This financial year
          </Button>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" disabled={!data} onClick={() => downloadCsv(`account-statement-${from}-${to}`, data!.lines.map((l) => ({ Date: l.date.slice(0, 10), Head: l.head, Description: l.description, Party: l.party ?? '', Reference: l.referenceNo ?? '', Income: l.income ?? '', Expense: l.expense ?? '', Balance: l.balance })))}>
              <Download /> CSV
            </Button>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <FileCode2 /> Tally
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>Export for Tally Prime / ERP 9</MenuLabel>
                <MenuItem onSelect={() => (window.location.href = '/api/accounts/tally?kind=masters')}>1. Ledgers (import once, first)</MenuItem>
                <MenuItem onSelect={() => (window.location.href = `/api/accounts/tally?kind=vouchers&from=${from}&to=${to}`)}>2. Vouchers for this period</MenuItem>
              </MenuContent>
            </Menu>
            <Menu>
              <MenuTrigger asChild>
                <Button variant="secondary" size="sm">
                  <FileCode2 /> QuickBooks
                </Button>
              </MenuTrigger>
              <MenuContent align="end">
                <MenuLabel>QuickBooks Online</MenuLabel>
                <MenuItem onSelect={() => (window.location.href = `/api/accounts/quickbooks?kind=journal&format=csv&from=${from}&to=${to}`)}>Journal entries for this period (CSV)</MenuItem>
                <MenuLabel>QuickBooks Desktop</MenuLabel>
                <MenuItem onSelect={() => (window.location.href = '/api/accounts/quickbooks?kind=accounts')}>1. Chart of accounts (IIF, import first)</MenuItem>
                <MenuItem onSelect={() => (window.location.href = `/api/accounts/quickbooks?kind=journal&format=iif&from=${from}&to=${to}`)}>2. Journal for this period (IIF)</MenuItem>
              </MenuContent>
            </Menu>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Printer /> Print
            </Button>
          </div>
        </CardBody>
      </Card>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Opening balance" value={formatINR(data.opening, true)} icon={Wallet} tone="sky" />
            <StatCard label="Income" value={formatINR(data.income, true)} icon={TrendingUp} tone="emerald" />
            <StatCard label="Expense" value={formatINR(data.expense, true)} icon={TrendingDown} tone="rose" />
            <StatCard label="Closing balance" value={formatINR(data.closing, true)} icon={Landmark} tone={data.closing >= 0 ? 'brand' : 'rose'} />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
            <Card>
              <CardHeader title="Statement" description={`${data.lines.length} entries`} />
              <div className="max-h-[36rem] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-surface">
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                      <th className="px-4 py-2.5">Date</th>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-right">Income</th>
                      <th className="px-4 py-2.5 text-right">Expense</th>
                      <th className="px-4 py-2.5 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line bg-canvas/50 font-medium">
                      <td className="px-4 py-2" colSpan={4}>
                        Opening balance
                      </td>
                      <td className="px-4 py-2 text-right">{formatINR(data.opening)}</td>
                    </tr>
                    {data.lines.map((l) => (
                      <tr key={l.id} className="border-b border-line/60">
                        <td className="whitespace-nowrap px-4 py-2 text-xs text-ink-soft">{formatDate(l.date)}</td>
                        <td className="px-4 py-2">
                          <p className="max-w-md truncate">{l.description}</p>
                          <p className="text-[11px] text-ink-faint">
                            {l.head}
                            {l.party ? ` · ${l.party}` : ''}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-emerald-700">{l.income ? formatINR(l.income) : ''}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-right text-rose-600">{l.expense ? formatINR(l.expense) : ''}</td>
                        <td className={cn('whitespace-nowrap px-4 py-2 text-right font-medium', l.balance < 0 && 'text-rose-600')}>{formatINR(l.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card>
              <CardHeader title="By account head" />
              <CardBody className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-semibold text-emerald-700">Income</p>
                  <ShareBars money items={data.byHead.filter((h) => h.type === 'INCOME').map((h) => ({ label: h.head, value: h.amount }))} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-rose-600">Expense</p>
                  <ShareBars money items={data.byHead.filter((h) => h.type === 'EXPENSE').map((h) => ({ label: h.head, value: h.amount }))} />
                </div>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

interface Entry {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: string;
  mode: string | null;
  party: string | null;
  referenceNo: string | null;
  source: string;
  head: { name: string };
}

function EntriesTab({ type }: { type: 'INCOME' | 'EXPENSE' }) {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['accountHeads']);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [headId, setHeadId] = React.useState('');
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = usePagedQuery<Entry>('/api/accounts/entries', { type, page, pageSize: 25, search: search || undefined, headId: headId || undefined });
  const heads = (lk?.accountHeads ?? []).filter((h) => h.type === type);
  const label = type === 'INCOME' ? 'income' : 'expense';
  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Description, party, reference" className="h-9 pl-9" />
          </div>
          <Select className="h-9 w-48" value={headId} onChange={(e) => { setHeadId(e.target.value); setPage(1); }} options={heads.map((h) => ({ value: h.id, label: h.name }))} placeholder="All heads" />
          <span className="text-sm text-ink-soft">
            Total: <b>{formatINR(Number((data as { sumAmount?: number } | undefined)?.sumAmount ?? 0), true)}</b>
          </span>
          {can('accounts', 'create') && (
            <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
              <Plus /> Add {label}
            </Button>
          )}
        </div>
        <DataTable<Entry>
          data={data?.data}
          loading={isLoading}
          pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
          columns={[
            { accessorKey: 'date', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
            { accessorKey: 'description', header: 'Description', cell: ({ row }) => <div><p className="font-medium">{row.original.description}</p><p className="text-xs text-ink-faint">{row.original.party ?? ''}{row.original.referenceNo ? ` · ${row.original.referenceNo}` : ''}</p></div> },
            { id: 'head', header: 'Head', cell: ({ row }) => <Badge>{row.original.head.name}</Badge> },
            { accessorKey: 'mode', header: 'Mode', cell: ({ getValue }) => <span className="text-xs">{getValue() ? String(getValue()).replace('_', ' ') : '—'}</span> },
            { accessorKey: 'source', header: 'Source', cell: ({ getValue }) => <Badge tone={getValue() === 'MANUAL' ? 'neutral' : 'info'}>{String(getValue()).toLowerCase()}</Badge> },
            { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => <span className={cn('font-semibold', type === 'INCOME' ? 'text-emerald-700' : 'text-rose-600')}>{formatINR(getValue())}</span> },
            {
              id: 'x',
              header: '',
              cell: ({ row }) =>
                can('accounts', 'delete') && row.original.source === 'MANUAL' ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Delete entry"
                    onClick={async () => {
                      if (!(await confirm({ title: 'Delete this entry?', confirmLabel: 'Delete' }))) return;
                      await api(`/api/accounts/entries/${row.original.id}`, { method: 'DELETE' });
                      toast.success('Deleted');
                      invalidate(['/api/accounts', '/api/dashboard']);
                    }}
                  >
                    <Trash2 />
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Add ${label}`}
        fields={[
          { name: 'headId', label: 'Account head', type: 'select', required: true, options: heads.filter((h) => !h.isSystem).map((h) => ({ value: h.id, label: h.name })) },
          { name: 'amount', label: 'Amount', type: 'money', required: true },
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'mode', label: 'Mode', type: 'select', options: ['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'NET_BANKING'].map((m) => ({ value: m, label: m.replace('_', ' ') })) },
          { name: 'description', label: 'Description', required: true, span: 2 },
          { name: 'party', label: type === 'INCOME' ? 'Received from' : 'Paid to' },
          { name: 'referenceNo', label: 'Voucher / reference no.' },
        ]}
        initial={{ date: todayISO(), mode: 'CASH' }}
        onSubmit={async (v) => {
          await api('/api/accounts/entries', { method: 'POST', body: v });
          toast.success('Entry added');
          invalidate(['/api/accounts', '/api/dashboard']);
        }}
      />
    </>
  );
}

export default function AccountsPage() {
  const [tab, setTab] = React.useState('statement');
  return (
    <>
      <PageHeader title="Accounts" description="Income, expenses and account statement. Fee receipts and salaries post here automatically." icon={Landmark} />
      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'statement', label: <><BookOpenCheck className="size-4" /> Statement</> },
          { value: 'income', label: <><TrendingUp className="size-4" /> Income</> },
          { value: 'expense', label: <><TrendingDown className="size-4" /> Expenses</> },
          { value: 'heads', label: 'Chart of accounts' },
        ]}
      >
        <TabPanel value="statement">
          <StatementTab />
        </TabPanel>
        <TabPanel value="income">
          <EntriesTab type="INCOME" />
        </TabPanel>
        <TabPanel value="expense">
          <EntriesTab type="EXPENSE" />
        </TabPanel>
        <TabPanel value="heads">
          <ResourcePage<{ id: string; name: string; type: string; isSystem: boolean; _count: { entries: number } }>
            embedded
            title="Account heads"
            entityLabel="Account head"
            endpoint="/api/accounts/heads"
            module="accounts"
            invalidate={['/api/lookups']}
            columns={[
              { accessorKey: 'name', header: 'Head', cell: ({ row }) => <span className="font-medium">{row.original.name} {row.original.isSystem && <Badge tone="info">system</Badge>}</span> },
              { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => <Badge tone={getValue() === 'INCOME' ? 'success' : 'danger'}>{String(getValue()).toLowerCase()}</Badge> },
              { id: 'n', header: 'Entries', cell: ({ row }) => row.original._count.entries },
            ]}
            fields={[
              { name: 'name', label: 'Head name', required: true, placeholder: 'Electricity' },
              { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'INCOME', label: 'Income' }, { value: 'EXPENSE', label: 'Expense' }] },
            ]}
            canAction={(a) => a !== 'edit'}
          />
        </TabPanel>
      </Tabs>
    </>
  );
}
