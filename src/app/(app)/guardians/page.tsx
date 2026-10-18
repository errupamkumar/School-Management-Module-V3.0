'use client';

import * as React from 'react';
import Link from 'next/link';
import { HeartHandshake, KeyRound, Pencil, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, useLookups } from '@/lib/lookups';
import { downloadCsv } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog, type FieldDef } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, PageHeader } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';

interface FamilyRow {
  id: string;
  familyCode: string | null;
  displayName: string;
  fatherName: string | null;
  fatherPhone: string | null;
  fatherOccupation: string | null;
  motherName: string | null;
  motherPhone: string | null;
  guardianName: string | null;
  primaryPhone: string;
  address: string | null;
  annualIncome: number | null;
  students: Array<{ id: string; name: string; classLabel: string; status: string }>;
  user: { username: string; isActive: boolean; lastLoginAt: string | null } | null;
}

const FIELDS: FieldDef[] = [
  { name: 'fatherName', label: "Father's name" },
  { name: 'fatherPhone', label: "Father's mobile", type: 'tel' },
  { name: 'fatherOccupation', label: "Father's occupation" },
  { name: 'fatherEmail', label: "Father's email", type: 'email' },
  { name: 'motherName', label: "Mother's name" },
  { name: 'motherPhone', label: "Mother's mobile", type: 'tel' },
  { name: 'motherOccupation', label: "Mother's occupation" },
  { name: 'guardianName', label: 'Guardian name' },
  { name: 'guardianRelation', label: 'Relation' },
  { name: 'guardianPhone', label: "Guardian's mobile", type: 'tel' },
  { name: 'primaryPhone', label: 'Primary mobile (login & alerts)', type: 'tel', required: true },
  { name: 'annualIncome', label: 'Annual income (₹)', type: 'number' },
  { name: 'address', label: 'Address', type: 'textarea' },
];

export default function GuardiansPage() {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes']);
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [editing, setEditing] = React.useState<FamilyRow | null>(null);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading, error } = usePagedQuery<FamilyRow>('/api/guardians', { page, pageSize: 25, search: debounced || undefined, classId: classId || undefined });

  return (
    <>
      <PageHeader
        title="Parents & Families"
        description="Each family groups siblings under one parent login, so fees can be collected family-wise."
        icon={HeartHandshake}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!data?.data.length}
              onClick={() =>
                downloadCsv(
                  'parents',
                  (data?.data ?? []).map((f) => ({ Family: f.familyCode, Father: f.fatherName, 'Father mobile': f.fatherPhone, Mother: f.motherName, 'Mother mobile': f.motherPhone, 'Primary mobile': f.primaryPhone, Occupation: f.fatherOccupation, Children: f.students.map((s) => `${s.name} (${s.classLabel})`).join('; '), Address: f.address }))
                )
              }
            >
              Export page
            </Button>
            {can('guardians', 'edit') && (
              <Button variant="secondary" asChild>
                <Link href="/students/logins">
                  <KeyRound /> Parent logins
                </Link>
              </Button>
            )}
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Parent, mobile, family code or child…" className="h-9 pl-9" />
          </div>
          <Select className="h-9 w-40" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} options={classOptions(lk)} placeholder="All classes" />
        </div>
        <DataTable<FamilyRow>
          data={data?.data}
          loading={isLoading}
          error={error?.message}
          pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
          columns={[
            {
              id: 'parent',
              header: 'Parents',
              cell: ({ row }) => (
                <div>
                  <p className="font-medium">{row.original.fatherName ?? row.original.guardianName ?? '—'}</p>
                  <p className="text-xs text-ink-faint">{row.original.motherName ?? ''}</p>
                </div>
              ),
            },
            { accessorKey: 'primaryPhone', header: 'Mobile' },
            {
              id: 'children',
              header: 'Children',
              cell: ({ row }) => (
                <div className="flex flex-wrap gap-1.5">
                  {row.original.students.map((s) => (
                    <Link key={s.id} href={`/students/${s.id}`} className="rounded-lg bg-canvas px-2 py-1 text-xs hover:bg-brand-50" onClick={(e) => e.stopPropagation()}>
                      {s.name} · {s.classLabel}
                    </Link>
                  ))}
                </div>
              ),
            },
            { accessorKey: 'familyCode', header: 'Family', cell: ({ getValue }) => <Badge>{getValue() ?? '—'}</Badge> },
            { id: 'login', header: 'Login', cell: ({ row }) => (row.original.user ? <Badge tone={row.original.user.isActive ? 'success' : 'neutral'} dot>{row.original.user.username}</Badge> : <span className="text-xs text-ink-faint">None</span>) },
            ...(can('guardians', 'edit')
              ? [
                  {
                    id: 'edit',
                    header: '',
                    cell: ({ row }: { row: { original: FamilyRow } }) => (
                      <Button variant="ghost" size="icon-sm" aria-label="Edit family" onClick={() => setEditing(row.original)}>
                        <Pencil />
                      </Button>
                    ),
                  },
                ]
              : []),
          ]}
        />
      </Card>
      <FormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit family"
        fields={FIELDS}
        initial={editing ? Object.fromEntries(FIELDS.map((f) => [f.name, (editing as unknown as Record<string, unknown>)[f.name] ?? ''])) : {}}
        onSubmit={async (v) => {
          await api(`/api/guardians/${editing!.id}`, { method: 'PUT', body: v });
          toast.success('Family updated');
          invalidate(['/api/guardians', '/api/students']);
        }}
      />
    </>
  );
}
