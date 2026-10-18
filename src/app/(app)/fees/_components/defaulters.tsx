'use client';

import * as React from 'react';
import Link from 'next/link';
import { BellRing, Download, Gavel, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';
import type { RowSelectionState } from '@tanstack/react-table';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, useLookups } from '@/lib/lookups';
import { downloadCsv, formatINR, periodLabel } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Defaulter {
  studentId: string;
  name: string;
  admissionNo: string;
  photoUrl: string | null;
  classLabel: string;
  guardian: string;
  phone: string;
  due: number;
  months: string[];
  overdueDays: number;
}

export function Defaulters() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [classId, setClassId] = React.useState('');
  const [minDays, setMinDays] = React.useState('0');
  const [selection, setSelection] = React.useState<RowSelectionState>({});
  const [remind, setRemind] = React.useState(false);
  const { data, isLoading, error } = useApiQuery<{ rows: Defaulter[]; totalDue: number; count: number }>('/api/fees/defaulters', { classId: classId || undefined, minDays });
  const ids = Object.keys(selection).filter((k) => selection[k]);

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Select className="h-9 w-40" value={classId} onChange={(e) => setClassId(e.target.value)} options={classOptions(lk)} placeholder="All classes" />
          <Select className="h-9 w-48" value={minDays} onChange={(e) => setMinDays(e.target.value)} options={[{ value: '0', label: 'Past due date' }, { value: '15', label: 'Overdue 15+ days' }, { value: '30', label: 'Overdue 30+ days' }, { value: '60', label: 'Overdue 60+ days' }, { value: '90', label: 'Overdue 90+ days' }]} />
          <div className="ml-auto flex flex-wrap gap-2">
            {can('fees', 'edit') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  if (!(await confirm({ title: 'Apply late fees?', description: 'Adds each class’s configured late fee to overdue invoices. Fixed fines are added once.', confirmLabel: 'Apply', tone: 'primary' }))) return;
                  const r = await api<{ updated: number }>('/api/fees/late-fees', { method: 'POST' });
                  toast.success(`Late fee applied to ${r.updated} invoices`);
                  invalidate(['/api/fees']);
                }}
              >
                <Gavel /> Apply late fees
              </Button>
            )}
            <Button variant="secondary" size="sm" disabled={!data?.rows.length} onClick={() => downloadCsv('fee-defaulters', data!.rows.map((r) => ({ Student: r.name, 'Adm No': r.admissionNo, Class: r.classLabel, Parent: r.guardian, Mobile: r.phone, 'Due (₹)': r.due, Months: r.months.map((m) => periodLabel(m)).join(' '), 'Overdue days': r.overdueDays })))}>
              <Download /> Export
            </Button>
            {can('fees', 'create') && (
              <Button size="sm" disabled={!ids.length} onClick={() => setRemind(true)}>
                <BellRing /> Remind {ids.length || ''}
              </Button>
            )}
          </div>
        </div>
        {data && (
          <div className="border-b border-line px-5 py-3 text-sm">
            <b className="text-rose-600">{formatINR(data.totalDue, true)}</b> outstanding across <b>{data.count}</b> students
          </div>
        )}
        <DataTable<Defaulter>
          selectable={can('fees', 'create')}
          rowSelection={selection}
          onRowSelectionChange={setSelection}
          getRowId={(r) => r.studentId}
          data={data?.rows}
          loading={isLoading}
          error={error?.message}
          emptyTitle="No defaulters 🎉"
          columns={[
            {
              accessorKey: 'name',
              header: 'Student',
              cell: ({ row }) => (
                <Link href={`/students/${row.original.studentId}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                  <Avatar name={row.original.name} src={row.original.photoUrl} size={32} />
                  <div>
                    <p className="font-medium hover:underline">{row.original.name}</p>
                    <p className="text-xs text-ink-faint">
                      {row.original.admissionNo} · {row.original.classLabel}
                    </p>
                  </div>
                </Link>
              ),
            },
            {
              accessorKey: 'phone',
              header: 'Parent',
              cell: ({ row }) => (
                <div>
                  <p className="text-sm">{row.original.guardian}</p>
                  <a href={`tel:${row.original.phone}`} className="inline-flex items-center gap-1 text-xs text-brand-600" onClick={(e) => e.stopPropagation()}>
                    <Phone className="size-3" /> {row.original.phone}
                  </a>
                </div>
              ),
            },
            { id: 'months', header: 'Pending months', cell: ({ row }) => <div className="flex max-w-xs flex-wrap gap-1">{row.original.months.map((m) => <Badge key={m}>{periodLabel(m)}</Badge>)}</div> },
            { accessorKey: 'overdueDays', header: 'Overdue', cell: ({ getValue }) => <Badge tone={Number(getValue()) > 60 ? 'danger' : Number(getValue()) > 15 ? 'warning' : 'neutral'}>{getValue()} days</Badge> },
            { accessorKey: 'due', header: 'Due', cell: ({ getValue }) => <span className="font-bold text-rose-600">{formatINR(getValue(), true)}</span> },
            {
              id: 'collect',
              header: '',
              cell: ({ row }) =>
                can('fees', 'create') ? (
                  <Button size="sm" variant="soft" asChild>
                    <Link href={`/fees?tab=collect&studentId=${row.original.studentId}`} onClick={(e) => e.stopPropagation()}>
                      Collect
                    </Link>
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>
      <RemindDialog open={remind} onOpenChange={setRemind} studentIds={ids} />
    </>
  );
}

function RemindDialog({ open, onOpenChange, studentIds }: { open: boolean; onOpenChange: (o: boolean) => void; studentIds: string[] }) {
  const [channels, setChannels] = React.useState<string[]>(['APP', 'SMS']);
  const [busy, setBusy] = React.useState(false);
  const toggle = (c: string) => setChannels((cs) => (cs.includes(c) ? cs.filter((x) => x !== c) : [...cs, c]));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Send reminders to ${studentIds.length} families`}
      description="Each family gets the exact pending amount. SMS and WhatsApp use the gateway configured in School Settings."
      footer={
        <Button
          loading={busy}
          disabled={!channels.length}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api<{ families: number; app: number; sms: number; whatsapp: number; gatewayMissing: boolean }>('/api/fees/reminders', { method: 'POST', body: { studentIds, channels } });
              toast.success(`Reminded ${r.families} families · app ${r.app} · SMS ${r.sms} · WhatsApp ${r.whatsapp}`);
              if (r.gatewayMissing) toast.warning('SMS/WhatsApp gateway is not configured — only in-app reminders were delivered.');
              onOpenChange(false);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <MessageSquare /> Send
        </Button>
      }
    >
      <div className="space-y-3">
        {[
          ['APP', 'In-app notification (parent portal)'],
          ['SMS', 'SMS (DLT template)'],
          ['WHATSAPP', 'WhatsApp'],
        ].map(([c, l]) => (
          <label key={c} className="flex items-center gap-3 text-sm">
            <Checkbox checked={channels.includes(c)} onCheckedChange={() => toggle(c)} /> {l}
          </label>
        ))}
        <Input readOnly value="Dear Parent, fee of ₹X is pending for <student>. Kindly pay at the earliest. - School" className="text-xs text-ink-soft" />
      </div>
    </Dialog>
  );
}
