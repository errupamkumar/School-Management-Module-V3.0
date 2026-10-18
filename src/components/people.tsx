'use client';

import * as React from 'react';
import { Camera, Copy, KeyRound, Lock, Printer, ShieldOff, ShieldCheck, Unlock, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, usePagedQuery, useInvalidate } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Input, Select } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, useConfirm } from '@/components/ui/overlay';
import { MoreHorizontal, Search } from 'lucide-react';

// ----------------------------------------------------------------------------
// Photo picker: resizes to max 320px JPEG before upload (keeps records light).
// ----------------------------------------------------------------------------

export function PhotoPicker({ value, onChange, name }: { value: string | null | undefined; onChange: (v: string | null) => void; name: string }) {
  const ref = React.useRef<HTMLInputElement>(null);
  async function pick(file: File) {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast.error('Choose a PNG, JPEG or WebP image');
    if (file.size > 8 * 1024 * 1024) return toast.error('Image must be under 8 MB');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const scale = Math.min(1, 320 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src);
    onChange(canvas.toDataURL('image/jpeg', 0.85));
  }
  return (
    <div className="flex items-center gap-4">
      <Avatar name={name || '?'} src={value} size={72} />
      <div className="flex flex-col gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={() => ref.current?.click()}>
          <Camera /> {value ? 'Change photo' : 'Upload photo'}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Remove
          </Button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" capture="user" hidden onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
    </div>
  );
}

// ----------------------------------------------------------------------------
// One-time credentials display
// ----------------------------------------------------------------------------

export interface Credential {
  name: string;
  role: string;
  username: string;
  password: string;
}

