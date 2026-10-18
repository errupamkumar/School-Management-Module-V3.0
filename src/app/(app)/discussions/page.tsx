'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock, MessageSquare, Pin, Plus, Send, Trash2, Unlock } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/utils';
import { ROLE_LABELS, type AppRole } from '@/lib/modules';
import { useApp } from '@/components/shell/app-context';
import { AudiencePicker, audienceLabel, type AudienceValue } from '@/components/audience-picker';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardBody, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Field, Input, Switch, Textarea } from '@/components/ui/form';
import { Dialog, useConfirm } from '@/components/ui/overlay';

interface Topic {
  id: string;
  title: string;
  body: string;
  audience: AudienceValue;
  pinned: boolean;
  locked: boolean;
  authorId: string;
  authorName: string;
  authorRole: AppRole;
  postCount: number;
  lastPostAt: string;
  createdAt: string;
}
interface Post {
  id: string;
  body?: string;
  authorId?: string;
  authorName: string;
  authorRole?: AppRole;
  createdAt: string;
  removed: boolean;
  mine?: boolean;
}

export default function DiscussionsPage() {
  return (
    <React.Suspense>
      <Discussions />
    </React.Suspense>
  );
}

function Discussions() {
  const params = useSearchParams();
  const topicId = params.get('topic');
  return topicId ? <Thread id={topicId} /> : <TopicList />;
}

