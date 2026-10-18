'use client';

import * as React from 'react';
import { ArrowLeft, MessagesSquare, PenSquare, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDateTime } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Card, EmptyState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Input, Textarea } from '@/components/ui/form';
import { Dialog } from '@/components/ui/overlay';

interface Conv {
  id: string;
  lastAt: string;
  other: { id: string; name: string; roleLabel: string; avatarUrl: string | null } | null;
  last: { body: string; mine: boolean; createdAt: string } | null;
  unread: number;
}
interface Thread {
  other: { id: string; name: string; roleLabel: string; avatarUrl: string | null } | null;
  messages: Array<{ id: string; body: string; mine: boolean; createdAt: string; readAt: string | null }>;
}

function NewChat({ open, onOpenChange, onStarted }: { open: boolean; onOpenChange: (o: boolean) => void; onStarted: (id: string) => void }) {
  const [search, setSearch] = React.useState('');
  const [to, setTo] = React.useState<{ id: string; name: string } | null>(null);
  const [body, setBody] = React.useState('');
  const { data } = useApiQuery<Array<{ id: string; name: string; role: string; detail: string; avatarUrl: string | null }>>(open ? '/api/messages/contacts' : null, { search: search || undefined });
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New message"
      description="You can message your children’s teachers and the school office. Teachers can message their students’ parents."
      footer={
        <Button
          disabled={!to || !body.trim()}
          onClick={async () => {
            try {
              const r = await api<{ conversationId: string }>('/api/messages', { method: 'POST', body: { toUserId: to!.id, body } });
              onStarted(r.conversationId);
              onOpenChange(false);
              setBody('');
              setTo(null);
            } catch (e) {
              toast.error((e as Error).message);
            }
          }}
        >
          <Send /> Send
        </Button>
      }
    >
      {to ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-sm">
            <span>
              To: <b>{to.name}</b>
            </span>
            <button className="text-xs text-brand-600" onClick={() => setTo(null)}>
              Change
            </button>
          </div>
          <Textarea autoFocus rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message…" />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
            <Input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search people…" className="pl-9" />
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {data?.map((u) => (
              <li key={u.id}>
                <button className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-canvas" onClick={() => setTo(u)}>
                  <Avatar name={u.name} src={u.avatarUrl} size={32} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{u.name}</p>
                    <p className="truncate text-xs text-ink-faint">{u.detail}</p>
                  </div>
                </button>
              </li>
            ))}
            {data && !data.length && <li className="px-3 py-6 text-center text-sm text-ink-soft">No one found</li>}
          </ul>
        </div>
      )}
    </Dialog>
  );
}

export default function MessagesPage() {
  const { can } = useApp();
  const invalidate = useInvalidate();
  const [active, setActive] = React.useState<string | null>(null);
  const [newOpen, setNewOpen] = React.useState(false);
  const [text, setText] = React.useState('');
  const { data: convs, isLoading } = useApiQuery<Conv[]>('/api/messages', undefined, { refetchInterval: 20_000 });
  const { data: thread, refetch } = useApiQuery<Thread>(active ? `/api/messages/${active}` : null, undefined, { refetchInterval: 10_000 });
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const c = new URLSearchParams(window.location.search).get('c');
    if (c) setActive(c);
  }, []);
  React.useEffect(() => endRef.current?.scrollIntoView({ block: 'end' }), [thread?.messages.length]);
  React.useEffect(() => {
    if (thread) invalidate(['/api/notifications']);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.messages.length]);

  const send = async () => {
    if (!text.trim() || !active) return;
    const body = text;
    setText('');
    try {
      await api(`/api/messages/${active}`, { method: 'POST', body: { body } });
      refetch();
      invalidate(['/api/messages']);
    } catch (e) {
      setText(body);
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <PageHeader
        title="Messages"
        icon={MessagesSquare}
        actions={
          can('messaging', 'create') && (
            <Button onClick={() => setNewOpen(true)}>
              <PenSquare /> New message
            </Button>
          )
        }
      />
      <Card className="grid grid-cols-1 h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden md:grid-cols-[20rem_minmax(0,1fr)]">
        <div className={cn('flex min-h-0 flex-col border-r border-line', active && 'hidden md:flex')}>
          {isLoading ? (
            <LoadingBlock />
          ) : !convs?.length ? (
            <EmptyState title="No conversations" description="Start a new message to a teacher or parent." />
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {convs.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setActive(c.id)} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-canvas', active === c.id && 'bg-brand-50/70 dark:bg-brand-500/10')}>
                    <Avatar name={c.other?.name ?? '?'} src={c.other?.avatarUrl} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{c.other?.name}</p>
                        <span className="shrink-0 text-[10px] text-ink-faint">{c.last ? formatDateTime(c.last.createdAt) : ''}</span>
                      </div>
                      <p className="truncate text-xs text-ink-soft">
                        {c.last?.mine ? 'You: ' : ''}
                        {c.last?.body}
                      </p>
                    </div>
                    {c.unread > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{c.unread}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className={cn('flex min-h-0 flex-col', !active && 'hidden md:flex')}>
          {!active || !thread ? (
            <EmptyState icon={MessagesSquare} title="Select a conversation" className="m-auto" />
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                <Button variant="ghost" size="icon-sm" className="md:hidden" aria-label="Back" onClick={() => setActive(null)}>
                  <ArrowLeft />
                </Button>
                <Avatar name={thread.other?.name ?? '?'} src={thread.other?.avatarUrl} size={36} />
                <div>
                  <p className="text-sm font-semibold">{thread.other?.name}</p>
                  <p className="text-xs text-ink-faint">{thread.other?.roleLabel}</p>
                </div>
              </div>
              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-canvas/40 px-4 py-4">
                {thread.messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.mine ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm shadow-sm', m.mine ? 'rounded-br-md bg-brand-600 text-white' : 'rounded-bl-md bg-surface')}>
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <p className={cn('mt-1 text-[10px]', m.mine ? 'text-white/70' : 'text-ink-faint')}>
                        {formatDateTime(m.createdAt)}
                        {m.mine && m.readAt ? ' · seen' : ''}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              {can('messaging', 'create') && (
                <form
                  className="flex items-end gap-2 border-t border-line p-3"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <Textarea
                    rows={1}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder="Type a message…"
                    className="max-h-32 min-h-10 resize-none"
                  />
                  <Button type="submit" size="icon" aria-label="Send" disabled={!text.trim()}>
                    <Send />
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </Card>
      <NewChat
        open={newOpen}
        onOpenChange={setNewOpen}
        onStarted={(id) => {
          invalidate(['/api/messages']);
          setActive(id);
        }}
      />
    </>
  );
}
