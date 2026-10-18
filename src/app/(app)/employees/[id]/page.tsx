'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, KeyRound, Pencil, Printer, Trash2, UserX, UserCheck } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { ROLE_LABELS, STAFF_ROLES } from '@/lib/modules';
import { formatDate, formatINR } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { EMPLOYEE_FIELDS } from '@/components/employee-fields';
import { CredentialsDialog, type Credential } from '@/components/people';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardBody, CardHeader, ErrorState, KeyValue, LoadingBlock, StatusBadge } from '@/components/ui/display';
import { Field, Select } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Employee {
  id: string;
  name: string;
  employeeCode: string;
  firstName: string;
  lastName: string | null;
  gender: string;
  dob: string | null;
  phone: string | null;
  email: string | null;
  photoUrl: string | null;
  designation: string;
  department: string | null;
  isTeaching: boolean;
  qualification: string | null;
  experienceYears: number | null;
  joiningDate: string;
  fatherSpouseName: string | null;
  aadhaarMasked: string | null;
  panNo: string | null;
  bankName: string | null;
  bankAccount: string | null;
  ifsc: string | null;
  uan: string | null;
  address: string | null;
  bloodGroup: string | null;
  basicSalary: number | null;
  allowances: number | null;
  deductions: number | null;
  status: string;
  leftOn: string | null;
  campus: { name: string };
  user: { id: string; username: string; role: string; isActive: boolean; lastLoginAt: string | null } | null;
  classTeacherOf: string[];
  teaches: string[];
}

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can, role } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: e, isLoading, error, refetch } = useApiQuery<Employee>(`/api/employees/${id}`);
  const [editing, setEditing] = React.useState(false);
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginRole, setLoginRole] = React.useState('TEACHER');
  const [creds, setCreds] = React.useState<Credential[]>([]);
  if (isLoading) return <LoadingBlock />;
  if (error || !e) return <ErrorState message={error?.message ?? 'Not found'} onRetry={() => refetch()} />;

  const assignable = STAFF_ROLES.filter((r) => role === 'SUPER_ADMIN' || (r !== 'SUPER_ADMIN' && r !== 'ADMIN'));
  const isAdminRecord = e.user && (e.user.role === 'ADMIN' || e.user.role === 'SUPER_ADMIN');
  const canEdit = can('employees', 'edit') && (!isAdminRecord || role === 'SUPER_ADMIN');
  const refresh = () => {
    refetch();
    invalidate(['/api/employees', '/api/users', '/api/lookups']);
  };

  return (
    <>
      <Link href="/employees" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Employees
      </Link>
      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-violet-600 via-brand-600 to-sky-500" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <Avatar name={e.name} src={e.photoUrl} size={88} className="-mt-10 ring-4 ring-surface" />
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {e.name} <StatusBadge status={e.status} />
            </h1>
            <p className="text-sm text-ink-soft">
              {e.designation}
              {e.department ? ` · ${e.department}` : ''} · {e.employeeCode} · {e.campus.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={() => window.open(`/print/job-letter/${e.id}`, '_blank')}>
              <Printer /> Job letter
            </Button>
            {canEdit && (
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    const next = e.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
                    if (!(await confirm({ title: next === 'INACTIVE' ? `Mark ${e.name} as left?` : `Re-activate ${e.name}?`, description: next === 'INACTIVE' ? 'Their login will be disabled immediately.' : undefined, confirmLabel: 'Confirm', tone: next === 'INACTIVE' ? 'danger' : 'primary' }))) return;
                    await api(`/api/employees/${e.id}`, { method: 'PUT', body: { status: next } });
                    toast.success('Updated');
                    refresh();
                  }}
                >
                  {e.status === 'ACTIVE' ? <><UserX /> Mark as left</> : <><UserCheck /> Re-activate</>}
                </Button>
                <Button size="sm" onClick={() => setEditing(true)}>
                  <Pencil /> Edit
                </Button>
              </>
            )}
            {can('employees', 'delete') && !isAdminRecord && (
              <Button
                variant="danger-soft"
                size="sm"
                onClick={async () => {
                  if (!(await confirm({ title: `Delete ${e.name}?`, description: 'Only employees without salary records can be deleted.', confirmLabel: 'Delete' }))) return;
                  try {
                    await api(`/api/employees/${e.id}`, { method: 'DELETE' });
                    toast.success('Deleted');
                    invalidate(['/api/employees']);
                    router.push('/employees');
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
              >
                <Trash2 />
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Details" />
          <CardBody>
            <KeyValue
              cols={3}
              items={[
                ['Gender', e.gender.toLowerCase()],
                ['Date of birth', formatDate(e.dob)],
                ['Blood group', e.bloodGroup],
                ['Mobile', e.phone],
                ['Email', e.email],
                ['Joined', formatDate(e.joiningDate, 'long')],
                ['Qualification', e.qualification],
                ['Experience', e.experienceYears != null ? `${e.experienceYears} years` : null],
                ["Father / spouse", e.fatherSpouseName],
                ['Aadhaar', e.aadhaarMasked],
                ['PAN', e.panNo],
                ['EPF UAN', e.uan],
                ['Address', e.address],
              ]}
            />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Login" icon={KeyRound} />
            <CardBody>
              {e.user ? (
                <div className="space-y-3 text-sm">
                  <p>
                    <code className="rounded bg-canvas px-1.5 py-0.5">{e.user.username}</code> <Badge tone="brand">{ROLE_LABELS[e.user.role as keyof typeof ROLE_LABELS]}</Badge>
                  </p>
                  <p className="text-xs text-ink-faint">Last login: {e.user.lastLoginAt ? formatDate(e.user.lastLoginAt) : 'never'}</p>
                  {canEdit && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        if (!(await confirm({ title: 'Reset password?', description: 'A temporary password will be issued.', confirmLabel: 'Reset', tone: 'primary' }))) return;
                        try {
                          setCreds([await api<Credential>(`/api/users/${e.user!.id}`, { method: 'POST' })]);
                        } catch (err) {
                          toast.error((err as Error).message);
                        }
                      }}
                    >
                      Reset password
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-ink-soft">This employee cannot sign in.</p>
                  {canEdit && (
                    <Button size="sm" onClick={() => setLoginOpen(true)}>
                      Create login
                    </Button>
                  )}
                </div>
              )}
            </CardBody>
          </Card>
          {e.basicSalary !== null && (
            <Card>
              <CardHeader title="Salary (monthly)" />
              <CardBody>
                <KeyValue
                  cols={1}
                  items={[
                    ['Basic', formatINR(e.basicSalary, true)],
                    ['Allowances', formatINR(e.allowances, true)],
                    ['Deductions', formatINR(e.deductions, true)],
                    ['Net pay', <b key="n">{formatINR((e.basicSalary ?? 0) + (e.allowances ?? 0) - (e.deductions ?? 0), true)}</b>],
                    ['Bank', [e.bankName, e.bankAccount, e.ifsc].filter(Boolean).join(' · ')],
                  ]}
                />
              </CardBody>
            </Card>
          )}
          {e.isTeaching && (
            <Card>
              <CardHeader title="Teaching load" />
              <CardBody className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-ink-faint">Class teacher of</p>
                  <p className="font-medium">{e.classTeacherOf.join(', ') || '—'}</p>
                </div>
                <div>
                  <p className="mb-1 text-xs text-ink-faint">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {e.teaches.length ? e.teaches.map((t) => <Badge key={t}>{t}</Badge>) : '—'}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      </div>

      <FormDialog
        open={editing}
        onOpenChange={setEditing}
        title={`Edit ${e.name}`}
        size="xl"
        editing
        fields={EMPLOYEE_FIELDS(assignable)}
        initial={{ ...e, dob: e.dob?.slice(0, 10) ?? '', joiningDate: e.joiningDate.slice(0, 10), aadhaar: '', bankAccount: '' }}
        onSubmit={async (v) => {
          const payload = { ...v };
          if (!payload.aadhaar) delete payload.aadhaar;
          if (!payload.bankAccount) delete payload.bankAccount;
          await api(`/api/employees/${e.id}`, { method: 'PUT', body: payload });
          toast.success('Employee updated');
          refresh();
        }}
      />
      <Dialog
        open={loginOpen}
        onOpenChange={setLoginOpen}
        title="Create login"
        size="sm"
        footer={
          <Button
            onClick={async () => {
              try {
                const c = await api<Credential>(`/api/employees/${e.id}`, { method: 'POST', body: { role: loginRole } });
                setLoginOpen(false);
                setCreds([c]);
                refresh();
              } catch (err) {
                toast.error((err as Error).message);
              }
            }}
          >
            Create
          </Button>
        }
      >
        <Field label="Role">
          <Select value={loginRole} onChange={(ev) => setLoginRole(ev.target.value)} options={assignable.map((r) => ({ value: r, label: ROLE_LABELS[r] }))} />
        </Field>
      </Dialog>
      <CredentialsDialog credentials={creds} onClose={() => setCreds([])} />
    </>
  );
}
