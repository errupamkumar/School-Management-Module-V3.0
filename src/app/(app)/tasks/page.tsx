'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle, ListTodo, MessageSquare, Plus, Send, Timer, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { cn, formatDate, formatDateTime } from '@/lib/utils';
import { ROLE_LABELS, type AppRole } from '@/lib/modules';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, EmptyState, LoadingBlock, PageHeader, StatusBadge, type Tone } from '@/components/ui/display';
import { Field, Input, Segmented, Select, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
interface Assignee {
  userId: string;
  userName: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
}
interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  dueDate: string | null;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
  createdById: string;
  createdByName: string;
  createdAt: string;
  assignees: Assignee[];
  _count?: { comments: number };
  overdue?: boolean;
  myStatus: Assignee['status'] | null;
  canManage: boolean;
}

const PRIORITY: Record<Priority, { label: string; tone: Tone }> = { LOW: { label: 'Low', tone: 'neutral' }, MEDIUM: { label: 'Medium', tone: 'info' }, HIGH: { label: 'High', tone: 'warning' }, URGENT: { label: 'Urgent', tone: 'danger' } };
const STATUS_LABEL = { OPEN: 'To do', IN_PROGRESS: 'In progress', DONE: 'Done', CANCELLED: 'Cancelled' };

export default function TasksPage() {
  return (
    <React.Suspense>
      <Tasks />
    </React.Suspense>
  );
}

function Tasks() {
  const { can } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [scope, setScope] = React.useState<'mine' | 'given' | 'all'>('mine');
  const [status, setStatus] = React.useState<'ACTIVE' | 'DONE' | 'ALL'>('ACTIVE');
  const [creating, setCreating] = React.useState(false);
  const open = params.get('task');
  const { data, isLoading } = useApiQuery<Task[]>('/api/tasks', { scope, status });
  return (
    <>
      <PageHeader
        title="Tasks"
        description="Assign work to staff with due dates, priorities, progress and comments."
        icon={ListTodo}
        actions={
          can('tasks', 'create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus /> New task
            </Button>
          )
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-3">
          <Segmented
            size="sm"
            value={scope}
            onChange={setScope}
            options={[{ value: 'mine', label: 'Assigned to me' }, ...(can('tasks', 'create') ? [{ value: 'given' as const, label: 'I assigned' }] : []), ...(can('tasks', 'edit') ? [{ value: 'all' as const, label: 'All' }] : [])]}
          />
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'ACTIVE', label: 'Open' }, { value: 'DONE', label: 'Closed' }, { value: 'ALL', label: 'All' }]} />
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={ListTodo} title="No tasks here" description={scope === 'mine' ? 'Tasks given to you will appear here.' : 'Create a task and assign it to one or more staff.'} />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => router.push(`/tasks?task=${t.id}`)} className="flex w-full flex-wrap items-center gap-3 px-5 py-3 text-left hover:bg-canvas">
                  {t.status === 'DONE' ? <CheckCircle2 className="size-5 text-emerald-500" /> : t.status === 'IN_PROGRESS' ? <Timer className="size-5 text-sky-500" /> : <Circle className="size-5 text-ink-faint" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn('font-medium', t.status === 'DONE' && 'text-ink-soft line-through', t.status === 'CANCELLED' && 'text-ink-faint line-through')}>{t.title}</p>
                    <p className="text-xs text-ink-faint">
                      {t.createdByName} → {t.assignees.map((a) => a.userName).join(', ')}
                      {!!t._count?.comments && <span> · <MessageSquare className="inline size-3" /> {t._count.comments}</span>}
                    </p>
                  </div>
                  <Badge tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>
                  {t.dueDate && <span className={cn('text-xs', t.overdue ? 'font-semibold text-rose-600' : 'text-ink-faint')}>{t.overdue ? 'Overdue · ' : 'Due '}{formatDate(t.dueDate)}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <NewTask open={creating} onOpenChange={setCreating} />
      {open && <TaskDetail id={open} onClose={() => router.push('/tasks')} />}
    </>
  );
}