function TopicList() {
  const { can } = useApp();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const { data, isLoading } = useApiQuery<Topic[]>('/api/discussions');
  const rows = (data ?? []).filter((t) => !search || `${t.title} ${t.body}`.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <PageHeader
        title="Discussions"
        description="Moderated forums for staff, classes and parents."
        icon={MessageSquare}
        actions={
          can('discussion', 'create') && (
            <Button onClick={() => setOpen(true)}>
              <Plus /> New discussion
            </Button>
          )
        }
      />
      <Card>
        <div className="border-b border-line p-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search discussions…" className="h-9 sm:max-w-xs" />
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !rows.length ? (
          <EmptyState icon={MessageSquare} title="No discussions yet" description="Start one for your class, department or the whole staff." />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map((t) => (
              <li key={t.id}>
                <button type="button" onClick={() => router.push(`/discussions?topic=${t.id}`)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-canvas">
                  <Avatar name={t.authorName} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">
                      {t.pinned && <Pin className="size-3.5 text-brand-600" aria-label="Pinned" />}
                      {t.title}
                      {t.locked && <Badge>Locked</Badge>}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-ink-soft">{t.body}</p>
                    <p className="mt-1 text-xs text-ink-faint">
                      {t.authorName} · {ROLE_LABELS[t.authorRole] ?? t.authorRole} · {audienceLabel(t.audience)}
                    </p>
                  </div>
                  <div className="text-right text-xs text-ink-faint">
                    <p className="text-sm font-semibold text-ink">{t.postCount}</p>
                    <p>replies</p>
                    <p className="mt-1">{formatDateTime(t.lastPostAt)}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <NewTopicDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

function NewTopicDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { isFamily, can, role, me } = useApp();
  const invalidate = useInvalidate();
  const router = useRouter();
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [audience, setAudience] = React.useState<AudienceValue>({ roles: ['TEACHER'], classIds: [] });
  const [notify, setNotify] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    setTitle('');
    setBody('');
    setNotify(false);
    setAudience(isFamily ? { roles: [role, 'TEACHER'], classIds: [...new Set(me.children.map((c) => c.classId))] } : { roles: ['TEACHER'], classIds: [] });
  }, [open, isFamily, role, me.children]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New discussion"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={busy}
            disabled={title.trim().length < 3 || !body.trim() || !audience.roles.length}
            onClick={async () => {
              setBusy(true);
              try {
                const t = await api<{ id: string }>('/api/discussions', { method: 'POST', body: { title, body, audience, notify } });
                invalidate(['/api/discussions']);
                onOpenChange(false);
                router.push(`/discussions?topic=${t.id}`);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            Start discussion
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Message" required>
          <Textarea rows={5} value={body} onChange={(e) => setBody(e.target.value)} />
        </Field>
        <Field label="Who can see and reply" hint={isFamily ? 'Family discussions stay within your child’s class, with teachers.' : undefined}>
          <AudiencePicker value={audience} onChange={setAudience} roles={isFamily ? ['PARENT', 'STUDENT', 'TEACHER'] : undefined} />
        </Field>
        {can('discussion', 'edit') && (
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={notify} onCheckedChange={setNotify} /> Notify everyone in the audience
          </label>
        )}
      </div>
    </Dialog>
  );
}

function Thread({ id }: { id: string }) {
  const router = useRouter();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data, isLoading, error } = useApiQuery<Topic & { posts: Post[]; canModerate: boolean; canReply: boolean }>(`/api/discussions/${id}`);
  const [reply, setReply] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const refresh = () => invalidate([`/api/discussions/${id}`, '/api/discussions']);
  const patch = async (body: Record<string, unknown>) => {
    try {
      await api(`/api/discussions/${id}`, { method: 'PATCH', body });
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  if (isLoading) return <LoadingBlock />;
  if (!data) return <Card><EmptyState icon={MessageSquare} title="Discussion not found" description={error?.message} action={<Button variant="secondary" onClick={() => router.push('/discussions')}>Back</Button>} /></Card>;
  return (
    <>
      <PageHeader
        title={data.title}
        description={`${data.authorName} · ${formatDateTime(data.createdAt)} · ${audienceLabel(data.audience)}`}
        icon={MessageSquare}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => router.push('/discussions')}>
              <ArrowLeft /> All discussions
            </Button>
            {data.canModerate && (
              <>
                <Button variant="secondary" onClick={() => patch({ pinned: !data.pinned })}>
                  <Pin /> {data.pinned ? 'Unpin' : 'Pin'}
                </Button>
                <Button variant="secondary" onClick={() => patch({ locked: !data.locked })}>
                  {data.locked ? <><Unlock /> Unlock</> : <><Lock /> Lock</>}
                </Button>
                <Button
                  variant="danger-soft"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Delete this discussion?', description: 'All replies are removed.', confirmLabel: 'Delete' }))) return;
                    try {
                      await api(`/api/discussions/${id}`, { method: 'DELETE' });
                      invalidate(['/api/discussions']);
                      router.push('/discussions');
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  <Trash2 /> Delete
                </Button>
              </>
            )}
          </div>
        }
      />
      <div className="mx-auto max-w-3xl space-y-3">
        <Card>
          <CardBody>
            <p className="whitespace-pre-wrap text-sm">{data.body}</p>
          </CardBody>
        </Card>
        {data.posts.map((p) => (
          <div key={p.id} className={cn('flex gap-3', p.mine && 'flex-row-reverse')}>
            <Avatar name={p.authorName} size={32} />
            <div className={cn('max-w-[85%] rounded-2xl border border-line px-4 py-2.5', p.mine ? 'bg-brand-50 dark:bg-brand-500/10' : 'bg-surface')}>
              <p className="text-xs text-ink-faint">
                <b className="text-ink-soft">{p.authorName}</b> {p.authorRole && `· ${ROLE_LABELS[p.authorRole] ?? p.authorRole}`} · {formatDateTime(p.createdAt)}
              </p>
              {p.removed ? <p className="text-sm italic text-ink-faint">Reply removed</p> : <p className="mt-0.5 whitespace-pre-wrap text-sm">{p.body}</p>}
              {!p.removed && (p.mine || data.canModerate) && (
                <button
                  type="button"
                  className="mt-1 text-xs text-rose-600 hover:underline"
                  onClick={async () => {
                    if (!(await confirm({ title: 'Remove this reply?', confirmLabel: 'Remove' }))) return;
                    try {
                      await api(`/api/discussions/${id}/posts`, { method: 'DELETE', params: { postId: p.id } });
                      refresh();
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        {data.canReply ? (
          <Card>
            <CardBody className="flex items-end gap-2">
              <Textarea rows={2} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Write a reply…" className="flex-1" aria-label="Reply" />
              <Button
                loading={busy}
                disabled={!reply.trim()}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await api(`/api/discussions/${id}/posts`, { method: 'POST', body: { body: reply } });
                    setReply('');
                    refresh();
                  } catch (e) {
                    toast.error((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Send /> Reply
              </Button>
            </CardBody>
          </Card>
        ) : (
          <p className="text-center text-sm text-ink-faint">{data.locked ? 'This discussion is locked.' : 'You can read this discussion.'}</p>
        )}
      </div>
    </>
  );
}
