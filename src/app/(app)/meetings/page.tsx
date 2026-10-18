'use client';

import * as React from 'react';
import { CalendarClock, Check, Plus, Users, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, EmptyState, LoadingBlock, PageHeader, StatusBadge } from '@/components/ui/display';
import { Segmented } from '@/components/ui/form';
import { usePrompt } from '@/components/ui/overlay';

interface Meeting {
  id: string;
  topic: string;
  agenda: string | null;
  mode: string;
  scheduledAt: string;
  durationMins: number;
  status: string;
  meetingUrl: string | null;
  outcome: string | null;
  requestedByName: string;
  withUserName: string;
  student: string | null;
  mine: boolean;
  iAmHost: boolean;
}

export default function MeetingsPage() {
  const { can, me } = useApp();
  const child = useFocusChild();
  const prompt = usePrompt();
  const invalidate = useInvalidate();
  const [filter, setFilter] = React.useState<'upcoming' | 'past'>('upcoming');
  const { data, isLoading } = useApiQuery<Meeting[]>('/api/meetings');
  const { data: contacts } = useApiQuery<Array<{ id: string; name: string; role: string; detail: string }>>(can('meetings', 'create') ? '/api/messages/contacts' : null);
  const [open, setOpen] = React.useState(false);
  const now = Date.now();
  const rows = (data ?? []).filter((m) => (filter === 'upcoming' ? new Date(m.scheduledAt).getTime() >= now - 3600_000 && !['CANCELLED', 'DECLINED', 'COMPLETED'].includes(m.status) : new Date(m.scheduledAt).getTime() < now - 3600_000 || ['CANCELLED', 'DECLINED', 'COMPLETED'].includes(m.status)));
  const update = async (id: string, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/api/meetings/${id}`, { method: 'PATCH', body });
      toast.success(msg);
      invalidate(['/api/meetings']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const hostOptions = (contacts ?? []).filter((c) => me.user.role !== 'PARENT' || !['PARENT', 'STUDENT'].includes(c.role)).map((c) => ({ value: c.id, label: `${c.name} — ${c.detail}` }));

  return (
    <>
      <PageHeader
        title={me.user.role === 'PARENT' ? 'Meet a teacher' : 'Parent meetings'}
        description="Book 1:1 parent–teacher or principal meetings without phone calls."
        icon={Users}
        actions={
          <>
            <Segmented value={filter} onChange={setFilter} options={[{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }]} />
            {can('meetings', 'create') && (
              <Button onClick={() => setOpen(true)}>
                <Plus /> Request meeting
              </Button>
            )}
          </>
        }
      />
      {isLoading ? (
        <LoadingBlock />
      ) : !rows.length ? (
        <Card>
          <EmptyState icon={CalendarClock} title={filter === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((m) => (
            <Card key={m.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{m.topic}</p>
                  <p className="text-xs text-ink-faint">
                    {formatDateTime(m.scheduledAt)} · {m.durationMins} min · {m.mode.replace('_', ' ').toLowerCase()}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
              <p className="mt-3 text-sm">
                {m.mine ? (
                  <>
                    With <b>{m.withUserName}</b>
                  </>
                ) : (
                  <>
                    Requested by <b>{m.requestedByName}</b>
                  </>
                )}
                {m.student && <span className="text-ink-soft"> · about {m.student}</span>}
              </p>
              {m.agenda && <p className="mt-1 text-sm text-ink-soft">{m.agenda}</p>}
              {m.outcome && <p className="mt-2 rounded-lg bg-canvas px-3 py-2 text-xs">Outcome: {m.outcome}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {m.meetingUrl && m.status === 'CONFIRMED' && (
                  <Button asChild size="sm" variant="soft">
                    <a href={m.meetingUrl} target="_blank" rel="noopener noreferrer">
                      <Video /> Join
                    </a>
                  </Button>
                )}
                {m.iAmHost && m.status === 'REQUESTED' && (
                  <>
                    <Button size="sm" onClick={() => update(m.id, { status: 'CONFIRMED' }, 'Confirmed')}>
                      <Check /> Confirm
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => update(m.id, { status: 'DECLINED' }, 'Declined')}>
                      Decline
                    </Button>
                  </>
                )}
                {m.iAmHost && m.status === 'CONFIRMED' && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={async () => {
                      const outcome = await prompt({ title: 'Mark meeting as completed', label: 'Notes / outcome', placeholder: 'Discussed progress; agreed on daily reading practice', tone: 'primary', confirmLabel: 'Complete' });
                      if (outcome) update(m.id, { status: 'COMPLETED', outcome }, 'Completed');
                    }}
                  >
                    Complete
                  </Button>
                )}
                {m.mine && ['REQUESTED', 'CONFIRMED'].includes(m.status) && (
                  <Button size="sm" variant="ghost" onClick={() => update(m.id, { status: 'CANCELLED' }, 'Cancelled')}>
                    <X /> Cancel
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title="Request a meeting"
        fields={[
          { name: 'withUserId', label: 'With', type: 'select', required: true, options: hostOptions, span: 2 },
          { name: 'topic', label: 'Topic', required: true, span: 2, placeholder: 'Academic progress in Mathematics' },
          { name: 'mode', label: 'Mode', type: 'select', options: [{ value: 'IN_PERSON', label: 'In person' }, { value: 'VIDEO', label: 'Video call' }, { value: 'PHONE', label: 'Phone call' }] },
          { name: 'durationMins', label: 'Duration (min)', type: 'number' },
          { name: 'scheduledAt', label: 'Preferred time', type: 'datetime-local', required: true },
          { name: 'agenda', label: 'Agenda', type: 'textarea' },
        ]}
        initial={{ mode: 'IN_PERSON', durationMins: 15 }}
        onSubmit={async (v) => {
          await api('/api/meetings', { method: 'POST', body: { ...v, studentId: me.user.role === 'PARENT' ? child?.id : null, scheduledAt: new Date(v.scheduledAt).toISOString() } });
          toast.success('Request sent');
          invalidate(['/api/meetings']);
        }}
      />
      {filter === 'upcoming' && rows.length > 0 && <p className="mt-4 text-xs text-ink-faint"><Badge>Tip</Badge> Hosts can add a video link after confirming by rescheduling from the meeting card.</p>}
    </>
  );
}
