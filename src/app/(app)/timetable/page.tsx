'use client';

import * as React from 'react';
import { CalendarDays, Coffee, Printer, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { allSectionOptions, findSection, useLookups } from '@/lib/lookups';
import { cn } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardHeader, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Segmented, Select } from '@/components/ui/form';
import { Dialog, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HUES = ['bg-sky-50 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200', 'bg-violet-50 text-violet-800 dark:bg-violet-500/10 dark:text-violet-200', 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200', 'bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200', 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200', 'bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200', 'bg-indigo-50 text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200', 'bg-orange-50 text-orange-900 dark:bg-orange-500/10 dark:text-orange-200'];

interface Grid {
  title: string;
  view: 'section' | 'teacher';
  sectionId: string | null;
  workingDays: number[];
  periods: Array<{ id: string; name: string; startTime: string; endTime: string; isBreak: boolean }>;
  entries: Array<{ id: string; day: number; periodId: string; subjectId: string; subject: string; subjectCode: string; employeeId: string | null; teacher: string | null; roomId: string | null; room: string | null; sectionLabel: string }>;
}

function TimetableGrid({ data, editable, onCell }: { data: Grid; editable: boolean; onCell?: (day: number, periodId: string) => void }) {
  const subjectIds = [...new Set(data.entries.map((e) => e.subjectId))];
  const color = (id: string) => HUES[subjectIds.indexOf(id) % HUES.length];
  const today = ((new Date().getDay() + 6) % 7) + 1;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="w-28 px-2 py-2 text-left text-[11px] uppercase tracking-wide text-ink-faint">Period</th>
            {data.workingDays.map((d) => (
              <th key={d} className={cn('rounded-lg px-2 py-2 text-center text-xs font-semibold', d === today ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300' : 'text-ink-soft')}>
                {DAY_NAMES[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.periods.map((p) => (
            <tr key={p.id}>
              <td className="px-2 py-1 align-top">
                <p className="text-xs font-semibold">{p.name}</p>
                <p className="text-[10px] text-ink-faint">
                  {p.startTime}–{p.endTime}
                </p>
              </td>
              {p.isBreak ? (
                <td colSpan={data.workingDays.length} className="rounded-lg bg-canvas px-2 py-1.5 text-center text-xs text-ink-faint">
                  <Coffee className="mr-1 inline size-3.5" /> {p.name}
                </td>
              ) : (
                data.workingDays.map((d) => {
                  const e = data.entries.find((x) => x.day === d && x.periodId === p.id);
                  return (
                    <td key={d} className="p-0">
                      <button
                        type="button"
                        disabled={!editable}
                        onClick={() => onCell?.(d, p.id)}
                        className={cn('flex h-16 w-full flex-col items-start justify-center rounded-lg px-2.5 text-left transition-shadow', e ? color(e.subjectId) : 'border border-dashed border-line text-ink-faint', editable && 'hover:ring-2 hover:ring-brand-400')}
                      >
                        {e ? (
                          <>
                            <span className="truncate text-xs font-semibold">{e.subject}</span>
                            <span className="truncate text-[10px] opacity-80">{data.view === 'teacher' ? e.sectionLabel : e.teacher ?? '—'}</span>
                            {e.room && <span className="truncate text-[10px] opacity-70">{e.room}</span>}
                          </>
                        ) : (
                          <span className="text-[10px]">{editable ? '+ Add' : 'Free'}</span>
                        )}
                      </button>
                    </td>
                  );
                })
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CellEditor({ sectionId, day, periodId, current, onClose, onSaved }: { sectionId: string; day: number; periodId: string; current: Grid['entries'][number] | undefined; onClose: () => void; onSaved: () => void }) {
  const { data: lk } = useLookups(['classes', 'subjects', 'classSubjects', 'teachers']);
  const { data: alloc } = useApiQuery<Array<{ subjectId: string; subjectName: string; employeeId: string | null }>>(`/api/sections/${sectionId}/teachers`);
  const { data: rooms } = useApiQuery<Array<{ id: string; name: string }>>('/api/rooms');
  const [subjectId, setSubjectId] = React.useState(current?.subjectId ?? '');
  const [employeeId, setEmployeeId] = React.useState(current?.employeeId ?? '');
  const [roomId, setRoomId] = React.useState(current?.roomId ?? '');
  const classId = findSection(lk, sectionId)?.cls.id;
  const subjects = (lk?.classSubjects ?? []).filter((c) => c.classId === classId).map((c) => ({ value: c.subjectId, label: lk?.subjects?.find((s) => s.id === c.subjectId)?.name ?? '' }));
  const save = async (clear = false) => {
    try {
      await api('/api/timetable', { method: 'PUT', body: { sectionId, day, periodId, subjectId: clear ? null : subjectId, employeeId: employeeId || null, roomId: roomId || null } });
      onSaved();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`${DAY_NAMES[day]} period`}
      size="sm"
      footer={
        <>
          {current && (
            <Button variant="danger-soft" onClick={() => save(true)}>
              Clear
            </Button>
          )}
          <Button disabled={!subjectId} onClick={() => save()}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Subject">
          <Select
            value={subjectId}
            onChange={(e) => {
              setSubjectId(e.target.value);
              const a = alloc?.find((x) => x.subjectId === e.target.value);
              if (a?.employeeId) setEmployeeId(a.employeeId);
            }}
            options={subjects}
            placeholder="Choose…"
          />
        </Field>
        <Field label="Teacher" hint="Pre-filled from the section’s teacher allocation">
          <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={(lk?.teachers ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="—" />
        </Field>
        <Field label="Room">
          <Select value={roomId} onChange={(e) => setRoomId(e.target.value)} options={(rooms ?? []).map((r) => ({ value: r.id, label: r.name }))} placeholder="Class room" />
        </Field>
      </div>
    </Dialog>
  );
}

function StaffTimetable() {
  const { can, role } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['classes', 'teachers'], { mine: role === 'TEACHER' });
  const [mode, setMode] = React.useState<'section' | 'teacher' | 'mine'>(role === 'TEACHER' ? 'mine' : 'section');
  const [sectionId, setSectionId] = React.useState('');
  const [employeeId, setEmployeeId] = React.useState('');
  const [cell, setCell] = React.useState<{ day: number; periodId: string } | null>(null);
  const sections = allSectionOptions(lk);
  React.useEffect(() => {
    if (!sectionId && sections.length) setSectionId(sections[0].value);
  }, [sections, sectionId]);
  const params = mode === 'mine' ? { mine: '1' } : mode === 'section' ? { sectionId } : { employeeId };
  const enabled = mode === 'mine' || (mode === 'section' ? !!sectionId : !!employeeId);
  const { data, isLoading, refetch } = useApiQuery<Grid>(enabled ? '/api/timetable' : null, params);
  const editable = mode === 'section' && can('timetable', 'edit');

  return (
    <>
      <Card>
        <CardHeader
          title={data?.title ? `Timetable · ${data.title}` : 'Timetable'}
          icon={CalendarDays}
          actions={
            <>
              <Segmented
                size="sm"
                value={mode}
                onChange={setMode}
                options={[...(role === 'TEACHER' ? [{ value: 'mine' as const, label: 'My timetable' }] : []), { value: 'section' as const, label: 'Class' }, ...(role !== 'TEACHER' ? [{ value: 'teacher' as const, label: 'Teacher' }] : [])]}
              />
              {mode === 'section' && <Select className="h-9 w-40" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={sections} />}
              {mode === 'teacher' && <Select className="h-9 w-48" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} options={(lk?.teachers ?? []).map((t) => ({ value: t.id, label: t.name }))} placeholder="Choose teacher…" />}
              {editable && (
                <Button
                  size="sm"
                  variant="soft"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Auto-generate this timetable?', description: 'Replaces the current week for this section using the subject-teacher allocation, avoiding teacher clashes.', confirmLabel: 'Generate', tone: 'primary' }))) return;
                    try {
                      const r = await api<{ placed: number; slots: number; unplaced: number }>('/api/timetable/auto', { method: 'POST', body: { sectionId } });
                      toast.success(`Placed ${r.placed} of ${r.slots} periods${r.unplaced ? ` · ${r.unplaced} could not be placed due to teacher clashes` : ''}`);
                      refetch();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Sparkles /> Auto-generate
                </Button>
              )}
              <Button size="sm" variant="secondary" onClick={() => window.print()}>
                <Printer /> Print
              </Button>
            </>
          }
        />
        {!enabled ? (
          <EmptyState title="Choose a class or teacher" />
        ) : isLoading || !data ? (
          <LoadingBlock />
        ) : !data.periods.length ? (
          <EmptyState title="No periods defined" description="Set up the school’s periods in the Periods tab." />
        ) : (
          <div className="p-3">
            <TimetableGrid data={data} editable={editable} onCell={(day, periodId) => setCell({ day, periodId })} />
          </div>
        )}
      </Card>
      {cell && data?.sectionId && (
        <CellEditor
          sectionId={data.sectionId}
          day={cell.day}
          periodId={cell.periodId}
          current={data.entries.find((e) => e.day === cell.day && e.periodId === cell.periodId)}
          onClose={() => setCell(null)}
          onSaved={() => invalidate(['/api/timetable', '/api/dashboard'])}
        />
      )}
    </>
  );
}

function FamilyTimetable() {
  const child = useFocusChild();
  const { data, isLoading } = useApiQuery<Grid>(child ? '/api/timetable' : null, { mine: '1', studentId: child?.id });
  return (
    <>
      <PageHeader title="Timetable" description={child ? `${child.name} · ${child.classLabel}` : ''} icon={CalendarDays} />
      <Card className="p-3">{isLoading || !data ? <LoadingBlock /> : <TimetableGrid data={data} editable={false} />}</Card>
    </>
  );
}

export default function TimetablePage() {
  const { isFamily, can } = useApp();
  const [tab, setTab] = React.useState('grid');
  if (isFamily) return <FamilyTimetable />;
  const setup = can('timetable', 'edit');
  return (
    <>
      <PageHeader title="Timetable" description="Class and teacher timetables with clash detection." icon={CalendarDays} />
      <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'grid', label: 'Timetable' }, ...(setup ? [{ value: 'periods', label: 'Periods' }, { value: 'rooms', label: 'Rooms' }] : [])]}>
        <TabPanel value="grid">
          <StaffTimetable />
        </TabPanel>
        <TabPanel value="periods">
          <ResourcePage<{ id: string; name: string; startTime: string; endTime: string; sortOrder: number; isBreak: boolean }>
            embedded
            title="Periods"
            entityLabel="Period"
            endpoint="/api/periods"
            module="timetable"
            invalidate={['/api/timetable', '/api/lookups']}
            columns={[
              { accessorKey: 'sortOrder', header: '#', size: 40 },
              { accessorKey: 'name', header: 'Name', cell: ({ row }) => <span className="font-medium">{row.original.name} {row.original.isBreak && <Badge tone="info">break</Badge>}</span> },
              { accessorKey: 'startTime', header: 'Starts' },
              { accessorKey: 'endTime', header: 'Ends' },
            ]}
            fields={[
              { name: 'name', label: 'Name', required: true, placeholder: 'Period 1' },
              { name: 'sortOrder', label: 'Order', type: 'number', required: true },
              { name: 'startTime', label: 'Start', type: 'time', required: true },
              { name: 'endTime', label: 'End', type: 'time', required: true },
              { name: 'isBreak', label: 'Break / lunch', type: 'switch' },
            ]}
            defaults={{ isBreak: false }}
          />
        </TabPanel>
        <TabPanel value="rooms">
          <ResourcePage<{ id: string; name: string; capacity: number | null }>
            embedded
            title="Rooms"
            entityLabel="Room"
            endpoint="/api/rooms"
            module="timetable"
            columns={[
              { accessorKey: 'name', header: 'Room', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
              { accessorKey: 'capacity', header: 'Capacity' },
            ]}
            fields={[
              { name: 'name', label: 'Room name', required: true, placeholder: 'Physics Lab' },
              { name: 'capacity', label: 'Capacity', type: 'number' },
            ]}
          />
        </TabPanel>
      </Tabs>
    </>
  );
}
