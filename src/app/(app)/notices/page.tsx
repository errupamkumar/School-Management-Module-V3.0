'use client';

import * as React from 'react';
import { Megaphone, Pin, Plus, ScrollText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { classOptions, useLookups } from '@/lib/lookups';
import { ROLE_LABELS, ROLES, type AppRole } from '@/lib/modules';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Notice {
  id: string;
  title: string;
  body: string;
  category: string;
  isPinned: boolean;
  publishAt: string;
  expiresAt: string | null;
  createdByName: string;
  createdById: string;
  audienceLabel: string;
  scheduled: boolean;
  expired: boolean;
}

const CAT_TONE: Record<string, 'brand' | 'danger' | 'warning' | 'success' | 'info' | 'neutral'> = { URGENT: 'danger', EXAM: 'brand', FEE: 'warning', HOLIDAY: 'info', EVENT: 'success', GENERAL: 'neutral' };

function Composer({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { role } = useApp();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes'], { mine: role === 'TEACHER' });
  const teacher = role === 'TEACHER';
  const [v, setV] = React.useState({ title: '', body: '', category: 'GENERAL', roles: teacher ? ['PARENT', 'STUDENT'] : ([] as string[]), classIds: [] as string[], isPinned: false, publishAt: '', expiresAt: '', sms: false });
  const [busy, setBusy] = React.useState(false);
  const toggle = (k: 'roles' | 'classIds', id: string) => setV((s) => ({ ...s, [k]: s[k].includes(id) ? s[k].filter((x) => x !== id) : [...s[k], id] }));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Post a notice"
      size="lg"
      footer={
        <Button
          loading={busy}
          disabled={!v.title || !v.body || (teacher && !v.classIds.length)}
          onClick={async () => {
            setBusy(true);
            try {
              const r = await api<{ recipients: number; sms: number }>('/api/notices', { method: 'POST', body: { ...v, publishAt: v.publishAt ? new Date(v.publishAt).toISOString() : null, expiresAt: v.expiresAt ? new Date(v.expiresAt).toISOString() : null } });
              toast.success(`Notice posted to ${r.recipients} people${r.sms ? ` · ${r.sms} SMS queued` : ''}`);
              invalidate(['/api/notices', '/api/dashboard', '/api/notifications']);
              onOpenChange(false);
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Megaphone /> Publish
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2">
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} />
        </Field>
        <Field label="Message" required className="sm:col-span-2">
          <Textarea rows={6} value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
        </Field>
        <Field label="Category">
          <Select value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} options={['GENERAL', 'URGENT', 'EXAM', 'FEE', 'HOLIDAY', 'EVENT'].map((c) => ({ value: c, label: c.toLowerCase().replace(/^\w/, (x) => x.toUpperCase()) }))} />
        </Field>
        {!teacher && (
          <Field label="Publish at (optional)">
            <Input type="datetime-local" value={v.publishAt} onChange={(e) => setV({ ...v, publishAt: e.target.value })} />
          </Field>
        )}
        <Field label="Expires at (optional)">
          <Input type="datetime-local" value={v.expiresAt} onChange={(e) => setV({ ...v, expiresAt: e.target.value })} />
        </Field>
        <div className="sm:col-span-2">
          <p className="label">Who should see it {!teacher && <span className="font-normal text-ink-faint">— none selected means everyone</span>}</p>
          <div className="flex flex-wrap gap-2">
            {(teacher ? ['PARENT', 'STUDENT'] : ROLES).map((r) => (
              <label key={r} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs', v.roles.includes(r) ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                <Checkbox checked={v.roles.includes(r)} onCheckedChange={() => toggle('roles', r)} /> {ROLE_LABELS[r as AppRole]}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <p className="label">Classes {teacher ? <span className="text-rose-500">*</span> : <span className="font-normal text-ink-faint">— optional</span>}</p>
          <div className="flex flex-wrap gap-2">
            {classOptions(lk).map((c) => (
              <label key={c.value} className={cn('flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs', v.classIds.includes(c.value) ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                <Checkbox checked={v.classIds.includes(c.value)} onCheckedChange={() => toggle('classIds', c.value)} /> {c.label}
              </label>
            ))}
          </div>
        </div>
        {!teacher && (
          <>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={v.isPinned} onCheckedChange={(x) => setV({ ...v, isPinned: x })} /> Pin to top
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={v.sms} onCheckedChange={(x) => setV({ ...v, sms: x })} /> Also SMS parents
            </label>
          </>
        )}
      </div>
    </Dialog>
  );
}

function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { data, isLoading } = useApiQuery<{ students: string | null; employees: string | null }>(open ? '/api/school/rules' : null);
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Rules & regulations" size="lg">
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.students && !data?.employees ? (
        <EmptyState icon={ScrollText} title="No rules published yet" />
      ) : (
        <div className="space-y-5">
          {data.students && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">For students & parents</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">{data.students}</p>
            </section>
          )}
          {data.employees && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">For staff</h3>
              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">{data.employees}</p>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

export default function NoticesPage() {
  const { can, me } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Notice[]>('/api/notices');
  const [open, setOpen] = React.useState(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  React.useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (id) setExpanded(id);
  }, []);
  return (
    <>
      <PageHeader
        title="Noticeboard"
        description="Announcements for staff, parents and students."
        icon={Megaphone}
        actions={
          <>
            <Button variant="secondary" onClick={() => setRulesOpen(true)}>
              <ScrollText /> Rules & regulations
            </Button>
            {can('notices', 'create') && (
              <Button onClick={() => setOpen(true)}>
                <Plus /> New notice
              </Button>
            )}
          </>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <Card>
          <EmptyState icon={Megaphone} title="No notices" />
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((n) => (
            <Card key={n.id} className={cn('overflow-hidden', n.isPinned && 'border-brand-300 dark:border-brand-500/40', (n.expired || n.scheduled) && 'opacity-70')}>
              <button className="flex w-full items-start gap-4 px-5 py-4 text-left" onClick={() => setExpanded((x) => (x === n.id ? null : n.id))}>
                <span className={cn('mt-1 flex size-9 shrink-0 items-center justify-center rounded-xl', n.category === 'URGENT' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10')}>
                  {n.isPinned ? <Pin className="size-4" /> : <Megaphone className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold">{n.title}</p>
                    <Badge tone={CAT_TONE[n.category]}>{n.category.toLowerCase()}</Badge>
                    {n.scheduled && <Badge tone="info">scheduled</Badge>}
                    {n.expired && <Badge>expired</Badge>}
                  </div>
                  <p className={cn('mt-1 whitespace-pre-wrap text-sm text-ink-soft', expanded !== n.id && 'line-clamp-2')}>{n.body}</p>
                  <p className="mt-2 text-xs text-ink-faint">
                    {n.createdByName} · {formatDateTime(n.publishAt)} · {n.audienceLabel}
                  </p>
                </div>
              </button>
              {(n.createdById === me.user.id || can('notices', 'delete')) && (
                <div className="flex justify-end border-t border-line px-5 py-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={async () => {
                      if (!(await confirm({ title: 'Delete this notice?', confirmLabel: 'Delete' }))) return;
                      try {
                        await api(`/api/notices/${n.id}`, { method: 'DELETE' });
                        invalidate(['/api/notices', '/api/dashboard']);
                      } catch (e) {
                        toast.error((e as Error).message);
                      }
                    }}
                  >
                    <Trash2 /> Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      <Composer open={open} onOpenChange={setOpen} />
      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
    </>
  );
}
