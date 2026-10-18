'use client';

import * as React from 'react';
import { Award, CalendarClock, Dumbbell, FlaskConical, HeartHandshake, MoreVertical, Palette, Pencil, Plus, Trash2, Trophy, UserMinus, UserPlus, Users2 } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { cn } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { FormDialog, type FieldDef } from '@/components/resource';
import { StudentPicker, type PickedStudent } from '@/components/student-picker';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, EmptyState, LoadingBlock, PageHeader, Progress } from '@/components/ui/display';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, useConfirm, usePrompt } from '@/components/ui/overlay';

interface Activity {
  id: string;
  name: string;
  category: 'SPORTS' | 'ARTS' | 'CLUB' | 'STEM' | 'COMMUNITY';
  description: string | null;
  inchargeId: string | null;
  incharge: string | null;
  schedule: string | null;
  capacity: number | null;
  isActive: boolean;
  enrolled: number;
  waitlisted: number;
  canManage: boolean;
  mine: Array<{ activityId: string; studentId: string; status: string; achievement: string | null }>;
}
interface Member {
  id: string;
  studentId: string;
  status: 'ENROLLED' | 'WAITLISTED';
  achievement: string | null;
  name: string;
  admissionNo: string;
  classLabel: string;
  photoUrl: string | null;
}

