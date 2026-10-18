'use client';

import * as React from 'react';
import { CheckCheck, ClipboardList, Download, Table2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, currentPeriod, downloadCsv, formatDate, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Card, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Input } from '@/components/ui/form';
import { Tabs, TabPanel } from '@/components/ui/overlay';

type Status = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
interface Row {
  employeeId: string;
  name: string;
  code: string;
  designation: string;
  photoUrl: string | null;
  status: Status | null;
  inTime: string | null;
  outTime: string | null;
}
const BTNS: Array<{ v: Status; s: string; c: string }> = [
  { v: 'PRESENT', s: 'P', c: 'data-[on=true]:bg-emerald-600 data-[on=true]:text-white' },
  { v: 'ABSENT', s: 'A', c: 'data-[on=true]:bg-rose-600 data-[on=true]:text-white' },
  { v: 'LATE', s: 'L', c: 'data-[on=true]:bg-amber-500 data-[on=true]:text-white' },
  { v: 'HALF_DAY', s: 'H', c: 'data-[on=true]:bg-orange-400 data-[on=true]:text-white' },
  { v: 'LEAVE', s: 'LV', c: 'data-[on=true]:bg-sky-500 data-[on=true]:text-white' },
];

function MarkStaff() {
  const invalidate = useInvalidate();
  const [date, setDate] = React.useState(todayISO());
  const { data, isLoading, refetch } = useApiQuery<{ holiday: string | null; marked: boolean; roster: Row[] }>('/api/staff-attendance', { date });
  const [draft, setDraft] = React.useState<Record<string, { status: Status | null; inTime: string; outTime: string }>>({});
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) setDraft(Object.fromEntries(data.roster.map((r) => [r.employeeId, { status: r.status, inTime: r.inTime ?? '', outTime: r.outTime ?? '' }])));
  }, [data]);
  const set = (id: string, patch: Partial<{ status: Status; inTime: string; outTime: string }>) => setDraft((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  const unmarked = Object.values(draft).filter((d) => !d.status).length;

  return (
    <Card>
      <CardHeader
        title={`Staff attendance · ${formatDate(date, 'long')}`}
        description={data?.holiday ? `Holiday: ${data.holiday}` : data?.marked ? 'Already marked — you can update it.' : 'Not marked yet'}
        actions={
          <>
            <Input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} className="h-9 w-40" />
            <Button
              variant="soft"
              size="sm"
              onClick={() => {
                const now = new Date().toTimeString().slice(0, 5);
                setDraft((d) => Object.fromEntries(Object.entries(d).map(([k, v]) => [k, { ...v, status: v.status ?? 'PRESENT', inTime: v.inTime || now }])));
              }}
            >
              <CheckCheck /> All present
            </Button>
          </>
        }
      />
      {isLoading || !data ? (
        <LoadingBlock />
      ) : (
        <>
          <ul className="divide-y divide-line">
            {data.roster.map((r) => {
              const d = draft[r.employeeId] ?? { status: null, inTime: '', outTime: '' };
              return (
                <li key={r.employeeId} className="flex flex-wrap items-center gap-3 px-5 py-2.5">
                  <Avatar name={r.name} src={r.photoUrl} size={32} />
                  <div className="min-w-[10rem] flex-1">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-[11px] text-ink-faint">
                      {r.code} · {r.designation}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {BTNS.map((b) => (
                      <button key={b.v} type="button" data-on={d.status === b.v} onClick={() => set(r.employeeId, { status: b.v })} className={cn('h-9 min-w-9 rounded-lg border border-line px-2 text-xs font-bold text-ink-soft hover:bg-canvas', b.c)}>
                        {b.s}
                      </button>
                    ))}
                  </div>
                  <Input type="time" aria-label="In time" value={d.inTime} onChange={(e) => set(r.employeeId, { inTime: e.target.value })} className="h-9 w-28" />
                  <Input type="time" aria-label="Out time" value={d.outTime} onChange={(e) => set(r.employeeId, { outTime: e.target.value })} className="h-9 w-28" />
                </li>
              );
            })}
          </ul>
          <div className="flex items-center justify-between border-t border-line px-5 py-3">
            <span className="text-xs text-ink-soft">{unmarked ? `${unmarked} not marked` : 'Everyone marked'}</span>
            <Button
              loading={saving}
              onClick={async () => {
                const entries = Object.entries(draft)
                  .filter(([, v]) => v.status)
                  .map(([employeeId, v]) => ({ employeeId, status: v.status, inTime: v.inTime || null, outTime: v.outTime || null }));
                if (!entries.length) return toast.error('Mark at least one employee');
                setSaving(true);
                try {
                  await api('/api/staff-attendance', { method: 'PUT', body: { date, entries } });
                  toast.success(`Saved ${entries.length} records`);
                  invalidate(['/api/staff-attendance', '/api/dashboard']);
                  refetch();
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setSaving(false);
                }
              }}
            >
              Save
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}

function Register() {
  const [month, setMonth] = React.useState(currentPeriod());
  const { data, isLoading } = useApiQuery<{ days: Array<{ day: number; working: boolean }>; employees: Array<{ employeeId: string; name: string; code: string; designation: string; marks: Array<{ code: string; in: string | null; out: string | null } | null>; present: number; absent: number; leave: number; late: number }> }>('/api/staff-attendance', { month });
  const color: Record<string, string> = { P: 'text-emerald-600', A: 'bg-rose-100 font-bold text-rose-700 dark:bg-rose-500/20', L: 'text-amber-600', H: 'text-orange-500', LV: 'text-sky-600' };
  return (
    <Card>
      <div className="flex flex-wrap items-end gap-3 border-b border-line p-4">
        <Field label="Month" className="w-44">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </Field>
        <Button
          className="ml-auto"
          variant="secondary"
          size="sm"
          disabled={!data?.employees.length}
          onClick={() => downloadCsv(`staff-attendance-${month}`, data!.employees.map((e) => ({ Code: e.code, Name: e.name, Designation: e.designation, ...Object.fromEntries(e.marks.map((m, i) => [String(i + 1), m?.code ?? ''])), Present: e.present, Late: e.late, Leave: e.leave, Absent: e.absent })))}
        >
          <Download /> CSV
        </Button>
      </div>
      {isLoading || !data ? (
        <LoadingBlock />
      ) : data.employees.length === 0 ? (
        <EmptyState title="No records" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 bg-surface px-3 py-2 text-left">Employee</th>
                {data.days.map((d) => (
                  <th key={d.day} className={cn('w-7 px-1 py-2', !d.working && 'text-rose-400')}>
                    {d.day}
                  </th>
                ))}
                <th className="px-2">P</th>
                <th className="px-2">L</th>
                <th className="px-2">LV</th>
                <th className="px-2">A</th>
              </tr>
            </thead>
            <tbody>
              {data.employees.map((e) => (
                <tr key={e.employeeId} className="border-b border-line/60">
                  <td className="sticky left-0 whitespace-nowrap bg-surface px-3 py-1.5 font-medium">{e.name}</td>
                  {e.marks.map((m, i) => (
                    <td key={i} title={m?.in ? `In ${m.in}${m.out ? ` · Out ${m.out}` : ''}` : undefined} className={cn('px-0.5 py-1.5 text-center', m && color[m.code], !data.days[i].working && !m && 'bg-canvas')}>
                      {m?.code ?? ''}
                    </td>
                  ))}
                  <td className="px-2 text-center font-semibold">{e.present}</td>
                  <td className="px-2 text-center">{e.late}</td>
                  <td className="px-2 text-center">{e.leave}</td>
                  <td className="px-2 text-center">{e.absent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function StaffAttendancePage() {
  const { can } = useApp();
  const admin = can('staff_attendance', 'create');
  const [tab, setTab] = React.useState(admin ? 'mark' : 'register');
  return (
    <>
      <PageHeader title={admin ? 'Staff attendance' : 'My attendance'} description={admin ? 'Daily attendance with in/out times and monthly register.' : 'Your attendance record.'} icon={ClipboardList} />
      {admin ? (
        <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'mark', label: 'Mark today' }, { value: 'register', label: <><Table2 className="size-4" /> Monthly register</> }]}>
          <TabPanel value="mark">
            <MarkStaff />
          </TabPanel>
          <TabPanel value="register">
            <Register />
          </TabPanel>
        </Tabs>
      ) : (
        <Register />
      )}
    </>
  );
}
