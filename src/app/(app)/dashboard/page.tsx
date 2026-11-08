'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BadgeIndianRupee,
  BookMarked,
  Bus,
  CalendarDays,
  Cake,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  GraduationCap,
  Library,
  Megaphone,
  Package,
  Receipt,
  UserCheck,
  UserPlus,
  Users,
  Video,
  Wallet,
} from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { cn, compactINR, firstName, formatDate, formatDateTime, formatINR, formatNumber } from '@/lib/utils';
import { useLang } from '@/components/providers';
import { useApp } from '@/components/shell/app-context';
import { Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, LoadingBlock, Progress, StatCard, StatusBadge } from '@/components/ui/display';
import { Button } from '@/components/ui/button';
import { BarsChart, ShareBars, TrendChart } from '@/components/ui/charts';

interface Notice {
  id: string;
  title: string;
  category: string;
  publishAt: string;
  isPinned: boolean;
}
interface EventRow {
  id: string;
  title: string;
  kind: string;
  startDate: string;
}
interface SchoolDash {
  kind: 'school';
  notices: Notice[];
  events: EventRow[];
  students?: { total: number; boys: number; girls: number; newThisMonth: number };
  employees?: { total: number; teaching: number; nonTeaching: number };
  attendance?: { present: number; absent: number; leave: number; marked: number; sectionsMarked: number; sectionsTotal: number; absentees: Array<{ id: string; name: string; classLabel: string }> };
  staffAttendance?: { present: number; total: number; marked: number };
  fees?: {
    billedThisMonth: number;
    collectedThisMonth: number;
    collectedToday: number;
    outstanding: number;
    outstandingInvoices: number;
    trend: Array<{ month: string; collected: number }>;
    modes: Array<{ mode: string; amount: number }>;
    recent: Array<{ id: string; receiptNo: string; amount: number; mode: string; paidAt: string; student: string; classLabel: string }>;
  };
  incomeExpense?: Array<{ month: string; income: number; expense: number }>;
  classStrength?: Array<{ name: string; students: number }>;
  pending?: { leave?: number; enquiries?: number; vehicleCompliance?: number; overdueBooks?: number; lowStock?: number };
  birthdays?: Array<{ id: string; name: string; kind: string }>;
}
interface TeacherDash {
  kind: 'teacher';
  notices: Notice[];
  events: EventRow[];
  myClasses: Array<{ id: string; label: string; students: number; attendanceMarked: boolean }>;
  todayTimetable: Array<{ period: string; time: string; classLabel: string; subject: string }>;
}
interface FamilyDash {
  kind: 'family';
  notices: Notice[];
  events: EventRow[];
  children: Array<{
    studentId: string;
    attendance: { percent: number | null; present: number; total: number; today: string | null };
    dues: number | null;
    homework: Array<{ id: string; title: string; subject: string; dueOn: string }>;
    lastExam: { examId: string; name: string; percentage: number } | null;
    timetable: Array<{ period: string; time: string; subject: string; teacher: string | null; isBreak: boolean }>;
  }>;
  liveClasses: Array<{ id: string; title: string; startsAt: string; meetingUrl: string; platform: string }>;
}
type Dash = SchoolDash | TeacherDash | FamilyDash;

function Greeting({ subtitle }: { subtitle?: React.ReactNode }) {
  const { me } = useApp();
  const { t } = useLang();
  const h = new Date().getHours();
  const greet = h < 12 ? t('goodMorning') : h < 17 ? t('goodAfternoon') : t('goodEvening');
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-sm text-ink-soft">{formatDate(new Date(), 'long')}</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight">
          {greet}, {firstName(me.user.name)} 👋
        </h1>
        {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
      </div>
    </div>
  );
}

