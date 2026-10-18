'use client';

import * as React from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Building2, CalendarClock, Copy, GraduationCap, IndianRupee, KeyRound, Layers, LogOut, MoreVertical, Pencil, Plus, Power, School, ShieldAlert, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate, formatDateTime, formatINR } from '@/lib/utils';
import { FormDialog, type FieldDef } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, LoadingBlock, StatCard, type Tone } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Input, Select } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger, Tabs, TabPanel, usePrompt } from '@/components/ui/overlay';

interface Stats {
  schools: Record<string, number>;
  totalStudents: number;
  totalStaff: number;
  newThisMonth: number;
  mrr: number;
  trialsEnding: Array<{ id: string; code: string; name: string; trialEndsAt: string }>;
  plans: Array<{ id: string; name: string; schools: number }>;
}
interface SchoolRow {
  id: string;
  code: string;
  name: string;
  city: string | null;
  state: string | null;
  board: string | null;
  phone: string | null;
  email: string | null;
  status: 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED';
  trialEndsAt: string | null;
  subscriptionEndsAt: string | null;
  createdAt: string;
  planId: string | null;
  plan: { name: string; maxStudents: number | null } | null;
  students: number;
  staff: number;
  lastLoginAt: string | null;
}
interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceMonthly: number;
  pricePerStudent: number;
  maxStudents: number | null;
  maxCampuses: number | null;
  modules: string[];
  isActive: boolean;
  sortOrder: number;
  _count: { schools: number };
}
interface Catalog {
  key: string;
  label: string;
  group: string;
  core: boolean;
}

const STATUS_TONE: Record<SchoolRow['status'], Tone> = { TRIAL: 'warning', ACTIVE: 'success', SUSPENDED: 'danger', CANCELLED: 'neutral' };
const STATES = ['Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu and Kashmir', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'];

function OneTimeCredentials({ cred, onClose }: { cred: { title: string; code?: string; username: string; password: string } | null; onClose: () => void }) {
  if (!cred) return null;
  const text = `${cred.code ? `School code: ${cred.code}\n` : ''}Username: ${cred.username}\nTemporary password: ${cred.password}\nSign in at: ${window.location.origin}/login`;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={cred.title} description="Shown only once. Share it securely with the school owner — they must set a new password at first sign-in.">
      <pre className="rounded-xl bg-canvas p-4 font-mono text-sm">{text}</pre>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="secondary" onClick={() => navigator.clipboard.writeText(text).then(() => toast.success('Copied'), () => undefined)}>
          <Copy /> Copy
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Dialog>
  );
}

