'use client';

import * as React from 'react';
import { AlarmClock, BellOff, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { AudiencePicker, audienceLabel, type AudienceValue } from '@/components/audience-picker';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Reminder {
  id: string;
  title: string;
  message: string;
  remindAt: string;
  repeat: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  audience: (AudienceValue & { self?: boolean }) | { self: true };
  channels: string[];
  status: 'SCHEDULED' | 'SENT' | 'CANCELLED';
  sentCount: number;
  lastSentAt: string | null;
  createdByName: string;
  mine: boolean;
}

const REPEAT = { NONE: 'Once', DAILY: 'Every day', WEEKLY: 'Every week', MONTHLY: 'Every month' };
const CHANNELS = [
  { value: 'APP', label: 'App & phone' },
  { value: 'SMS', label: 'SMS' },
  { value: 'EMAIL', label: 'Email' },
];

export default function RemindersPage() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [scope, setScope] = React.useState<'mine' | 'all'>('mine');
  const [open, setOpen] = React.useState(false);
  const { data, isLoading } = useApiQuery<Reminder[]>('/api/reminders', { scope });
  const patch = async (r: Reminder, body: Record<string, unknown>) => {
    try {
      await api(`/api/reminders/${r.id}`, { method: 'PATCH', body });
      invalidate(['/api/reminders']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <>
      <PageHeader
        title="Reminders"
        description="Scheduled and repeating reminders by app, phone, SMS or email."
        icon={AlarmClock}
        actions={
          can('reminders', 'create') && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New reminder
            </Button>
          )
        }
      />
      <Card>
        {can('reminders', 'edit') && (
          <div className="border-b border-line p-3">
            <Segmented size="sm" value={scope} onChange={setScope} options={[{ value: 'mine', label: 'Mine' }, { value: 'all', label: 'Everyone’s' }]} />
          </div>
        )}
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={AlarmClock} title="No reminders" description="Remind yourself about a deadline, or remind parents of a class about tomorrow’s trip." />
        ) : (
          <DataTable<Reminder>
            data={data}
            columns={[
              { accessorKey: 'title', header: 'Reminder', cell: ({ row }) => <div className="max-w-sm"><p className="font-medium">{row.original.title}</p><p className="line-clamp-1 text-xs text-ink-faint">{row.original.message}</p></div> },
              { accessorKey: 'remindAt', header: 'When', cell: ({ row }) => <div><p>{formatDateTime(row.original.remindAt)}</p><p className="text-xs text-ink-faint">{REPEAT[row.original.repeat]}</p></div> },
              { id: 'who', header: 'For', cell: ({ row }) => ('self' in row.original.audience && row.original.audience.self ? 'Me' : audienceLabel(row.original.audience as AudienceValue)) },
              { id: 'via', header: 'Via', cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.channels.map((c) => <Badge key={c}>{CHANNELS.find((x) => x.value === c)?.label ?? c}</Badge>)}</div> },
              { accessorKey: 'status', header: 'Status', cell: ({ row }) => <StatusBadge status={row.original.status === 'SCHEDULED' ? 'PENDING' : row.original.status} label={row.original.status === 'SCHEDULED' ? (row.original.sentCount ? `Sent ${row.original.sentCount}×, next due` : 'Scheduled') : undefined} /> },
              {
                id: 'a',
                header: '',
                cell: ({ row }) => (
                  <div className="flex justify-end gap-1">
                    {row.original.status === 'SCHEDULED' && (
                      <Button size="sm" variant="ghost" onClick={() => patch(row.original, { status: 'CANCELLED' })}>
                        <BellOff /> Stop
                      </Button>
                    )}
                    {row.original.status === 'CANCELLED' && new Date(row.original.remindAt) > new Date() && (
                      <Button size="sm" variant="ghost" onClick={() => patch(row.original, { status: 'SCHEDULED' })}>
                        <RotateCcw /> Resume
                      </Button>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Delete reminder"
                      onClick={async () => {
                        if (!(await confirm({ title: `Delete "${row.original.title}"?`, confirmLabel: 'Delete' }))) return;
                        try {
                          await api(`/api/reminders/${row.original.id}`, { method: 'DELETE' });
                          invalidate(['/api/reminders']);
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ),
              },
            ]}
          />
        )}
      </Card>
      <NewReminder open={open} onOpenChange={setOpen} />
    </>
  );
}

function localInput(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function NewReminder({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const others = can('reminders', 'edit');
  const [v, setV] = React.useState({ title: '', message: '', remindAt: '', repeat: 'NONE' });
  const [forSelf, setForSelf] = React.useState(true);
  const [audience, setAudience] = React.useState<AudienceValue>({ roles: ['PARENT'], classIds: [] });
  const [channels, setChannels] = React.useState<string[]>(['APP']);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const t = new Date(Date.now() + 60 * 60_000);
    t.setMinutes(0, 0, 0);
    setV({ title: '', message: '', remindAt: localInput(t), repeat: 'NONE' });
    setForSelf(true);
    setChannels(['APP']);
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New reminder"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={v.title.trim().length < 2 || !v.message.trim() || !v.remindAt || !channels.length || (!forSelf && !audience.roles.length)}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/reminders', { method: 'POST', body: { ...v, remindAt: new Date(v.remindAt).toISOString(), forSelf, audience: forSelf ? undefined : audience, channels } });
                toast.success('Reminder scheduled');
                invalidate(['/api/reminders']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Schedule
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Submit board registration list" />
        </Field>
        <Field label="Message" required>
          <Textarea rows={3} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="When" required>
            <Input type="datetime-local" value={v.remindAt} onChange={(e) => setV({ ...v, remindAt: e.target.value })} />
          </Field>
          <Field label="Repeat">
            <Select value={v.repeat} onChange={(e) => setV({ ...v, repeat: e.target.value })} options={Object.entries(REPEAT).map(([value, label]) => ({ value, label }))} />
          </Field>
        </div>
        {others && (
          <Field label="Remind">
            <Segmented value={forSelf ? 'me' : 'others'} onChange={(x) => setForSelf(x === 'me')} options={[{ value: 'me', label: 'Only me' }, { value: 'others', label: 'Other people' }]} />
          </Field>
        )}
        {!forSelf && <AudiencePicker value={audience} onChange={setAudience} />}
        <Field label="Send by">
          <div className="flex flex-wrap gap-4">
            {CHANNELS.map((c) => (
              <label key={c.value} className="flex items-center gap-2 text-sm">
                <Checkbox checked={channels.includes(c.value)} onCheckedChange={(on) => setChannels((l) => (on ? [...l, c.value] : l.filter((x) => x !== c.value)))} /> {c.label}
              </label>
            ))}
          </div>
        </Field>
        <p className="text-xs text-ink-faint">SMS and email use the school’s gateways (School Settings) and appear in the SMS log.</p>
      </div>
    </Dialog>
  );
}