export function CredentialsDialog({ credentials, onClose, title = 'Login details' }: { credentials: Credential[]; onClose: () => void; title?: string }) {
  const { me } = useApp();
  const printSlips = () => {
    try {
      sessionStorage.setItem('vidyalaya-print-credentials', JSON.stringify({ school: me.school.name, code: me.school.code, credentials }));
    } catch {
      // storage unavailable
    }
    window.open('/print/credentials', '_blank', 'noopener');
  };
  return (
    <Dialog
      open={credentials.length > 0}
      onOpenChange={(o) => !o && onClose()}
      title={title}
      description="These passwords are shown only once. Print or share them now — users must set a new password at first login."
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={printSlips}>
            <Printer /> Print login slips
          </Button>
          <Button onClick={onClose}>Done</Button>
        </>
      }
    >
      <div className="mb-3 rounded-xl bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:bg-brand-500/10 dark:text-brand-200">
        School code: <span className="font-mono font-bold">{me.school.code}</span>
      </div>
      <div className="divide-y divide-line rounded-xl border border-line">
        {credentials.map((c) => (
          <div key={c.username} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{c.name}</p>
              <p className="text-xs text-ink-faint">{c.role.replace('_', ' ').toLowerCase()}</p>
            </div>
            <code className="rounded-lg bg-canvas px-2 py-1 text-xs">{c.username}</code>
            <code className="rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">{c.password}</code>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Copy"
              onClick={() => {
                navigator.clipboard?.writeText(`School code: ${me.school.code}\nUsername: ${c.username}\nPassword: ${c.password}`);
                toast.success('Copied');
              }}
            >
              <Copy />
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Login accounts table (students / parents / staff)
// ----------------------------------------------------------------------------

interface LoginRow {
  id: string;
  name: string;
  username: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  pendingFirstLogin: boolean;
  locked: boolean;
  detail: string;
}

export function LoginsTable({ type, classOptions }: { type: 'STUDENT' | 'PARENT' | 'STAFF'; classOptions?: Array<{ value: string; label: string }> }) {
  const { can, role } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [page, setPage] = React.useState(1);
  const [search, setSearch] = React.useState('');
  const [classId, setClassId] = React.useState('');
  const [issued, setIssued] = React.useState<Credential[]>([]);
  const mod = type === 'STUDENT' ? 'students' : type === 'PARENT' ? 'guardians' : 'employees';
  const canEdit = can(mod, 'edit');
  const { data, isLoading, error } = usePagedQuery<LoginRow>('/api/users', { type, page, pageSize: 25, search: search || undefined, classId: classId || undefined });
  const refresh = () => invalidate(['/api/users']);
  const manageable = (r: LoginRow) => canEdit && !((r.role === 'SUPER_ADMIN' || r.role === 'ADMIN') && role !== 'SUPER_ADMIN');

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, username, phone…" className="h-9 pl-9" />
        </div>
        {classOptions && <Select className="h-9 w-40" value={classId} onChange={(e) => { setClassId(e.target.value); setPage(1); }} options={classOptions} placeholder="All classes" />}
        <p className="ml-auto text-xs text-ink-faint">Passwords are encrypted and never displayed. Use “Reset password” to issue a new one.</p>
      </div>
      <DataTable<LoginRow>
        data={data?.data}
        loading={isLoading}
        error={error?.message}
        pagination={data ? { page, pageSize: 25, total: data.total, onPageChange: setPage } : undefined}
        columns={[
          { accessorKey: 'name', header: 'Name', cell: ({ row }) => <div><p className="font-medium">{row.original.name}</p><p className="text-xs text-ink-faint">{row.original.detail}</p></div> },
          { accessorKey: 'username', header: 'Username', cell: ({ getValue }) => <code className="rounded bg-canvas px-1.5 py-0.5 text-xs">{getValue()}</code> },
          { accessorKey: 'role', header: 'Role', cell: ({ getValue }) => <Badge>{String(getValue()).replace('_', ' ').toLowerCase()}</Badge> },
          {
            id: 'state',
            header: 'Status',
            cell: ({ row }) =>
              !row.original.isActive ? <Badge tone="neutral" dot>Disabled</Badge> : row.original.locked ? <Badge tone="danger" dot>Locked</Badge> : row.original.pendingFirstLogin ? <Badge tone="warning" dot>Awaiting first login</Badge> : <Badge tone="success" dot>Active</Badge>,
          },
          { accessorKey: 'lastLoginAt', header: 'Last login', cell: ({ getValue }) => <span className="text-xs text-ink-soft">{getValue() ? formatDateTime(getValue()) : 'Never'}</span> },
          {
            id: 'actions',
            header: '',
            cell: ({ row }) =>
              manageable(row.original) ? (
                <Menu>
                  <MenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Account actions">
                      <MoreHorizontal />
                    </Button>
                  </MenuTrigger>
                  <MenuContent>
                    <MenuItem
                      onSelect={async () => {
                        if (!(await confirm({ title: `Reset password for ${row.original.name}?`, description: 'A new temporary password will be issued and the user will be signed out of all devices.', confirmLabel: 'Reset', tone: 'primary' }))) return;
                        try {
                          const c = await api<Credential>(`/api/users/${row.original.id}`, { method: 'POST' });
                          setIssued([c]);
                          refresh();
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <KeyRound /> Reset password
                    </MenuItem>
                    {row.original.locked && (
                      <MenuItem onSelect={async () => { await api(`/api/users/${row.original.id}`, { method: 'PATCH', body: { unlock: true } }); toast.success('Unlocked'); refresh(); }}>
                        <Unlock /> Unlock
                      </MenuItem>
                    )}
                    <MenuItem
                      danger={row.original.isActive}
                      onSelect={async () => {
                        await api(`/api/users/${row.original.id}`, { method: 'PATCH', body: { isActive: !row.original.isActive } });
                        toast.success(row.original.isActive ? 'Login disabled' : 'Login enabled');
                        refresh();
                      }}
                    >
                      {row.original.isActive ? <><ShieldOff /> Disable login</> : <><ShieldCheck /> Enable login</>}
                    </MenuItem>
                  </MenuContent>
                </Menu>
              ) : (
                <Lock className="size-4 text-ink-faint" aria-label="Not manageable" />
              ),
          },
        ]}
      />
      <CredentialsDialog credentials={issued} onClose={() => setIssued([])} title="New temporary password" />
    </Card>
  );
}