function NoticesCard({ notices }: { notices: Notice[] }) {
  return (
    <Card>
      <CardHeader title="Noticeboard" icon={Megaphone} actions={<Link href="/notices" className="text-xs font-medium text-brand-600">View all</Link>} />
      {notices.length === 0 ? (
        <EmptyState title="No notices" className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {notices.map((n) => (
            <li key={n.id}>
              <Link href={`/notices?id=${n.id}`} className="flex items-start gap-3 px-5 py-3 hover:bg-canvas/60">
                <span className={cn('mt-1.5 size-2 shrink-0 rounded-full', n.isPinned ? 'bg-rose-500' : 'bg-brand-400')} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-ink-faint">
                    {n.category.toLowerCase()} · {formatDate(n.publishAt)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function EventsCard({ events }: { events: EventRow[] }) {
  return (
    <Card>
      <CardHeader title="Upcoming" icon={CalendarDays} actions={<Link href="/calendar" className="text-xs font-medium text-brand-600">Calendar</Link>} />
      {events.length === 0 ? (
        <EmptyState title="Nothing scheduled" className="py-8" />
      ) : (
        <ul className="divide-y divide-line">
          {events.map((e) => {
            const d = new Date(e.startDate);
            return (
              <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl bg-canvas">
                  <span className="text-[10px] font-semibold uppercase text-ink-faint">{d.toLocaleString('en-IN', { month: 'short', timeZone: 'UTC' })}</span>
                  <span className="text-base font-bold leading-none">{d.getUTCDate()}</span>
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{e.title}</p>
                  <Badge tone={e.kind === 'HOLIDAY' ? 'danger' : e.kind === 'PTM' ? 'warning' : 'brand'}>{e.kind}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

/** "1 item" / "3 items" */
const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function SchoolDashboard({ d }: { d: SchoolDash }) {
  const { can } = useApp();
  const alerts = [
    d.pending?.enquiries ? { href: '/admissions', icon: UserPlus, text: `${count(d.pending.enquiries, 'admission enquiry', 'admission enquiries')} to follow up`, tone: 'brand' } : null,
    d.pending?.leave ? { href: '/leave', icon: CalendarDays, text: `${count(d.pending.leave, 'leave request', 'leave requests')} awaiting approval`, tone: 'warning' } : null,
    d.pending?.vehicleCompliance ? { href: '/transport', icon: Bus, text: `${count(d.pending.vehicleCompliance, 'vehicle', 'vehicles')} with documents expiring within 30 days`, tone: 'danger' } : null,
    d.pending?.overdueBooks ? { href: '/library', icon: Library, text: `${count(d.pending.overdueBooks, 'library book', 'library books')} overdue`, tone: 'warning' } : null,
    d.pending?.lowStock ? { href: '/store', icon: Package, text: `${count(d.pending.lowStock, 'store item', 'store items')} low on stock`, tone: 'warning' } : null,
    d.attendance && d.attendance.sectionsMarked < d.attendance.sectionsTotal
      ? { href: '/attendance', icon: ClipboardCheck, text: `Attendance pending for ${d.attendance.sectionsTotal - d.attendance.sectionsMarked} of ${d.attendance.sectionsTotal} sections today`, tone: 'warning' }
      : null,
  ].filter(Boolean) as Array<{ href: string; icon: typeof Bus; text: string; tone: string }>;

  const attendancePct = d.attendance && d.attendance.marked ? Math.round((d.attendance.present / d.attendance.marked) * 100) : null;
  const collectionPct = d.fees && d.fees.billedThisMonth ? Math.min(100, Math.round((d.fees.collectedThisMonth / d.fees.billedThisMonth) * 100)) : null;

  return (
    <>
      <Greeting subtitle="Here’s what’s happening at your school today." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {d.students && <StatCard label="Students" value={formatNumber(d.students.total)} icon={GraduationCap} hint={`${d.students.boys} boys · ${d.students.girls} girls · ${d.students.newThisMonth} new`} />}
        {d.employees && <StatCard label="Staff" value={formatNumber(d.employees.total)} icon={Users} tone="violet" hint={`${d.employees.teaching} teaching · ${d.employees.nonTeaching} support`} />}
        {d.attendance && (
          <StatCard
            label="Present today"
            value={attendancePct === null ? 'Not marked' : `${attendancePct}%`}
            icon={UserCheck}
            tone="emerald"
            hint={d.attendance.marked ? `${d.attendance.present} present · ${d.attendance.absent} absent` : 'No attendance yet today'}
          />
        )}
        {d.fees && <StatCard label="Collected this month" value={compactINR(d.fees.collectedThisMonth)} icon={BadgeIndianRupee} tone="amber" hint={`${compactINR(d.fees.collectedToday)} today · ${compactINR(d.fees.outstanding)} due`} />}
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {alerts.map((a) => (
            <Link
              key={a.text}
              href={a.href}
              className={cn(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors',
                a.tone === 'danger' ? 'border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200' : a.tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200' : 'border-brand-200 bg-brand-50 text-brand-800 hover:bg-brand-100 dark:border-brand-500/20 dark:bg-brand-500/10 dark:text-brand-200'
              )}
            >
              <a.icon className="size-4 shrink-0" />
              <span className="flex-1">{a.text}</span>
              <ArrowRight className="size-4 shrink-0 opacity-60" />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {d.fees && (
          <Card className="xl:col-span-2">
            <CardHeader title="Fee collection" description="Last 6 months" icon={Wallet} actions={can('fees', 'create') && <Button asChild size="sm"><Link href="/fees?tab=collect"><Receipt /> Collect fee</Link></Button>} />
            <CardBody>
              <TrendChart data={d.fees.trend} xKey="month" yKey="collected" label="Fees collected" money />
              {collectionPct !== null && (
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-ink-soft">This month: {formatINR(d.fees.collectedThisMonth, true)} of {formatINR(d.fees.billedThisMonth, true)} billed</span>
                    <span className="font-semibold">{collectionPct}%</span>
                  </div>
                  <Progress value={collectionPct} tone={collectionPct > 80 ? 'success' : collectionPct > 50 ? 'warning' : 'danger'} />
                </div>
              )}
            </CardBody>
          </Card>
        )}
        {d.fees && (
          <Card>
            <CardHeader title="Payment modes" description="This month" />
            <CardBody>
              {d.fees.modes.length ? <ShareBars money items={d.fees.modes.map((m) => ({ label: m.mode.replace('_', ' '), value: m.amount }))} /> : <EmptyState title="No payments yet this month" className="py-6" />}
            </CardBody>
          </Card>
        )}

        {d.incomeExpense && (
          <Card className="xl:col-span-2">
            <CardHeader title="Income vs expense" description="Ledger, last 6 months" />
            <CardBody>
              <BarsChart
                data={d.incomeExpense}
                xKey="month"
                money
                series={[
                  { key: 'income', label: 'Income' },
                  { key: 'expense', label: 'Expense' },
                ]}
              />
            </CardBody>
          </Card>
        )}

        {d.attendance && (
          <Card>
            <CardHeader title="Absent today" icon={AlertTriangle} actions={<Link href="/attendance" className="text-xs font-medium text-brand-600">Mark</Link>} />
            {d.attendance.absentees.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={d.attendance.marked ? 'No absentees so far' : 'Attendance not marked yet'} className="py-8" />
            ) : (
              <ul className="divide-y divide-line">
                {d.attendance.absentees.map((a) => (
                  <li key={a.id}>
                    <Link href={`/students/${a.id}`} className="flex items-center justify-between px-5 py-2.5 text-sm hover:bg-canvas/60">
                      <span className="font-medium">{a.name}</span>
                      <span className="text-xs text-ink-faint">{a.classLabel}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        )}

        {d.classStrength && (
          <Card className="xl:col-span-2">
            <CardHeader title="Class-wise strength" description="Active students per class" />
            <CardBody>
              <BarsChart data={d.classStrength} xKey="name" series={[{ key: 'students', label: 'Students' }]} />
            </CardBody>
          </Card>
        )}

        {d.fees && (
          <Card>
            <CardHeader title="Recent receipts" icon={Receipt} actions={<Link href="/fees?tab=receipts" className="text-xs font-medium text-brand-600">All</Link>} />
            <ul className="divide-y divide-line">
              {d.fees.recent.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{r.student}</p>
                    <p className="text-xs text-ink-faint">
                      {r.receiptNo} · {r.classLabel} · {r.mode}
                    </p>
                  </div>
                  <span className="text-sm font-semibold">{formatINR(r.amount, true)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        <NoticesCard notices={d.notices} />
        <EventsCard events={d.events} />
        {d.birthdays && d.birthdays.length > 0 && (
          <Card>
            <CardHeader title="Birthdays today" icon={Cake} />
            <ul className="divide-y divide-line">
              {d.birthdays.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                  <span className="font-medium">🎂 {b.name}</span>
                  <Badge>{b.kind}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </>
  );
}

function TeacherDashboard({ d }: { d: TeacherDash }) {
  return (
    <>
      <Greeting subtitle="Your classes and periods for today." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today’s periods" icon={Clock} actions={<Link href="/timetable" className="text-xs font-medium text-brand-600">Full timetable</Link>} />
          {d.todayTimetable.length === 0 ? (
            <EmptyState title="No periods today" className="py-10" />
          ) : (
            <ul className="divide-y divide-line">
              {d.todayTimetable.map((p, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-3">
                  <span className="w-24 shrink-0 text-xs font-medium text-ink-faint">{p.time}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{p.subject}</p>
                    <p className="text-xs text-ink-soft">
                      {p.period} · {p.classLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="My classes" icon={UserCheck} description="Class teacher" />
          {d.myClasses.length === 0 ? (
            <EmptyState title="You are not a class teacher" className="py-10" />
          ) : (
            <ul className="divide-y divide-line">
              {d.myClasses.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div>
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="text-xs text-ink-faint">{c.students} students</p>
                  </div>
                  {c.attendanceMarked ? (
                    <StatusBadge status="SUCCESS" label="Marked" />
                  ) : (
                    <Button asChild size="sm" variant="soft">
                      <Link href={`/attendance?sectionId=${c.id}`}>Mark now</Link>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
        <NoticesCard notices={d.notices} />
        <EventsCard events={d.events} />
        <Card>
          <CardHeader title="Quick actions" />
          <CardBody className="grid grid-cols-2 gap-2">
            {[
              ['/homework', 'Give homework', BookMarked],
              ['/exams', 'Enter marks', ClipboardCheck],
              ['/class-tests', 'Class test', ClipboardCheck],
              ['/messages', 'Message parent', Users],
            ].map(([href, label, Icon]) => {
              const I = Icon as typeof Users;
              return (
                <Link key={href as string} href={href as string} className="flex flex-col items-center gap-2 rounded-xl border border-line p-4 text-center text-xs font-medium hover:border-brand-300 hover:bg-brand-50/50">
                  <I className="size-5 text-brand-600" />
                  {label as string}
                </Link>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </>
  );
}

function FamilyDashboard({ d }: { d: FamilyDash }) {
  const { me, childId, role } = useApp();
  const child = me.children.find((c) => c.id === childId) ?? me.children[0];
  const data = d.children.find((c) => c.studentId === child?.id) ?? d.children[0];
  if (!child || !data) return <EmptyState title="No student linked to this account" description="Please contact the school office." />;
  const att = data.attendance;
  return (
    <>
      <Greeting subtitle={role === 'PARENT' ? `Here’s how ${child.name.split(' ')[0]} is doing.` : 'Here’s your day at a glance.'} />
      {me.children.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto sm:hidden">
          {me.children.map((c) => (
            <ChildChip key={c.id} id={c.id} name={c.name} />
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Attendance this month" value={att.percent === null ? '—' : `${att.percent}%`} icon={UserCheck} tone="emerald" hint={att.today ? `Today: ${att.today.toLowerCase()}` : 'Today: not marked yet'} />
        {data.dues !== null && <StatCard label="Fees due" value={data.dues > 0 ? formatINR(data.dues, true) : 'All clear'} icon={BadgeIndianRupee} tone={data.dues > 0 ? 'rose' : 'emerald'} hint={data.dues > 0 ? 'Pay online from Fees' : 'No pending dues'} />}
        <StatCard label="Homework due" value={data.homework.length} icon={BookMarked} tone="sky" hint="Upcoming deadlines" />
        {data.lastExam && <StatCard label={data.lastExam.name} value={`${data.lastExam.percentage}%`} icon={GraduationCap} tone="violet" hint="Latest published result" />}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={`Today · ${child.classLabel}`} icon={Clock} actions={<Link href="/timetable" className="text-xs font-medium text-brand-600">Week</Link>} />
          {data.timetable.length === 0 ? (
            <EmptyState title="No classes today" className="py-10" />
          ) : (
            <ul className="divide-y divide-line">
              {data.timetable.map((p, i) => (
                <li key={i} className="flex items-center gap-4 px-5 py-2.5">
                  <span className="w-24 shrink-0 text-xs text-ink-faint">{p.time}</span>
                  <span className="text-sm font-medium">{p.subject}</span>
                  <span className="ml-auto truncate text-xs text-ink-faint">{p.teacher}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <CardHeader title="Homework" icon={BookMarked} actions={<Link href="/homework" className="text-xs font-medium text-brand-600">All</Link>} />
          {data.homework.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing due" className="py-8" />
          ) : (
            <ul className="divide-y divide-line">
              {data.homework.map((h) => (
                <li key={h.id} className="px-5 py-3">
                  <p className="text-sm font-medium">{h.title}</p>
                  <p className="text-xs text-ink-faint">
                    {h.subject} · due {formatDate(h.dueOn)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
        {d.liveClasses.length > 0 && (
          <Card>
            <CardHeader title="Live classes" icon={Video} />
            <ul className="divide-y divide-line">
              {d.liveClasses.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    <p className="text-xs text-ink-faint">{formatDateTime(l.startsAt)}</p>
                  </div>
                  <Button asChild size="sm" variant="soft">
                    <a href={l.meetingUrl} target="_blank" rel="noopener noreferrer">
                      Join
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <NoticesCard notices={d.notices} />
        <EventsCard events={d.events} />
      </div>
    </>
  );
}

function ChildChip({ id, name }: { id: string; name: string }) {
  const { childId, setChildId } = useApp();
  return (
    <button onClick={() => setChildId(id)} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium', childId === id ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-line')}>
      {name.split(' ')[0]}
    </button>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useApiQuery<Dash>('/api/dashboard');
  if (isLoading) return <LoadingBlock label="Loading dashboard…" />;
  if (error || !data) return <ErrorState message={error?.message ?? 'Unknown error'} onRetry={() => refetch()} />;
  if (data.kind === 'family') return <FamilyDashboard d={data} />;
  if (data.kind === 'teacher') return <TeacherDashboard d={data} />;
  return <SchoolDashboard d={data} />;
}