const CATEGORY: Record<Activity['category'], { label: string; icon: LucideIcon; tone: string }> = {
  SPORTS: { label: 'Sports', icon: Dumbbell, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  ARTS: { label: 'Arts', icon: Palette, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
  CLUB: { label: 'Club', icon: Users2, tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
  STEM: { label: 'STEM', icon: FlaskConical, tone: 'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300' },
  COMMUNITY: { label: 'Community', icon: HeartHandshake, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
};

function MembersSheet({ activity, onClose }: { activity: Activity | null; onClose: () => void }) {
  const invalidate = useInvalidate();
  const prompt = usePrompt();
  const { data, isLoading } = useApiQuery<Member[]>(activity ? `/api/activities/${activity.id}/members` : null);
  const [student, setStudent] = React.useState<PickedStudent | null>(null);
  const refresh = () => invalidate(['/api/activities']);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (!activity) return null;
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} side title={activity.name} description={`${activity.enrolled}${activity.capacity ? ` / ${activity.capacity}` : ''} enrolled${activity.waitlisted ? ` · ${activity.waitlisted} waiting` : ''}`}>
      {activity.canManage && (
        <div className="mb-4 flex gap-2">
          <StudentPicker value={student} onChange={setStudent} className="flex-1" />
          <Button disabled={!student} onClick={() => act(() => api(`/api/activities/${activity.id}/members`, { method: 'POST', body: { studentId: student!.id } }), 'Added').then(() => setStudent(null))}>
            <UserPlus /> Add
          </Button>
        </div>
      )}
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.length ? (
        <EmptyState icon={Users2} title="No members yet" />
      ) : (
        <ul className="divide-y divide-line">
          {data.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5">
              <Avatar name={m.name} src={m.photoUrl} size={34} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {m.name} {m.status === 'WAITLISTED' && <Badge tone="warning">waitlist</Badge>}
                </p>
                <p className="truncate text-xs text-ink-faint">
                  {m.classLabel} · {m.admissionNo}
                </p>
                {m.achievement && (
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <Trophy className="size-3" /> {m.achievement}
                  </p>
                )}
              </div>
              {activity.canManage && (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Record achievement"
                    onClick={async () => {
                      const text = await prompt({ title: `Achievement for ${m.name}`, label: 'Achievement', placeholder: 'Gold medal, inter-school chess, Dec 2026', tone: 'primary', confirmLabel: 'Save' });
                      if (text) act(() => api(`/api/activities/${activity.id}/members`, { method: 'PATCH', body: { memberId: m.id, achievement: text } }), 'Achievement saved — family notified');
                    }}
                  >
                    <Award />
                  </Button>
                  <Button size="sm" variant="ghost" title="Remove" onClick={() => act(() => api(`/api/activities/${activity.id}/members?memberId=${m.id}`, { method: 'DELETE' }), 'Removed')}>
                    <UserMinus />
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}

function ActivityCard({ a, onOpen, onEdit, onDelete, family }: { a: Activity; onOpen: () => void; onEdit: () => void; onDelete: () => void; family: { role: string; childId: string | null; onJoin: () => void; onLeave: () => void } | null }) {
  const cat = CATEGORY[a.category] ?? CATEGORY.CLUB;
  const mine = family ? a.mine.find((m) => !family.childId || m.studentId === family.childId) : null;
  const full = a.capacity != null && a.enrolled >= a.capacity;
  return (
    <Card className={cn('flex flex-col', !a.isActive && 'opacity-60')}>
      <div className="flex items-start gap-3 p-5">
        <span className={cn('flex size-11 shrink-0 items-center justify-center rounded-xl', cat.tone)}>
          <cat.icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{a.name}</p>
          <p className="text-xs text-ink-faint">
            {cat.label}
            {a.incharge ? ` · ${a.incharge}` : ''}
            {!a.isActive && ' · paused'}
          </p>
        </div>
        {a.canManage && (
          <Menu>
            <MenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Actions">
                <MoreVertical />
              </Button>
            </MenuTrigger>
            <MenuContent>
              <MenuItem onSelect={onEdit}>
                <Pencil /> Edit
              </MenuItem>
              <MenuItem danger onSelect={onDelete}>
                <Trash2 /> Delete
              </MenuItem>
            </MenuContent>
          </Menu>
        )}
      </div>
      {a.description && <p className="line-clamp-2 px-5 text-sm text-ink-soft">{a.description}</p>}
      <div className="mt-auto space-y-3 p-5">
        {a.schedule && (
          <p className="flex items-center gap-1.5 text-xs text-ink-soft">
            <CalendarClock className="size-3.5" /> {a.schedule}
          </p>
        )}
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span>
              {a.enrolled}
              {a.capacity ? ` / ${a.capacity}` : ''} members
            </span>
            {a.waitlisted > 0 && <span className="text-amber-700 dark:text-amber-300">{a.waitlisted} waiting</span>}
          </div>
          {a.capacity ? <Progress value={Math.min(100, (a.enrolled / a.capacity) * 100)} tone={full ? 'warning' : 'brand'} /> : null}
        </div>
        {family ? (
          mine ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <Badge tone={mine.status === 'ENROLLED' ? 'success' : 'warning'}>{mine.status === 'ENROLLED' ? 'Enrolled' : 'On waitlist'}</Badge>
                {mine.achievement && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                    <Trophy className="size-3" /> {mine.achievement}
                  </p>
                )}
              </div>
              {family.role === 'STUDENT' && (
                <Button size="sm" variant="ghost" onClick={family.onLeave}>
                  Leave
                </Button>
              )}
            </div>
          ) : family.role === 'STUDENT' ? (
            <Button size="sm" className="w-full" onClick={family.onJoin}>
              <UserPlus /> {full ? 'Join waitlist' : 'Join'}
            </Button>
          ) : null
        ) : (
          <Button size="sm" variant="secondary" className="w-full" onClick={onOpen}>
            <Users2 /> Members
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function ActivitiesPage() {
  const { can, isFamily, role } = useApp();
  const child = useFocusChild();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading } = useApiQuery<Activity[]>('/api/activities');
  const { data: lk } = useLookups(isFamily ? [] : ['employees']);
  const [editing, setEditing] = React.useState<Activity | 'new' | null>(null);
  const [open, setOpen] = React.useState<string | null>(null);
  const [cat, setCat] = React.useState<string>('ALL');
  const rows = (data ?? []).filter((a) => cat === 'ALL' || a.category === cat);
  const schoolWide = role !== 'TEACHER';

  const fields: FieldDef[] = [
    { name: 'name', label: 'Name', required: true },
    { name: 'category', label: 'Category', type: 'select', required: true, options: Object.entries(CATEGORY).map(([value, c]) => ({ value, label: c.label })) },
    ...(schoolWide ? [{ name: 'inchargeId', label: 'Teacher in charge', type: 'select' as const, options: (lk?.employees ?? []).map((e) => ({ value: e.id, label: `${e.name} (${e.designation})` })) }] : []),
    { name: 'schedule', label: 'Schedule', placeholder: 'Wed & Fri, 2:30–3:30 PM' },
    { name: 'capacity', label: 'Seats', type: 'number', hint: 'Leave empty for no limit. Extra sign-ups join a waitlist.' },
    { name: 'isActive', label: 'Taking members', type: 'switch' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ];

  const join = (a: Activity) => async () => {
    try {
      const m = await api<{ status: string }>(`/api/activities/${a.id}/members`, { method: 'POST', body: {} });
      toast.success(m.status === 'WAITLISTED' ? "You're on the waitlist — we'll notify you when a seat opens" : `Welcome to ${a.name}!`);
      invalidate(['/api/activities']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const leave = (a: Activity) => async () => {
    if (!(await confirm({ title: `Leave ${a.name}?`, confirmLabel: 'Leave', tone: 'danger' }))) return;
    try {
      await api(`/api/activities/${a.id}/members`, { method: 'DELETE' });
      toast.success('You left the activity');
      invalidate(['/api/activities']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Clubs & activities"
        description={isFamily ? (role === 'STUDENT' ? 'Join a club, sport or art group.' : `Activities ${child?.name ?? 'your child'} takes part in.`) : 'Co-curricular clubs, sports and arts with seats, waitlists and achievements.'}
        icon={Trophy}
        actions={
          !isFamily && can('activities', 'create') ? (
            <Button onClick={() => setEditing('new')}>
              <Plus /> New activity
            </Button>
          ) : undefined
        }
      />
      <div className="mb-4 flex flex-wrap gap-1.5">
        {['ALL', ...Object.keys(CATEGORY)].map((c) => (
          <button key={c} type="button" onClick={() => setCat(c)} className={cn('rounded-full border px-3 py-1 text-sm', cat === c ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'border-line text-ink-soft hover:bg-canvas')}>
            {c === 'ALL' ? 'All' : CATEGORY[c as Activity['category']].label}
          </button>
        ))}
      </div>
      {isLoading ? (
        <LoadingBlock />
      ) : !rows.length ? (
        <EmptyState icon={Trophy} title="No activities yet" description={isFamily ? 'The school has not listed any activities.' : 'Create clubs like Robotics, Eco Club, Chess or Football.'} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((a) => (
            <ActivityCard
              key={a.id}
              a={a}
              onOpen={() => setOpen(a.id)}
              onEdit={() => setEditing(a)}
              onDelete={async () => {
                if (!(await confirm({ title: `Delete ${a.name}?`, description: `${a.enrolled} members and their achievements will be removed.`, tone: 'danger', confirmLabel: 'Delete' }))) return;
                try {
                  await api(`/api/activities/${a.id}`, { method: 'DELETE' });
                  toast.success('Deleted');
                  invalidate(['/api/activities']);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              family={isFamily ? { role, childId: role === 'PARENT' ? child?.id ?? null : null, onJoin: join(a), onLeave: leave(a) } : null}
            />
          ))}
        </div>
      )}
      <MembersSheet activity={(data ?? []).find((a) => a.id === open) ?? null} onClose={() => setOpen(null)} />
      {editing && (
        <FormDialog
          open
          onOpenChange={(o) => !o && setEditing(null)}
          title={editing === 'new' ? 'New activity' : `Edit ${editing.name}`}
          fields={fields}
          editing={editing !== 'new'}
          initial={editing === 'new' ? { category: 'CLUB', isActive: true } : { ...editing, capacity: editing.capacity ?? '' }}
          onSubmit={async (v) => {
            const payload = { name: v.name, category: v.category, description: v.description || null, schedule: v.schedule || null, capacity: v.capacity === '' || v.capacity == null ? null : Number(v.capacity), isActive: v.isActive !== false, ...(schoolWide ? { inchargeId: v.inchargeId || null } : {}) };
            await api(editing === 'new' ? '/api/activities' : `/api/activities/${editing.id}`, { method: editing === 'new' ? 'POST' : 'PUT', body: payload });
            toast.success('Saved');
            invalidate(['/api/activities']);
          }}
        />
      )}
    </>
  );
}
