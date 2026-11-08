'use client';

import * as React from 'react';
import { Bot, Copy, Loader2, RotateCcw, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery } from '@/lib/api-client';
import { cn, firstName } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Card, EmptyState, LoadingBlock, PageHeader, Progress } from '@/components/ui/display';
import { Textarea } from '@/components/ui/form';

interface Status {
  configured: boolean;
  enabled: boolean;
  dailyLimit: number;
  usedToday: number;
  remainingToday: number;
  suggestions: string[];
}
interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

/** **bold** spans as React nodes — model output is never injected as HTML. */
function inline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => (part.startsWith('**') && part.endsWith('**') ? <strong key={i}>{part.slice(2, -2)}</strong> : part));
}

function Rich({ text }: { text: string }) {
  const blocks: React.ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const L = list.ordered ? 'ol' : 'ul';
    blocks.push(
      <L key={blocks.length} className={cn('my-1.5 space-y-1 pl-5', list.ordered ? 'list-decimal' : 'list-disc')}>
        {list.items.map((it, i) => (
          <li key={i}>{inline(it)}</li>
        ))}
      </L>
    );
    list = null;
  };
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      const ordered = !!num;
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, items: [] };
      }
      list.items.push((bullet ?? num)![1]);
      continue;
    }
    flush();
    if (!line.trim()) continue;
    const h = line.match(/^#{1,4}\s+(.*)$/);
    blocks.push(h ? <p key={blocks.length} className="mt-2 font-semibold">{inline(h[1])}</p> : <p key={blocks.length} className="my-1">{inline(line)}</p>);
  }
  flush();
  return <div className="text-sm leading-6">{blocks}</div>;
}

export default function AiAssistantPage() {
  const { me } = useApp();
  const status = useApiQuery<Status>('/api/ai-assistant');
  const [turns, setTurns] = React.useState<Turn[]>([]);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [usage, setUsage] = React.useState<{ used: number; remaining: number } | null>(null);
  const endRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), [turns, busy]);

  const s = status.data;
  const used = usage?.used ?? s?.usedToday ?? 0;
  const remaining = usage?.remaining ?? s?.remainingToday ?? 0;

  async function send(text: string) {
    const q = text.trim();
    if (!q || busy) return;
    const next = [...turns, { role: 'user' as const, content: q }];
    setTurns(next);
    setDraft('');
    setBusy(true);
    try {
      const r = await api<{ reply: string; usedToday: number; remainingToday: number }>('/api/ai-assistant', { method: 'POST', body: { messages: next.slice(-12) } });
      setTurns((t) => [...t, { role: 'assistant', content: r.reply }]);
      setUsage({ used: r.usedToday, remaining: r.remainingToday });
    } catch (e) {
      toast.error((e as Error).message);
      setTurns((t) => t.slice(0, -1));
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  if (status.isLoading || !s) return <LoadingBlock />;
  const unavailable = !s.configured ? 'The AI assistant has not been set up yet. The platform administrator needs to add an AI API key to the server configuration.' : !s.enabled ? 'Your school has switched the AI assistant off.' : null;

  return (
    <>
      <PageHeader
        title="AI assistant"
        description={me.user.role === 'STUDENT' ? 'Your study buddy — ask it to explain, quiz you or plan your revision.' : 'Draft, explain and plan faster. It knows your role and the relevant school data.'}
        icon={Sparkles}
        actions={
          turns.length > 0 && (
            <Button variant="secondary" onClick={() => setTurns([])}>
              <RotateCcw /> New chat
            </Button>
          )
        }
      />
      {unavailable ? (
        <EmptyState icon={Bot} title="Assistant unavailable" description={unavailable} />
      ) : (
        <Card className="flex h-[calc(100dvh-13rem)] min-h-[480px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-5">
            {!turns.length && (
              <div className="mx-auto max-w-2xl py-6 text-center">
                <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-violet-600 text-white shadow-lg">
                  <Sparkles className="size-7" />
                </span>
                <p className="mt-3 text-lg font-semibold">Namaste, {firstName(me.user.name)}! How can I help?</p>
                <p className="text-sm text-ink-faint">Ask in English or Hindi.</p>
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {s.suggestions.map((q) => (
                    <button key={q} type="button" onClick={() => send(q)} className="rounded-xl border border-line px-4 py-3 text-left text-sm hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-950/30">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={cn('flex gap-3', t.role === 'user' && 'flex-row-reverse')}>
                {t.role === 'user' ? (
                  <Avatar name={me.user.name} src={me.user.avatarUrl} size={32} />
                ) : (
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-600 text-white">
                    <Bot className="size-4" />
                  </span>
                )}
                <div className={cn('group max-w-[80%] rounded-2xl px-4 py-2.5', t.role === 'user' ? 'bg-brand-600 text-white' : 'bg-canvas')}>
                  {t.role === 'user' ? <p className="whitespace-pre-wrap text-sm">{t.content}</p> : <Rich text={t.content} />}
                  {t.role === 'assistant' && (
                    <button type="button" className="mt-1 flex items-center gap-1 text-xs text-ink-faint opacity-0 transition group-hover:opacity-100" onClick={() => navigator.clipboard.writeText(t.content).then(() => toast.success('Copied'), () => undefined)}>
                      <Copy className="size-3" /> Copy
                    </button>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex items-center gap-2 text-sm text-ink-faint">
                <Loader2 className="size-4 animate-spin" /> Thinking…
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-line p-3">
            <form
              className="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(draft);
              }}
            >
              <Textarea
                rows={1}
                maxLength={4000}
                className="max-h-40 min-h-[44px] flex-1 resize-none"
                placeholder="Ask anything…  (Enter to send, Shift+Enter for a new line)"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(draft);
                  }
                }}
              />
              <Button type="submit" disabled={!draft.trim() || busy || remaining <= 0} aria-label="Send">
                <Send />
              </Button>
            </form>
            <div className="mt-2 flex items-center gap-3 text-[11px] text-ink-faint">
              <span className="min-w-0">AI can make mistakes — check important facts.</span>
              <Progress className="ml-auto w-16 shrink-0 sm:w-28"value={s.dailyLimit ? (used / s.dailyLimit) * 100 : 0} tone={remaining < s.dailyLimit * 0.1 ? 'danger' : 'brand'} />
              <span className="shrink-0 tabular-nums">{Math.round((remaining / Math.max(1, s.dailyLimit)) * 100)}% left today</span>
            </div>
          </div>
        </Card>
      )}
    </>
  );
}
