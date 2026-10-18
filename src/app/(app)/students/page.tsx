'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowUpCircle, Download, FileUp, GraduationCap, KeyRound, Plus, Search } from 'lucide-react';
import { usePagedQuery, type Paged } from '@/lib/api-client';
import { classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { downloadCsv, formatDate, formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';

interface StudentRow {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  gender: string;
  dob: string | null;
  status: string;
  photoUrl: string | null;
  isRte: boolean;
  category: string | null;
  admissionDate: string;
  classLabel: string;
  guardian: { id: string; fatherName: string | null; motherName: string | null; primaryPhone: string } | null;
  dues: number | null;
  routeName: string | null;
}

export default function StudentsPage() {
  const router = useRouter();
  const { can } = useApp();
  const { data: lk } = useLookups(['classes'], { mine: true });
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [sectionId, setSectionId] = React.useState('');
  const [status, setStatus] = React.useState('ACTIVE');
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const params = { page, pageSize: 25, search: debounced || undefined, classId: classId || undefined, sectionId: sectionId || undefined, status };
  const { data, isLoading, error, refetch } = usePagedQuery<StudentRow>('/api/students', params);

  async function exportAll() {
    setExporting(true);
    try {
      const res = await fetch(`/api/students?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])), page: '1', pageSize: '200' })}`);
      const json = (await res.json()) as Paged<StudentRow> & { success: boolean };
      let rows = json.data;
      const pages = Math.ceil(json.total / 200);
      for (let p = 2; p <= pages; p++) {
        const r = await fetch(`/api/students?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])), page: String(p), pageSize: '200' })}`);
        rows = rows.concat(((await r.json()) as Paged<StudentRow>).data);
      }
      downloadCsv(
        'students',
        rows.map((s) => ({
          'Admission No': s.admissionNo,
          'Roll No': s.rollNo ?? '',
          Name: s.name,
          Class: s.classLabel,
          Gender: s.gender,
          DOB: s.dob ? s.dob.slice(0, 10) : '',
          Category: s.category ?? '',
          'Father / Mother': s.guardian?.fatherName ?? s.guardian?.motherName ?? '',
          Mobile: s.guardian?.primaryPhone ?? '',
          'Admission Date': s.admissionDate.slice(0, 10),
          Transport: s.routeName ?? '',
          ...(s.dues !== null ? { 'Fee Due': s.dues } : {}),
          Status: s.status,
        }))
      );
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Students"
        description={data ? `${data.total} student${data.total === 1 ? '' : 's'}` : 'Student information system'}
        icon={GraduationCap}
        actions={
          <>
            <Button variant="secondary" onClick={exportAll} loading={exporting}>
              <Download /> Export
            </Button>
            {can('students', 'edit') && (
              <Button variant="secondary" asChild>
                <Link href="/students/promote">
                  <ArrowUpCircle /> Promote
                </Link>
              </Button>
            )}
            {can('students', 'edit') && (
              <Button variant="secondary" asChild>
                <Link href="/students/logins">
                  <KeyRound /> Logins
                </Link>
              </Button>
            )}
            {can('students', 'create') && (
              <>
                <Button variant="secondary" asChild>
                  <Link href="/students/import">
                    <FileUp /> Import
                  </Link>
                </Button>
                <Button asChild>
                  <Link href="/students/new">
                    <Plus /> New admission
                  </Link>
                </Button>
              </>
            )}
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, admission no., parent or mobile…" className="h-9 pl-9" />
          </div>
          <Select
            className="h-9 w-40"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSectionId('');
              setPage(1);
            }}
            options={classOptions(lk)}
            placeholder="All classes"
          />
          <Select className="h-9 w-36" value={sectionId} onChange={(e) => { setSectionId(e.target.value); setPage(1); }} options={sectionOptions(lk, classId)} placeholder="All sections" disabled={!classId} />
          <Select
            className="h-9 w-40"
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            options={[
              { value: 'ACTIVE', label: 'Active' },
              { value: 'INACTIVE', label: 'Inactive' },
              { value: 'TRANSFERRED', label: 'Transferred (TC)' },
              { value: 'PASSED_OUT', label: 'Passed out' },
              { value: 'DROPPED', label: 'Dropped' },
              { value: 'ALL', label: 'All statuses' },
            ]}
          />
        </div>
        <DataTable<StudentRow>
          data={data?.data}
          loading={isLoading}
          error={error?.message}
          onRetry={() => refetch()}
          onRowClick={(s) => router.push(`/students/${s.id}`)}
          pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
          emptyTitle="No students found"
          emptyDescription={debounced ? 'Try a different search.' : 'Admit your first student to get started.'}
          columns={[
            {
              accessorKey: 'name',
              header: 'Student',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.original.name} src={row.original.photoUrl} size={36} />
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.original.name} {row.original.isRte && <Badge tone="info">RTE</Badge>}
                    </p>
                    <p className="text-xs text-ink-faint">
                      {row.original.admissionNo}
                      {row.original.rollNo ? ` · Roll ${row.original.rollNo}` : ''}
                    </p>
                  </div>
                </div>
              ),
            },
            { accessorKey: 'classLabel', header: 'Class' },
            {
              id: 'guardian',
              header: 'Parent',
              cell: ({ row }) => (
                <div className="min-w-0">
                  <p className="truncate text-sm">{row.original.guardian?.fatherName ?? row.original.guardian?.motherName ?? '—'}</p>
                  <p className="text-xs text-ink-faint">{row.original.guardian?.primaryPhone}</p>
                </div>
              ),
            },
            { accessorKey: 'dob', header: 'DOB', cell: ({ getValue }) => <span className="text-sm text-ink-soft">{formatDate(getValue())}</span> },
            ...(data?.data?.[0]?.dues !== null && can('fees')
              ? [
                  {
                    accessorKey: 'dues',
                    header: 'Fee due',
                    cell: ({ getValue }: { getValue: () => unknown }) => {
                      const d = Number(getValue() ?? 0);
                      return d > 0 ? <span className="font-semibold text-rose-600">{formatINR(d, true)}</span> : <span className="text-xs text-emerald-600">Clear</span>;
                    },
                  },
                ]
              : []),
            { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
          ]}
        />
      </Card>
    </>
  );
}

