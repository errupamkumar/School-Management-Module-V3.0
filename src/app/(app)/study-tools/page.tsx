'use client';

import * as React from 'react';
import { CheckCircle2, Flame, HelpCircle, MessageCircleQuestion, Pause, Play, RotateCcw, Send, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { useLookups } from '@/lib/lookups';
import { formatDateTime } from '@/lib/utils';
import { useApp, useFocusChild } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, EmptyState, LoadingBlock, PageHeader, StatCard } from '@/components/ui/display';
import { BarsChart, ShareBars } from '@/components/ui/charts';
import { Field, Segmented, Select, Textarea } from '@/components/ui/form';
import { Tabs, TabPanel } from '@/components/ui/overlay';

interface Stats {
  totalMinutes: number;
  week: Array<{ day: string; minutes: number }>;
  streak: number;
  bySubject: Array<{ subject: string; minutes: number }>;
  recent: Array<{ id: string; subject: string | null; minutes: number; completedAt: string }>;
}
interface Doubt {
  id: string;
  question: string;
  answer: string | null;
  answeredByName: string | null;
  status: 'OPEN' | 'ANSWERED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  studentName: string;
  classLabel: string;
  subject: string | null;
  mine: boolean;
}

const PRESETS = [
  { value: '25', label: '25 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
];

function FocusTimer({ onLogged }: { onLogged: () => void }) {
  const { data: lk } = useLookups(['subjects']);
  const [preset, setPreset] = React.useState('25');
  const [subject, setSubject] = React.useState('');
  const [left, setLeft] = React.useState(25 * 60);
  const [running, setRunning] = React.useState(false);
  const endAt = React.useRef<number | null>(null);
  const total = Number(preset) * 60;

  const finish = React.useCallback(
    async (seconds: number) => {
      setRunning(false);
      endAt.current = null;
      const minutes = Math.round(seconds / 60);
      if (minutes < 1) return;
      try {
        await api('/api/study/sessions', { method: 'POST', body: { subject: subject || null, minutes } });
        toast.success(`Great focus! ${minutes} minutes logged.`);
        onLogged();
      } catch (e) {
        toast.error((e as Error).message);
      }
    },
    [subject, onLogged]
  );

  React.useEffect(() => {
    if (!running) return;
    // Wall-clock based so background tabs stay accurate.
    const t = setInterval(() => {
      const remaining = Math.max(0, Math.round(((endAt.current ?? Date.now()) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining === 0) finish(total);
    }, 500);
    return () => clearInterval(t);
  }, [running, finish, total]);

  React.useEffect(() => {
    document.title = running ? `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')} · Focus` : 'Study tools';
  }, [left, running]);

  const pct = 1 - left / total;
  const R = 88;
  const C = 2 * Math.PI * R;
  return (
    <Card>
      <CardHeader title="Focus timer" description="Put the phone away, pick a subject and start. Completed sessions are added to your study log." icon={Timer} />
      <CardBody className="flex flex-col items-center gap-5">
        <div className="relative size-52">
          <svg viewBox="0 0 200 200" className="size-full -rotate-90">
            <circle cx="100" cy="100" r={R} className="fill-none stroke-slate-200 dark:stroke-slate-800" strokeWidth="12" />
            <circle cx="100" cy="100" r={R} className="fill-none stroke-brand-600 transition-[stroke-dashoffset] duration-500" strokeWidth="12" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-5xl font-bold tabular-nums">
              {String(Math.floor(left / 60)).padStart(2, '0')}:{String(left % 60).padStart(2, '0')}
            </span>
            <span className="text-xs text-ink-faint">{running ? 'stay focused' : 'ready'}</span>
          </div>
        </div>
        <div className="grid w-full max-w-sm gap-3">
          <Segmented
            className="justify-self-center"
            value={preset}
            onChange={(p) => {
              if (running) return;
              setPreset(p);
              setLeft(Number(p) * 60);
            }}
            options={PRESETS}
          />
          <Select value={subject} disabled={running} onChange={(e) => setSubject(e.target.value)} options={[{ value: '', label: 'General study' }, ...(lk?.subjects ?? []).map((s) => ({ value: s.name, label: s.name }))]} />
          <div className="flex justify-center gap-2">
            {!running ? (
              <Button
                onClick={() => {
                  endAt.current = Date.now() + left * 1000;
                  setRunning(true);
                }}
              >
                <Play /> {left === total ? 'Start' : 'Resume'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                onClick={() => {
                  setRunning(false);
                  endAt.current = null;
                }}
              >
                <Pause /> Pause
              </Button>
            )}
            {left !== total && (
              <>
                <Button variant="ghost" onClick={() => finish(total - left).then(() => setLeft(total))}>
                  <CheckCircle2 /> Finish & log
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRunning(false);
                    setLeft(total);
                  }}
                >
                  <RotateCcw /> Reset
                </Button>
              </>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function StudyStats({ studentId }: { studentId?: string }) {
  const { data, isLoading } = useApiQuery<Stats>('/api/study/sessions', studentId ? { studentId } : undefined);
  if (isLoading || !data) return <LoadingBlock />;
  const weekTotal = data.week.reduce((a, d) => a + d.minutes, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Study streak" value={`${data.streak} day${data.streak === 1 ? '' : 's'}`} icon={Flame} tone="amber" />
        <StatCard label="This week" value={`${Math.floor(weekTotal / 60)}h ${weekTotal % 60}m`} icon={Timer} />
        <StatCard label="Last 30 days" value={`${Math.floor(data.totalMinutes / 60)}h ${data.totalMinutes % 60}m`} icon={CheckCircle2} tone="emerald" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Minutes per day (last 7 days)" />
          <CardBody>
            <BarsChart height={200} data={data.week.map((d) => ({ day: new Date(`${d.day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' }), minutes: d.minutes }))} xKey="day" series={[{ key: 'minutes', label: 'Minutes' }]} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="By subject (30 days)" />
          <CardBody>{data.bySubject.length ? <ShareBars items={data.bySubject.map((s) => ({ label: s.subject, value: s.minutes }))} /> : <p className="text-sm text-ink-faint">No study sessions logged yet.</p>}</CardBody>
        </Card>
      </div>
    </div>
  );
}

function DoubtDesk() {
  const { role, can } = useApp();
  const child = useFocusChild();
  const invalidate = useInvalidate();
  const { data: lk } = useLookups(['subjects']);
  const [status, setStatus] = React.useState<'OPEN' | 'ANSWERED' | 'ALL'>(role === 'STUDENT' ? 'ALL' : 'OPEN');
  const { data, isLoading } = useApiQuery<Doubt[]>('/api/doubts', { status, studentId: role === 'PARENT' ? child?.id : undefined });
  const [q, setQ] = React.useState('');
  const [subjectId, setSubjectId] = React.useState('');
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const canAnswer = can('study_tools', 'edit') && role !== 'STUDENT' && role !== 'PARENT';
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      invalidate(['/api/doubts']);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <div className="space-y-4">
      {role === 'STUDENT' && (
        <Card>
          <CardHeader title="Ask a doubt" description="Your class and subject teachers are notified and reply here." icon={MessageCircleQuestion} />
          <CardBody className="space-y-3">
            <Field label="Subject">
              <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} options={[{ value: '', label: 'Any / general' }, ...(lk?.subjects ?? []).map((s) => ({ value: s.id, label: s.name }))]} />
            </Field>
            <Textarea rows={3} maxLength={2000} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Why does the moon change shape every night?" />
            <div className="flex justify-end">
              <Button disabled={q.trim().length < 10} onClick={() => run(() => api('/api/doubts', { method: 'POST', body: { subjectId: subjectId || null, question: q } }), 'Doubt sent to your teachers').then(() => setQ(''))}>
                <Send /> Ask
              </Button>
            </div>
          </CardBody>
        </Card>
      )}
      <Card>
        <div className="flex items-center gap-2 border-b border-line p-3">
          <Segmented size="sm" value={status} onChange={setStatus} options={[{ value: 'OPEN', label: 'Open' }, { value: 'ANSWERED', label: 'Answered' }, { value: 'ALL', label: 'All' }]} />
        </div>
        {isLoading ? (
          <LoadingBlock />
        ) : !data?.length ? (
          <EmptyState icon={HelpCircle} title={status === 'OPEN' ? 'No open doubts' : 'Nothing here yet'} />
        ) : (
          <ul className="divide-y divide-line">
            {data.map((d) => (
              <li key={d.id} className="space-y-2 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
                  {role !== 'STUDENT' && (
                    <span className="font-medium text-ink">
                      {d.studentName} · {d.classLabel}
                    </span>
                  )}
                  {d.subject && <Badge>{d.subject}</Badge>}
                  <Badge tone={d.status === 'OPEN' ? 'warning' : d.status === 'ANSWERED' ? 'success' : 'neutral'}>{d.status.toLowerCase()}</Badge>
                  <span>{formatDateTime(d.createdAt)}</span>
                </div>
                <p className="whitespace-pre-wrap text-sm">{d.question}</p>
                {d.answer && (
                  <div className="rounded-xl bg-brand-50 p-3 text-sm dark:bg-brand-950/40">
                    <p className="mb-1 text-xs font-semibold text-brand-700 dark:text-brand-300">{d.answeredByName} replied</p>
                    <p className="whitespace-pre-wrap">{d.answer}</p>
                  </div>
                )}
                {canAnswer && d.status !== 'CLOSED' && (
                  <div className="flex gap-2">
                    <Textarea rows={2} className="flex-1" placeholder={d.answer ? 'Add to or replace your answer…' : 'Type your answer…'} value={answers[d.id] ?? ''} onChange={(e) => setAnswers((a) => ({ ...a, [d.id]: e.target.value }))} />
                    <Button className="self-end" disabled={(answers[d.id] ?? '').trim().length < 2} onClick={() => run(() => api(`/api/doubts/${d.id}`, { method: 'PATCH', body: { answer: answers[d.id] } }), 'Answer sent').then(() => setAnswers((a) => ({ ...a, [d.id]: '' })))}>
                      <Send />
                    </Button>
                  </div>
                )}
                {d.mine && d.status !== 'CLOSED' && (
                  <Button size="sm" variant="ghost" onClick={() => run(() => api(`/api/doubts/${d.id}`, { method: 'PATCH', body: { status: 'CLOSED' } }), 'Marked as resolved')}>
                    <CheckCircle2 /> Resolved
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

export default function StudyToolsPage() {
  const { role } = useApp();
  const child = useFocusChild();
  const invalidate = useInvalidate();
  const [tab, setTab] = React.useState(role === 'STUDENT' ? 'focus' : role === 'PARENT' ? 'log' : 'doubts');
  const tabs = [...(role === 'STUDENT' ? [{ value: 'focus', label: 'Focus timer' }] : []), ...(role === 'STUDENT' || role === 'PARENT' ? [{ value: 'log', label: 'Study log' }] : []), { value: 'doubts', label: 'Doubt desk' }];
  return (
    <>
      <PageHeader title="Study tools" description={role === 'PARENT' ? `How ${child?.name ?? 'your child'} is studying at home, and their questions to teachers.` : role === 'STUDENT' ? 'Focus timer, study streaks and a doubt desk with your teachers.' : 'Answer students’ doubts from your classes.'} icon={Timer} />
      <Tabs value={tab} onValueChange={setTab} tabs={tabs}>
        {role === 'STUDENT' && (
          <TabPanel value="focus">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
              <FocusTimer onLogged={() => invalidate(['/api/study'])} />
              <StudyStats />
            </div>
          </TabPanel>
        )}
        <TabPanel value="log">{role === 'PARENT' ? child ? <StudyStats studentId={child.id} /> : null : <StudyStats />}</TabPanel>
        <TabPanel value="doubts">
          <DoubtDesk />
        </TabPanel>
      </Tabs>
    </>
  );
}
