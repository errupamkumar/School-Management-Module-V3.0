'use client';

import * as React from 'react';
import { CalendarCheck, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { FormDialog } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui/display';
import { useConfirm } from '@/components/ui/overlay';

interface Ev {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
}

const KIND_CLS: Record<string, string> = {
  HOLIDAY: 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-200',
  PTM: 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200',
  EXAM: 'bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200',
  EVENT: 'bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-200',
  ACTIVITY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200',
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

export default function CalendarPage() {
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const [month, setMonth] = React.useState(() => {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), 1));
  });
  const [open, setOpen] = React.useState<string | null>(null);
  const first = month;
  const last = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 0));
  const { data } = useApiQuery<Ev[]>('/api/events', { from: iso(first), to: iso(last) });
  const lead = (first.getUTCDay() + 6) % 7;
  const days = Array.from({ length: last.getUTCDate() }, (_, i) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), i + 1)));
  const on = (d: Date) => (data ?? []).filter((e) => e.startDate.slice(0, 10) <= iso(d) && (e.endDate ?? e.startDate).slice(0, 10) >= iso(d));
  const today = iso(new Date());

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Holidays, events, exams and parent–teacher meetings."
        icon={CalendarCheck}
        actions={
          can('events', 'create') && (
            <Button onClick={() => setOpen(iso(new Date()))}>
              <Plus /> Add event
            </Button>
          )
        }
      />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <Card>
          <CardHeader
            title={month.toLocaleString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
            actions={
              <>
                <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() - 1, 1)))}>
                  <ChevronLeft />
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setMonth(new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), 1)))}>
                  Today
                </Button>
                <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth(new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)))}>
                  <ChevronRight />
                </Button>
              </>
            }
          />
          <div className="grid grid-cols-7 border-b border-line text-center text-[11px] font-semibold uppercase text-ink-faint">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {Array.from({ length: lead }).map((_, i) => (
              <div key={`b${i}`} className="min-h-24 border-b border-r border-line/60 bg-canvas/40" />
            ))}
            {days.map((d) => {
              const evs = on(d);
              const sunday = d.getUTCDay() === 0;
              return (
                <button
                  key={iso(d)}
                  type="button"
                  disabled={!can('events', 'create')}
                  onClick={() => setOpen(iso(d))}
                  className={cn('min-h-24 border-b border-r border-line/60 p-1.5 text-left align-top transition-colors hover:bg-canvas/70 disabled:cursor-default', sunday && 'bg-rose-50/40 dark:bg-rose-500/5')}
                >
                  <span className={cn('inline-flex size-6 items-center justify-center rounded-full text-xs font-semibold', iso(d) === today ? 'bg-brand-600 text-white' : sunday ? 'text-rose-500' : 'text-ink-soft')}>{d.getUTCDate()}</span>
                  <div className="mt-1 space-y-1">
                    {evs.slice(0, 3).map((e) => (
                      <p key={e.id} className={cn('truncate rounded px-1.5 py-0.5 text-[10px] font-medium', KIND_CLS[e.kind])}>
                        {e.title}
                      </p>
                    ))}
                    {evs.length > 3 && <p className="text-[10px] text-ink-faint">+{evs.length - 3} more</p>}
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="This month" />
          {!data?.length ? (
            <EmptyState title="Nothing scheduled" />
          ) : (
            <ul className="divide-y divide-line">
              {data.map((e) => (
                <li key={e.id} className="flex items-start gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{e.title}</p>
                    <p className="text-xs text-ink-faint">
                      {formatDate(e.startDate)}
                      {e.endDate && e.endDate !== e.startDate ? ` – ${formatDate(e.endDate)}` : ''}
                      {e.location ? ` · ${e.location}` : ''}
                    </p>
                    <Badge className={cn('mt-1', KIND_CLS[e.kind])}>{e.kind.toLowerCase()}</Badge>
                  </div>
                  {can('events', 'delete') && (
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Delete event"
                      onClick={async () => {
                        if (!(await confirm({ title: `Delete ${e.title}?`, confirmLabel: 'Delete' }))) return;
                        await api(`/api/events/${e.id}`, { method: 'DELETE' });
                        invalidate(['/api/events', '/api/dashboard']);
                      }}
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      <FormDialog
        open={!!open}
        onOpenChange={(o) => !o && setOpen(null)}
        title="Add to calendar"
        fields={[
          { name: 'title', label: 'Title', required: true, span: 2 },
          { name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'EVENT', label: 'Event' }, { value: 'HOLIDAY', label: 'Holiday' }, { value: 'PTM', label: 'Parent–teacher meeting' }, { value: 'EXAM', label: 'Exam' }, { value: 'ACTIVITY', label: 'Activity' }] },
          { name: 'location', label: 'Location' },
          { name: 'startDate', label: 'From', type: 'date', required: true },
          { name: 'endDate', label: 'To', type: 'date' },
          { name: 'description', label: 'Details', type: 'textarea' },
        ]}
        initial={{ kind: 'EVENT', startDate: open ?? '' }}
        onSubmit={async (v) => {
          await api('/api/events', { method: 'POST', body: v });
          toast.success('Added to calendar');
          invalidate(['/api/events', '/api/dashboard']);
        }}
      />
    </>
  );
}