function StaffChooser({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const { data: lk } = useLookups(['staffUsers']);
  const staff = (lk?.staffUsers ?? []).filter((u) => !value.includes(u.id));
  const names = new Map((lk?.staffUsers ?? []).map((u) => [u.id, u.name]));
  return (
    <div className="space-y-2">
      <Select value="" onChange={(e) => e.target.value && onChange([...value, e.target.value])} options={staff.map((u) => ({ value: u.id, label: `${u.name} · ${ROLE_LABELS[u.role as AppRole] ?? u.role}` }))} placeholder="Add a person…" />
      <div className="flex flex-wrap gap-2">
        {value.map((id) => (
          <span key={id} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            {names.get(id) ?? id}
            <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((x) => x !== id))}>
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}

function NewTask({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const invalidate = useInvalidate();
  const [v, setV] = React.useState({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
  const [people, setPeople] = React.useState<string[]>([]);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (open) {
      setV({ title: '', description: '', priority: 'MEDIUM', dueDate: '' });
      setPeople([]);
    }
  }, [open]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New task"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={v.title.trim().length < 3 || !people.length}
            onClick={async () => {
              setBusy(true);
              try {
                await api('/api/tasks', { method: 'POST', body: { ...v, description: v.description || null, dueDate: v.dueDate || null, assigneeIds: people } });
                toast.success('Task assigned');
                invalidate(['/api/tasks']);
                onOpenChange(false);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Assign task
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Task" required>
          <Input value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} placeholder="Prepare Class 10 board registration list" />
        </Field>
        <Field label="Details">
          <Textarea rows={3} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Priority">
            <Select value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })} options={Object.entries(PRIORITY).map(([value, p]) => ({ value, label: p.label }))} />
          </Field>
          <Field label="Due date">
            <Input type="date" value={v.dueDate} onChange={(e) => setV({ ...v, dueDate: e.target.value })} />
          </Field>
        </div>
        <Field label="Assign to" required>
          <StaffChooser value={people} onChange={setPeople} />
        </Field>
      </div>
    </Dialog>
  );
}

function TaskDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data } = useApiQuery<Task & { comments: Array<{ id: string; userName: string; body: string; createdAt: string }> }>(`/api/tasks/${id}`);
  const [comment, setComment] = React.useState('');
  const refresh = () => invalidate(['/api/tasks']);
  const patch = async (body: Record<string, unknown>) => {
    try {
      await api(`/api/tasks/${id}`, { method: 'PATCH', body });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={data?.title ?? 'Task'} description={data ? `From ${data.createdByName} · ${formatDateTime(data.createdAt)}` : undefined} size="lg" side>
      {!data ? (
        <LoadingBlock />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status === 'DONE' ? 'COMPLETED' : data.status === 'IN_PROGRESS' ? 'APPLIED' : data.status === 'CANCELLED' ? 'CANCELLED' : 'OPEN'} label={STATUS_LABEL[data.status]} />
            <Badge tone={PRIORITY[data.priority].tone}>{PRIORITY[data.priority].label}</Badge>
            {data.dueDate && <span className="text-xs text-ink-faint">Due {formatDate(data.dueDate)}</span>}
          </div>
          {data.description && <p className="whitespace-pre-wrap text-sm text-ink-soft">{data.description}</p>}
          {data.myStatus && data.status !== 'CANCELLED' && (
            <Field label="My progress">
              <Segmented value={data.myStatus} onChange={(s) => patch({ myStatus: s })} options={[{ value: 'OPEN', label: 'To do' }, { value: 'IN_PROGRESS', label: 'In progress' }, { value: 'DONE', label: 'Done' }]} />
            </Field>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">People</p>
            <ul className="space-y-1.5">
              {data.assignees.map((a) => (
                <li key={a.userId} className="flex items-center gap-2 text-sm">
                  <Avatar name={a.userName} size={24} />
                  <span className="flex-1">{a.userName}</span>
                  <StatusBadge status={a.status === 'DONE' ? 'COMPLETED' : a.status === 'IN_PROGRESS' ? 'APPLIED' : 'OPEN'} label={STATUS_LABEL[a.status]} />
                </li>
              ))}
            </ul>
          </div>
          {data.canManage && (
            <div className="flex flex-wrap gap-2">
              {data.status !== 'CANCELLED' ? (
                <Button size="sm" variant="secondary" onClick={() => patch({ cancel: true })}>
                  Cancel task
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => patch({ reopen: true })}>
                  Reopen
                </Button>
              )}
              <Button
                size="sm"
                variant="danger-soft"
                onClick={async () => {
                  if (!(await confirm({ title: 'Delete this task?', confirmLabel: 'Delete' }))) return;
                  await api(`/api/tasks/${id}`, { method: 'DELETE' });
                  refresh();
                  onClose();
                }}
              >
                <Trash2 /> Delete
              </Button>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium">Comments</p>
            <ul className="space-y-2">
              {data.comments.map((c) => (
                <li key={c.id} className="rounded-xl bg-canvas px-3 py-2 text-sm">
                  <p className="text-xs text-ink-faint">
                    <b className="text-ink-soft">{c.userName}</b> · {formatDateTime(c.createdAt)}
                  </p>
                  <p className="whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
              {!data.comments.length && <li className="text-xs text-ink-faint">No comments yet.</li>}
            </ul>
            <div className="mt-2 flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" aria-label="Comment" />
              <Button
                size="icon"
                aria-label="Send comment"
                disabled={!comment.trim()}
                onClick={async () => {
                  try {
                    await api(`/api/tasks/${id}`, { method: 'POST', body: { body: comment } });
                    setComment('');
                    invalidate([`/api/tasks/${id}`]);
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
              >
                <Send />
              </Button>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