function Overview() {
  const { data } = useApiQuery<Stats>('/api/platform/stats');
  if (!data) return <LoadingBlock />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Paying schools" value={String(data.schools.ACTIVE ?? 0)} icon={School} tone="emerald" hint={`${data.newThisMonth} new this month`} />
        <StatCard label="On trial" value={String(data.schools.TRIAL ?? 0)} icon={CalendarClock} tone="amber" hint={`${data.trialsEnding.length} ending in 7 days`} />
        <StatCard label="Monthly recurring revenue" value={formatINR(data.mrr, true)} icon={IndianRupee} tone="violet" />
        <StatCard label="Active students" value={data.totalStudents.toLocaleString('en-IN')} icon={Users} hint={`${data.totalStaff.toLocaleString('en-IN')} staff`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Trials ending soon" description="Follow up before they lapse to read-only." icon={CalendarClock} />
          <CardBody>
            {!data.trialsEnding.length ? (
              <p className="text-sm text-ink-faint">No trials end in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-line">
                {data.trialsEnding.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <span>
                      <b>{s.name}</b> <span className="font-mono text-xs text-ink-faint">{s.code}</span>
                    </span>
                    <Badge tone="warning">{formatDate(s.trialEndsAt)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Schools by plan" icon={Layers} />
          <CardBody className="space-y-2">
            {data.plans.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <span>{p.name}</span>
                <Badge>{p.schools}</Badge>
              </div>
            ))}
            {(data.schools.SUSPENDED ?? 0) > 0 && (
              <p className="flex items-center gap-1.5 pt-2 text-xs text-rose-600">
                <ShieldAlert className="size-3.5" /> {data.schools.SUSPENDED} suspended
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Schools({ plans }: { plans: Plan[] }) {
  const invalidate = useInvalidate();
  const prompt = usePrompt();
  const [search, setSearch] = React.useState('');
  const [status, setStatus] = React.useState('');
  const { data, isLoading } = useApiQuery<SchoolRow[]>('/api/platform/schools', { search: search.trim() || undefined, status: status || undefined });
  const [onboard, setOnboard] = React.useState(false);
  const [cred, setCred] = React.useState<{ title: string; code?: string; username: string; password: string } | null>(null);
  const [edit, setEdit] = React.useState<SchoolRow | null>(null);
  const refresh = () => invalidate(['/api/platform']);

  const patch = async (s: SchoolRow, body: Record<string, unknown>, ok: string) => {
    try {
      await api(`/api/platform/schools/${s.id}`, { method: 'PATCH', body });
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const onboardFields: FieldDef[] = [
    { name: 'name', label: 'School name', required: true, span: 2 },
    { name: 'code', label: 'School code', required: true, hint: 'Typed on the login screen, e.g. DPSRANCHI' },
    { name: 'board', label: 'Board', type: 'select', options: ['CBSE', 'ICSE', 'STATE', 'IB', 'CAMBRIDGE', 'NIOS', 'OTHER'].map((b) => ({ value: b, label: b })) },
    { name: 'city', label: 'City' },
    { name: 'state', label: 'State', type: 'select', options: STATES.map((s) => ({ value: s, label: s })) },
    { name: 'phone', label: 'School phone', type: 'tel' },
    { name: 'email', label: 'School email', type: 'email' },
    { name: 'planId', label: 'Plan', type: 'select', required: true, options: plans.filter((p) => p.isActive).map((p) => ({ value: p.id, label: `${p.name} — ${p.priceMonthly ? `${formatINR(p.priceMonthly, true)}/mo` : `${formatINR(p.pricePerStudent, true)}/student`}` })) },
    { name: 'status', label: 'Start as', type: 'select', options: [{ value: 'TRIAL', label: 'Free trial' }, { value: 'ACTIVE', label: 'Paid (active)' }] },
    { name: 'trialDays', label: 'Trial days', type: 'number', visible: (v) => v.status !== 'ACTIVE' },
    { name: 'subscriptionEndsAt', label: 'Paid until', type: 'date', visible: (v) => v.status === 'ACTIVE' },
    { name: 'ownerName', label: 'Owner / principal name', required: true },
    { name: 'ownerUsername', label: 'Owner username', required: true },
    { name: 'ownerEmail', label: 'Owner email', type: 'email' },
    { name: 'ownerPhone', label: 'Owner mobile', type: 'tel' },
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
        <Input className="w-64" placeholder="Search name, code, city…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select className="w-40" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: '', label: 'All statuses' }, { value: 'TRIAL', label: 'Trial' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'CANCELLED', label: 'Cancelled' }]} />
        <Button className="ml-auto" onClick={() => setOnboard(true)}>
          <Plus /> Onboard school
        </Button>
      </div>
      <DataTable<SchoolRow>
        data={data}
        loading={isLoading}
        emptyTitle="No schools yet"
        columns={[
          { accessorKey: 'name', header: 'School', cell: ({ row: { original: s } }) => <div><p className="font-medium">{s.name}</p><p className="text-xs text-ink-faint"><span className="font-mono">{s.code}</span>{s.city ? ` · ${s.city}` : ''}{s.board ? ` · ${s.board}` : ''}</p></div> },
          { id: 'plan', header: 'Plan', cell: ({ row: { original: s } }) => s.plan?.name ?? '—' },
          {
            accessorKey: 'status',
            header: 'Status',
            cell: ({ row: { original: s } }) => (
              <div>
                <Badge tone={STATUS_TONE[s.status]}>{s.status.toLowerCase()}</Badge>
                <p className="mt-0.5 text-[11px] text-ink-faint">{s.status === 'TRIAL' && s.trialEndsAt ? `ends ${formatDate(s.trialEndsAt)}` : s.status === 'ACTIVE' && s.subscriptionEndsAt ? `paid till ${formatDate(s.subscriptionEndsAt)}` : ''}</p>
              </div>
            ),
          },
          { accessorKey: 'students', header: 'Students', cell: ({ row: { original: s } }) => <span className={cn('tabular-nums', s.plan?.maxStudents && s.students > s.plan.maxStudents * 0.9 && 'font-semibold text-amber-700')}>{s.students}{s.plan?.maxStudents ? ` / ${s.plan.maxStudents}` : ''}</span> },
          { accessorKey: 'staff', header: 'Staff' },
          { accessorKey: 'lastLoginAt', header: 'Last sign-in', cell: ({ getValue }) => <span className="text-xs">{getValue() ? formatDateTime(getValue()) : 'never'}</span> },
          {
            id: 'actions',
            header: '',
            cell: ({ row: { original: s } }) => (
              <Menu>
                <MenuTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label="Actions">
                    <MoreVertical />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => setEdit(s)}>
                    <Pencil /> Plan & dates
                  </MenuItem>
                  {s.status !== 'ACTIVE' && (
                    <MenuItem onSelect={() => patch(s, { status: 'ACTIVE' }, `${s.name} activated`)}>
                      <Power /> Activate
                    </MenuItem>
                  )}
                  <MenuItem
                    onSelect={async () => {
                      const reason = await prompt({ title: `Reset ${s.name}'s owner password?`, description: 'A temporary password is issued and all owner sessions are signed out. The school sees this in its audit log.', label: 'Reason / ticket no.', minLength: 5, confirmLabel: 'Reset', tone: 'primary' });
                      if (!reason) return;
                      try {
                        const r = await api<{ username: string; password: string }>(`/api/platform/schools/${s.id}/reset-owner`, { method: 'POST', body: { reason } });
                        setCred({ title: `New owner password · ${s.name}`, code: s.code, ...r });
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <KeyRound /> Reset owner password
                  </MenuItem>
                  <MenuSeparator />
                  {s.status !== 'SUSPENDED' && (
                    <MenuItem
                      danger
                      onSelect={async () => {
                        const reason = await prompt({ title: `Suspend ${s.name}?`, description: 'All users are blocked from signing in until the school is re-activated. Data is kept.', label: 'Reason', minLength: 3, confirmLabel: 'Suspend' });
                        if (reason) patch(s, { status: 'SUSPENDED', reason }, `${s.name} suspended`);
                      }}
                    >
                      <ShieldAlert /> Suspend
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            ),
          },
        ]}
      />
      <FormDialog
        open={onboard}
        onOpenChange={setOnboard}
        title="Onboard a school"
        description="Creates the school with a main campus, current session, grade scale, fee and account heads, certificate templates and an owner login."
        size="xl"
        fields={onboardFields}
        initial={{ status: 'TRIAL', trialDays: 14, ownerUsername: 'owner', planId: plans.find((p) => p.isActive)?.id ?? '' }}
        submitLabel="Create school"
        onSubmit={async (v) => {
          const r = await api<{ code: string; credential: { username: string; password: string } }>('/api/platform/schools', {
            method: 'POST',
            body: { code: v.code, name: v.name, city: v.city || null, state: v.state || null, board: v.board || null, phone: v.phone || null, email: v.email || null, planId: v.planId, status: v.status, trialDays: Number(v.trialDays) || 14, subscriptionEndsAt: v.subscriptionEndsAt || null, owner: { name: v.ownerName, username: v.ownerUsername, email: v.ownerEmail || null, phone: v.ownerPhone || null } },
          });
          refresh();
          setCred({ title: `${v.name} is ready`, code: r.code, ...r.credential });
        }}
      />
      {edit && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEdit(null)}
          title={`${edit.name} — plan & dates`}
          fields={[
            { name: 'planId', label: 'Plan', type: 'select', options: plans.map((p) => ({ value: p.id, label: p.name })) },
            { name: 'status', label: 'Status', type: 'select', options: [{ value: 'TRIAL', label: 'Trial' }, { value: 'ACTIVE', label: 'Active' }, { value: 'SUSPENDED', label: 'Suspended' }, { value: 'CANCELLED', label: 'Cancelled' }] },
            { name: 'trialEndsAt', label: 'Trial ends', type: 'date' },
            { name: 'subscriptionEndsAt', label: 'Paid until', type: 'date' },
            { name: 'reason', label: 'Note / reason', hint: 'Required when suspending or cancelling', span: 2 },
          ]}
          initial={{ planId: edit.planId ?? '', status: edit.status, trialEndsAt: edit.trialEndsAt?.slice(0, 10) ?? '', subscriptionEndsAt: edit.subscriptionEndsAt?.slice(0, 10) ?? '' }}
          onSubmit={async (v) => {
            await api(`/api/platform/schools/${edit.id}`, { method: 'PATCH', body: { ...(v.planId && v.planId !== edit.planId ? { planId: v.planId } : {}), status: v.status, trialEndsAt: v.trialEndsAt || null, subscriptionEndsAt: v.subscriptionEndsAt || null, ...(v.reason ? { reason: v.reason } : {}) } });
            toast.success('Saved');
            refresh();
          }}
        />
      )}
      <OneTimeCredentials cred={cred} onClose={() => setCred(null)} />
    </Card>
  );
}

function PlanEditor({ plan, catalog, onClose }: { plan: Plan | 'new'; catalog: Catalog[]; onClose: () => void }) {
  const invalidate = useInvalidate();
  const isNew = plan === 'new';
  const [v, setV] = React.useState(() => (isNew ? { code: '', name: '', description: '', priceMonthly: 0, pricePerStudent: 0, maxStudents: '' as number | '', maxCampuses: '' as number | '', modules: catalog.map((c) => c.key), isActive: true } : { ...plan, description: plan.description ?? '', maxStudents: plan.maxStudents ?? ('' as const), maxCampuses: plan.maxCampuses ?? ('' as const) }));
  const [busy, setBusy] = React.useState(false);
  const groups = [...new Set(catalog.map((c) => c.group))];
  const toggle = (key: string, on: boolean) => setV((x) => ({ ...x, modules: on ? [...x.modules, key] : x.modules.filter((m) => m !== key) }));
  async function save() {
    setBusy(true);
    try {
      const payload = { name: v.name, description: v.description || null, priceMonthly: Number(v.priceMonthly), pricePerStudent: Number(v.pricePerStudent), maxStudents: v.maxStudents === '' ? null : Number(v.maxStudents), maxCampuses: v.maxCampuses === '' ? null : Number(v.maxCampuses), modules: v.modules, isActive: v.isActive };
      await api(isNew ? '/api/platform/plans' : `/api/platform/plans/${(plan as Plan).id}`, { method: isNew ? 'POST' : 'PUT', body: isNew ? { ...payload, code: v.code } : payload });
      toast.success('Plan saved');
      invalidate(['/api/platform']);
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const num = (k: 'priceMonthly' | 'pricePerStudent' | 'maxStudents' | 'maxCampuses', label: string, hint?: string) => (
    <label className="text-sm">
      <span className="mb-1 block font-medium">{label}</span>
      <Input type="number" min={0} value={v[k]} onChange={(e) => setV((x) => ({ ...x, [k]: e.target.value === '' ? '' : Number(e.target.value) }))} placeholder={hint} />
    </label>
  );
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={isNew ? 'New plan' : `Edit ${(plan as Plan).name}`} size="xl" footer={<Button loading={busy} disabled={!v.name || (isNew && !v.code)} onClick={save}>Save plan</Button>}>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {isNew && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Code</span>
              <Input value={v.code} onChange={(e) => setV((x) => ({ ...x, code: e.target.value.toUpperCase() }))} placeholder="PREMIUM" />
            </label>
          )}
          <label className="text-sm">
            <span className="mb-1 block font-medium">Name</span>
            <Input value={v.name} onChange={(e) => setV((x) => ({ ...x, name: e.target.value }))} />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block font-medium">Description</span>
            <Input value={v.description} onChange={(e) => setV((x) => ({ ...x, description: e.target.value }))} />
          </label>
          {num('priceMonthly', 'Price / month (₹)')}
          {num('pricePerStudent', 'Price / student / month (₹)')}
          {num('maxStudents', 'Max students', 'Unlimited')}
          {num('maxCampuses', 'Max campuses', 'Unlimited')}
          <label className="flex items-center gap-2 self-end pb-2 text-sm">
            <Checkbox checked={v.isActive} onCheckedChange={(c) => setV((x) => ({ ...x, isActive: c === true }))} /> Available for new schools
          </label>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Included modules ({v.modules.length})</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">{g}</p>
                {catalog
                  .filter((c) => c.group === g)
                  .map((c) => (
                    <label key={c.key} className="flex items-center gap-2 py-0.5 text-sm">
                      <Checkbox disabled={c.core} checked={c.core || v.modules.includes(c.key)} onCheckedChange={(on) => toggle(c.key, on === true)} />
                      {c.label} {c.core && <span className="text-[10px] text-ink-faint">core</span>}
                    </label>
                  ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  );
}

function Plans({ plans, catalog }: { plans: Plan[]; catalog: Catalog[] }) {
  const [editing, setEditing] = React.useState<Plan | 'new' | null>(null);
  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button onClick={() => setEditing('new')}>
          <Plus /> New plan
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((p) => (
          <Card key={p.id} className={cn(!p.isActive && 'opacity-60')}>
            <CardHeader title={p.name} description={p.description ?? undefined} actions={<Button size="sm" variant="ghost" onClick={() => setEditing(p)}><Pencil /> Edit</Button>} />
            <CardBody className="space-y-2 text-sm">
              <p className="text-2xl font-bold">{p.priceMonthly ? `${formatINR(p.priceMonthly, true)}` : `${formatINR(p.pricePerStudent, true)}`}<span className="text-sm font-normal text-ink-faint">{p.priceMonthly ? ' / month' : ' / student / month'}</span></p>
              <p className="text-ink-soft">{p.maxStudents ? `Up to ${p.maxStudents.toLocaleString('en-IN')} students` : 'Unlimited students'} · {p.maxCampuses ? `${p.maxCampuses} campus${p.maxCampuses > 1 ? 'es' : ''}` : 'unlimited campuses'}</p>
              <p className="text-ink-soft">{p.modules.length} of {catalog.length} modules</p>
              <div className="flex gap-2">
                <Badge>{p._count.schools} schools</Badge>
                {!p.isActive && <Badge tone="warning">retired</Badge>}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {editing && <PlanEditor plan={editing} catalog={catalog} onClose={() => setEditing(null)} />}
    </>
  );
}

export default function PlatformPage() {
  const { data: session } = useSession();
  const [tab, setTab] = React.useState('overview');
  const plans = useApiQuery<{ plans: Plan[]; catalog: Catalog[] }>('/api/platform/plans');
  React.useEffect(() => {
    document.title = 'Platform console · Vidyalaya';
  }, []);
  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-3 px-4 py-3 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-violet-600 text-white">
            <GraduationCap className="size-5" />
          </span>
          <div className="flex-1">
            <p className="font-bold">Vidyalaya Platform</p>
            <p className="text-xs text-ink-faint">SaaS operator console</p>
          </div>
          <span className="hidden text-sm text-ink-soft sm:inline">{session?.user?.name}</span>
          <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: '/login' })}>
            <LogOut /> Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'overview', label: 'Overview' },
            { value: 'schools', label: 'Schools' },
            { value: 'plans', label: 'Plans' },
          ]}
        >
          <TabPanel value="overview">
            <Overview />
          </TabPanel>
          <TabPanel value="schools">{plans.data ? <Schools plans={plans.data.plans} /> : <LoadingBlock />}</TabPanel>
          <TabPanel value="plans">{plans.data ? <Plans plans={plans.data.plans} catalog={plans.data.catalog} /> : <LoadingBlock />}</TabPanel>
        </Tabs>
        <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-ink-faint">
          <Building2 className="size-3.5" /> Every action here is audited. School data is never shown in this console.
        </p>
      </main>
    </div>
  );
}
