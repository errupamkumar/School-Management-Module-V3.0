'use client';

import * as React from 'react';
import { Lock, RotateCcw, Save, ShieldCheck, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { ACTIONS, ROLE_LABELS, type Action, type Perm, type SchoolRole } from '@/lib/modules';
import { cn } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, ErrorState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Select, Switch } from '@/components/ui/form';
import { Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface ModuleRow {
  key: string;
  label: string;
  labelHi: string;
  group: string;
  description: string;
  core: boolean;
  inPlan: boolean;
  enabled: boolean;
}
type Cell = Perm & { overridden: boolean; ceiling: Perm };
interface Payload {
  planName: string | null;
  modules: ModuleRow[];
  roles: Array<{ role: SchoolRole; editable: boolean }>;
  matrix: Record<string, Record<string, Cell>>;
}

const ACTION_LABEL: Record<Action, string> = { view: 'View', create: 'Add', edit: 'Edit', delete: 'Delete' };

function groupBy<T>(rows: T[], key: (r: T) => string) {
  const out = new Map<string, T[]>();
  for (const r of rows) out.set(key(r), [...(out.get(key(r)) ?? []), r]);
  return [...out.entries()];
}

function ModulesTab({ data, editable, onSaved }: { data: Payload; editable: boolean; onSaved: () => void }) {
  const confirm = useConfirm();
  const [pending, setPending] = React.useState<string | null>(null);
  async function toggle(m: ModuleRow, enabled: boolean) {
    if (!enabled && !(await confirm({ title: `Switch off ${m.label}?`, description: 'It disappears from the menu for every role, and its pages and APIs stop working. Data is kept and comes back when you switch it on again.', tone: 'danger', confirmLabel: 'Switch off' }))) return;
    setPending(m.key);
    try {
      await api('/api/access-control/modules', { method: 'PUT', body: { changes: [{ module: m.key, enabled }] } });
      toast.success(`${m.label} ${enabled ? 'switched on' : 'switched off'}`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setPending(null);
    }
  }
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {groupBy(data.modules, (m) => m.group).map(([group, mods]) => (
        <Card key={group}>
          <CardHeader title={group} />
          <ul className="divide-y divide-line">
            {mods.map((m) => (
              <li key={m.key} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {m.label}
                    {m.core && <Badge>core</Badge>}
                    {!m.inPlan && <Badge tone="warning">not in {data.planName ?? 'plan'}</Badge>}
                  </p>
                  <p className="text-xs text-ink-faint">{m.description}</p>
                </div>
                {m.core || !m.inPlan ? (
                  <Lock className="size-4 shrink-0 text-ink-faint" aria-label={m.core ? 'Always on' : 'Upgrade plan to enable'} />
                ) : (
                  <Switch aria-label={m.label} disabled={!editable || pending === m.key} checked={m.enabled} onCheckedChange={(c) => toggle(m, c)} />
                )}
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

function MatrixTab({ data, onSaved }: { data: Payload; onSaved: () => void }) {
  const confirm = useConfirm();
  const [role, setRole] = React.useState<SchoolRole>(data.roles.find((r) => r.role === 'TEACHER')?.role ?? data.roles[0].role);
  const [draft, setDraft] = React.useState<Record<string, Perm>>({});
  const [busy, setBusy] = React.useState(false);
  const editable = data.roles.find((r) => r.role === role)?.editable ?? false;
  const cells = data.matrix[role];
  React.useEffect(() => setDraft({}), [role, data]);

  const value = (module: string): Perm => draft[module] ?? cells[module];
  const dirty = Object.keys(draft).filter((k) => ACTIONS.some((a) => draft[k][a] !== cells[k][a]));

  function set(module: string, action: Action, on: boolean) {
    const cur = { ...value(module), [action]: on };
    // Write rights need view; removing view removes everything.
    if (on && action !== 'view') cur.view = true;
    if (!on && action === 'view') ACTIONS.forEach((a) => (cur[a] = false));
    const ceiling = cells[module].ceiling;
    ACTIONS.forEach((a) => (cur[a] = cur[a] && ceiling[a]));
    setDraft((d) => ({ ...d, [module]: cur }));
  }

  async function save() {
    setBusy(true);
    try {
      await api('/api/access-control/permissions', { method: 'PUT', body: { changes: dirty.map((module) => ({ role, module, perm: draft[module] })) } });
      toast.success(`Permissions saved for ${ROLE_LABELS[role]}`);
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const enabledModules = data.modules.filter((m) => m.enabled);
  const overridden = enabledModules.filter((m) => cells[m.key].overridden).length;
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
        <Select className="w-56" value={role} onChange={(e) => setRole(e.target.value as SchoolRole)} options={data.roles.map((r) => ({ value: r.role, label: ROLE_LABELS[r.role] }))} />
        {overridden > 0 && <Badge tone="brand">{overridden} customised</Badge>}
        {!editable && (
          <span className="flex items-center gap-1 text-xs text-ink-faint">
            <Lock className="size-3.5" /> {role === 'ADMIN' ? 'Only the owner can change Principal/Admin rights.' : 'Read-only'}
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {editable && overridden > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!(await confirm({ title: `Reset ${ROLE_LABELS[role]} to defaults?`, description: 'All customisations for this role are removed.', confirmLabel: 'Reset' }))) return;
                try {
                  await api(`/api/access-control/permissions?role=${role}`, { method: 'DELETE' });
                  toast.success('Reset to defaults');
                  onSaved();
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              <RotateCcw /> Reset to defaults
            </Button>
          )}
          {editable && (
            <Button size="sm" disabled={!dirty.length} loading={busy} onClick={save}>
              <Save /> Save{dirty.length ? ` (${dirty.length})` : ''}
            </Button>
          )}
        </div>
      </div>
      {(role === 'PARENT' || role === 'STUDENT') && <p className="border-b border-line bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Family accounts can be restricted but not given more than the standard parent/student access, because they only ever see their own children&apos;s records.</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-2 font-medium">Module</th>
              {ACTIONS.map((a) => (
                <th key={a} className="w-20 px-2 py-2 text-center font-medium">
                  {ACTION_LABEL[a]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groupBy(enabledModules, (m) => m.group).map(([group, mods]) => (
              <React.Fragment key={group}>
                <tr>
                  <td colSpan={5} className="bg-canvas px-4 py-1.5 text-xs font-semibold text-ink-soft">
                    {group}
                  </td>
                </tr>
                {mods.map((m) => {
                  const v = value(m.key);
                  const changed = dirty.includes(m.key);
                  return (
                    <tr key={m.key} className={cn('border-b border-line/60', changed && 'bg-brand-50/60 dark:bg-brand-950/30')}>
                      <td className="px-4 py-2">
                        <span className="font-medium">{m.label}</span>
                        {cells[m.key].overridden && !changed && <span className="ml-2 inline-block size-1.5 rounded-full bg-brand-500 align-middle" title="Customised" />}
                      </td>
                      {ACTIONS.map((a) => {
                        const allowed = cells[m.key].ceiling[a];
                        return (
                          <td key={a} className="px-2 py-2 text-center">
                            <Checkbox aria-label={`${m.label} ${a}`} checked={v[a]} disabled={!editable || !allowed} onCheckedChange={(c) => set(m.key, a, c === true)} className={!allowed ? 'opacity-30' : undefined} />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function AccessControlPage() {
  const { can, refresh } = useApp();
  const invalidate = useInvalidate();
  const q = useApiQuery<Payload>('/api/access-control');
  const [tab, setTab] = React.useState('modules');
  const onSaved = () => {
    invalidate(['/api/access-control', '/api/me']);
    refresh();
  };
  return (
    <>
      <PageHeader title="Roles & permissions" description="Switch features on or off for the whole school, and decide what each role can view, add, edit or delete. The owner account is never restricted." icon={ShieldCheck} />
      {q.error ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <LoadingBlock />
      ) : (
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'modules', label: 'Modules', count: q.data.modules.filter((m) => m.enabled).length },
            { value: 'matrix', label: 'Role permissions' },
          ]}
        >
          <TabPanel value="modules">
            <p className="mb-3 flex items-center gap-2 text-sm text-ink-soft">
              <ToggleRight className="size-4" /> Changes apply to everyone within a few seconds.
            </p>
            <ModulesTab data={q.data} editable={can('access_control', 'edit')} onSaved={onSaved} />
          </TabPanel>
          <TabPanel value="matrix">
            <MatrixTab data={q.data} onSaved={onSaved} />
          </TabPanel>
        </Tabs>
      )}
    </>
  );
}
