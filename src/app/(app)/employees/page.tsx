'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Briefcase, Download, FileUp, KeyRound, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { ROLE_LABELS, STAFF_ROLES } from '@/lib/modules';
import { downloadCsv, formatDate, formatINR, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { EMPLOYEE_FIELDS } from '@/components/employee-fields';
import { CredentialsDialog, type Credential } from '@/components/people';
import { CsvImportDialog } from '@/components/csv-import';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Segmented } from '@/components/ui/form';

interface EmployeeRow {
  id: string;
  name: string;
  employeeCode: string;
  phone: string | null;
  email: string | null;
  designation: string;
  department: string | null;
  isTeaching: boolean;
  joiningDate: string;
  status: string;
  photoUrl: string | null;
  basicSalary: number | null;
  allowances: number | null;
  deductions: number | null;
  user: { id: string; username: string; role: string; isActive: boolean } | null;
  _count: { classTeacherOf: number; assignments: number };
}

export default function EmployeesPage() {
  const router = useRouter();
  const { can, role } = useApp();
  const invalidate = useInvalidate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [debounced, setDebounced] = React.useState('');
  const [teaching, setTeaching] = React.useState<'all' | 'yes' | 'no'>('all');
  const [status, setStatus] = React.useState<'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [creating, setCreating] = React.useState(false);
  const [creds, setCreds] = React.useState<Credential[]>([]);
  React.useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const { data, isLoading, error } = usePagedQuery<EmployeeRow>('/api/employees', { page, pageSize: 25, search: debounced || undefined, teaching: teaching === 'all' ? undefined : teaching, status });
  const [importing, setImporting] = React.useState(false);
  const assignable = STAFF_ROLES.filter((r) => role === 'SUPER_ADMIN' || (r !== 'SUPER_ADMIN' && r !== 'ADMIN'));

  return (
    <>
      <PageHeader
        title="Employees"
        description={data ? `${data.total} ${status === 'ACTIVE' ? 'active' : 'inactive'} staff` : 'Staff directory'}
        icon={Briefcase}
        actions={
          <>
            <Button
              variant="secondary"
              disabled={!data?.data.length}
              onClick={() => downloadCsv('employees', (data?.data ?? []).map((e) => ({ Code: e.employeeCode, Name: e.name, Designation: e.designation, Department: e.department, Mobile: e.phone, Email: e.email, Joined: e.joiningDate.slice(0, 10), Teaching: e.isTeaching ? 'Yes' : 'No', Status: e.status })))}
            >
              <Download /> Export
            </Button>
            {can('employees', 'create') && (
              <Button variant="secondary" onClick={() => setImporting(true)}>
                <FileUp /> Import
              </Button>
            )}
            {can('employees', 'edit') && (
              <Button variant="secondary" asChild>
                <Link href="/employees/logins">
                  <KeyRound /> Staff logins
                </Link>
              </Button>
            )}
            {can('employees', 'create') && (
              <Button onClick={() => setCreating(true)}>
                <Plus /> Add employee
              </Button>
            )}
          </>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, code, designation, mobile…" className="h-9 pl-9" />
          </div>
          <Segmented size="sm" value={teaching} onChange={(v) => { setTeaching(v); setPage(1); }} options={[{ value: 'all', label: 'All' }, { value: 'yes', label: 'Teaching' }, { value: 'no', label: 'Non-teaching' }]} />
          <Segmented size="sm" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'INACTIVE', label: 'Former' }]} />
        </div>
        <DataTable<EmployeeRow>
          data={data?.data}
          loading={isLoading}
          error={error?.message}
          onRowClick={(e) => router.push(`/employees/${e.id}`)}
          pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
          columns={[
            {
              accessorKey: 'name',
              header: 'Employee',
              cell: ({ row }) => (
                <div className="flex items-center gap-3">
                  <Avatar name={row.original.name} src={row.original.photoUrl} size={36} />
                  <div>
                    <p className="font-medium">{row.original.name}</p>
                    <p className="text-xs text-ink-faint">{row.original.employeeCode}</p>
                  </div>
                </div>
              ),
            },
            { accessorKey: 'designation', header: 'Designation', cell: ({ row }) => <div><p>{row.original.designation}</p><p className="text-xs text-ink-faint">{row.original.department}</p></div> },
            { accessorKey: 'phone', header: 'Mobile' },
            { accessorKey: 'joiningDate', header: 'Joined', cell: ({ getValue }) => formatDate(getValue()) },
            ...(data?.data?.[0]?.basicSalary !== null && can('payroll')
              ? [{ id: 'pay', header: 'Net pay', cell: ({ row }: { row: { original: EmployeeRow } }) => formatINR((row.original.basicSalary ?? 0) + (row.original.allowances ?? 0) - (row.original.deductions ?? 0), true) }]
              : []),
            { id: 'login', header: 'Login', cell: ({ row }) => (row.original.user ? <Badge tone={row.original.user.isActive ? 'brand' : 'neutral'}>{ROLE_LABELS[row.original.user.role as keyof typeof ROLE_LABELS]}</Badge> : <span className="text-xs text-ink-faint">No login</span>) },
            { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <StatusBadge status={String(getValue())} /> },
          ]}
        />
      </Card>
      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Add employee"
        size="xl"
        fields={EMPLOYEE_FIELDS(assignable)}
        initial={{ joiningDate: todayISO(), isTeaching: false, gender: '', loginRole: '' }}
        onSubmit={async (v) => {
          const { loginRole, username, ...employee } = v;
          const res = await api<{ employeeId: string; employeeCode: string; credentials: Credential[] }>('/api/employees', { method: 'POST', body: { employee, loginRole: loginRole || null, username: username || null } });
          toast.success(`Employee ${res.employeeCode} added`);
          invalidate(['/api/employees', '/api/lookups', '/api/users']);
          if (res.credentials.length) setCreds(res.credentials);
        }}
      />
      <CredentialsDialog credentials={creds} onClose={() => setCreds([])} />
      <CsvImportDialog
        open={importing}
        onOpenChange={setImporting}
        title="Import staff"
        description="Add many employees from a spreadsheet. Logins are not created here — give them from Staff logins afterwards."
        endpoint="/api/employees/import"
        columns={['firstName', 'lastName', 'gender', 'designation', 'department', 'isTeaching', 'joiningDate', 'dob', 'phone', 'email', 'qualification', 'panNo', 'bankName', 'bankAccount', 'ifsc', 'uan', 'basicSalary', 'allowances', 'deductions']}
        required={['firstName', 'gender', 'designation', 'joiningDate']}
        sample={{ firstName: 'Priya', lastName: 'Verma', gender: 'Female', designation: 'TGT Science', department: 'Science', isTeaching: 'Yes', joiningDate: '01/04/2026', phone: '9876501234', email: 'priya@school.edu.in', basicSalary: '32000', allowances: '6000', deductions: '1800' }}
        maxRows={500}
        onDone={() => invalidate(['/api/employees'])}
      />
    </>
  );
}
