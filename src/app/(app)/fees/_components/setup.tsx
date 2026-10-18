'use client';

import * as React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState } from '@/components/ui/display';
import { Field, Input, Select } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

export function FeeSetup() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div>
        <ResourcePage<{ id: string; name: string; kind: string; sortOrder: number; isActive: boolean; _count: { structures: number } }>
          embedded
          title="Fee heads"
          entityLabel="Fee head"
          endpoint="/api/fees/heads"
          module="fees"
          invalidate={['/api/fees/structures', '/api/lookups']}
          columns={[
            { accessorKey: 'sortOrder', header: '#', size: 40 },
            { accessorKey: 'name', header: 'Head', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
            { accessorKey: 'kind', header: 'Type', cell: ({ getValue }) => <Badge>{getValue() === 'ONE_TIME' ? 'One time' : 'Recurring'}</Badge> },
            { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => (getValue() ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>) },
            { id: 'used', header: 'Classes', cell: ({ row }) => row.original._count.structures },
          ]}
          fields={[
            { name: 'name', label: 'Name', required: true, placeholder: 'Tuition Fee' },
            { name: 'kind', label: 'Type', type: 'select', options: [{ value: 'RECURRING', label: 'Recurring' }, { value: 'ONE_TIME', label: 'One time (e.g. admission fee)' }] },
            { name: 'sortOrder', label: 'Display order', type: 'number' },
            { name: 'isActive', label: 'Active', type: 'switch' },
          ]}
          defaults={{ kind: 'RECURRING', sortOrder: 10, isActive: true }}
        />
      </div>
      <Concessions />
    </div>
  );
}

interface ConcessionRow {
  id: string;
  studentId: string;
  studentName: string;
  admissionNo: string;
  classLabel: string;
  headName: string;
  kind: string;
  value: number;
  reason: string | null;
}

function Concessions() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<ConcessionRow[]>('/api/fees/concessions');
  const { data: lk } = useLookups(['feeHeads']);
  const [open, setOpen] = React.useState(false);
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const [form, setForm] = React.useState({ feeHeadId: '', kind: 'PERCENT', value: '10', reason: 'SIBLING' });
  return (
    <Card>
      <CardHeader
        title="Concessions & scholarships"
        description="Applied automatically when invoices are generated (sibling, staff ward, RTE, merit…)."
        actions={
          can('fees', 'create') && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus /> Add
            </Button>
          )
        }
      />
      {isLoading ? null : !data?.length ? (
        <EmptyState title="No concessions" />
      ) : (
        <ul className="max-h-[32rem] divide-y divide-line overflow-y-auto">
          {data.map((c) => (
            <li key={c.id} className="flex items-center gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{c.studentName}</p>
                <p className="text-xs text-ink-faint">
                  {c.admissionNo} · {c.classLabel} · {c.headName}
                </p>
              </div>
              <Badge tone="success">{c.kind === 'PERCENT' ? `${c.value}%` : formatINR(c.value, true)}</Badge>
              <Badge>{(c.reason ?? '').replace('_', ' ').toLowerCase()}</Badge>
              {can('fees', 'delete') && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove concession"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Remove concession?', description: 'Future invoices will be raised without it.', confirmLabel: 'Remove' }))) return;
                    await api(`/api/fees/concessions/${c.id}`, { method: 'DELETE' });
                    invalidate(['/api/fees/concessions']);
                  }}
                >
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Add concession"
        footer={
          <Button
            disabled={!student || !Number(form.value)}
            onClick={async () => {
              try {
                await api('/api/fees/concessions', { method: 'POST', body: { studentId: student!.id, feeHeadId: form.feeHeadId || null, kind: form.kind, value: Number(form.value), reason: form.reason } });
                toast.success('Concession added');
                invalidate(['/api/fees/concessions']);
                setOpen(false);
                setStudent(null);
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
          >
            Save
          </Button>
        }
      >
        <CardBody className="space-y-4 p-0">
          <Field label="Student">
            <StudentPicker value={student} onChange={setStudent} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fee head">
              <Select value={form.feeHeadId} onChange={(e) => setForm({ ...form, feeHeadId: e.target.value })} options={(lk?.feeHeads ?? []).map((h) => ({ value: h.id, label: h.name }))} placeholder="All heads" />
            </Field>
            <Field label="Reason">
              <Select value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} options={['SIBLING', 'STAFF_WARD', 'MERIT', 'RTE', 'SPORTS', 'FINANCIAL_AID', 'OTHER'].map((r) => ({ value: r, label: r.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) }))} />
            </Field>
            <Field label="Type">
              <Select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })} options={[{ value: 'PERCENT', label: 'Percentage' }, { value: 'FIXED', label: 'Fixed ₹ per invoice' }]} />
            </Field>
            <Field label="Value">
              <Input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
            </Field>
          </div>
        </CardBody>
      </Dialog>
    </Card>
  );
}
