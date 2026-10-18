'use client';

import * as React from 'react';
import Link from 'next/link';
import { Wrench, AlertTriangle, BarChart3, Cake, CalendarCheck2, CalendarRange, ChevronRight, Contact, Download, FileSpreadsheet, IndianRupee, Printer, Scale, User, UserRound, UserRoundSearch, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { allSectionOptions, classOptions, sectionOptions, useLookups } from '@/lib/lookups';
import { cn, downloadCsv, formatDate } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardHeader, LoadingBlock, PageHeader, StatCard } from '@/components/ui/display';
import { DataTable } from '@/components/ui/data-table';
import { Checkbox, Field, Input, Select } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { ReportBuilder } from './_components/builder';

type ReportKey = 'builder' | 'students' | 'parents' | 'strength' | 'attendance' | 'birthdays';
const REPORTS: Array<{ key: ReportKey; title: string; description: string; icon: LucideIcon }> = [
  { key: 'builder', title: 'Report builder', description: 'Any data, your columns and filters — save and share.', icon: Wrench },
  { key: 'students', title: 'Student information', description: 'Filter by class, gender, category, RTE, transport; pick columns.', icon: UserRoundSearch },
  { key: 'parents', title: 'Parent contacts', description: 'Family-wise phone directory with children.', icon: Contact },
  { key: 'strength', title: 'Class strength (UDISE+)', description: 'Boys/girls and social category per section.', icon: Users },
  { key: 'attendance', title: 'Attendance eligibility', description: 'Session-to-date % and students below 75%.', icon: CalendarCheck2 },
  { key: 'birthdays', title: 'Birthdays', description: 'Students and staff by month.', icon: Cake },
];
const LINKS = [
  { href: '/fees?tab=report', title: 'Fee collection', icon: IndianRupee, module: 'fees' as const },
  { href: '/fees?tab=defaulters', title: 'Fee defaulters', icon: AlertTriangle, module: 'fees' as const },
  { href: '/attendance', title: 'Daily attendance register', icon: CalendarCheck2, module: 'attendance' as const },
  { href: '/staff-attendance', title: 'Staff attendance register', icon: CalendarCheck2, module: 'staff_attendance' as const },
  { href: '/exams', title: 'Exam results & report cards', icon: BarChart3, module: 'exams' as const },
  { href: '/accounts', title: 'Income & expense statement', icon: FileSpreadsheet, module: 'accounts' as const },
];

function Toolbar({ children, onExport, count }: { children?: React.ReactNode; onExport?: () => void; count?: number }) {
  return (
    <div className="no-print flex flex-wrap items-end gap-3 border-b border-line p-3">
      {children}
      <div className="ml-auto flex items-center gap-2">
        {count !== undefined && <span className="text-xs text-ink-faint">{count.toLocaleString('en-IN')} rows</span>}
        <Button size="sm" variant="secondary" onClick={() => window.print()}>
          <Printer /> Print
        </Button>
        {onExport && (
          <Button size="sm" variant="secondary" disabled={!count} onClick={onExport}>
            <Download /> Export CSV
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- students
interface StudentRow {
  id: string;
  admissionNo: string;
  rollNo: string | null;
  name: string;
  classLabel: string;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  category: string | null;
  religion: string | null;
  isRte: boolean;
  penNo: string | null;
  apaarId: string | null;
  aadhaar: string | null;
  address: string;
  admissionDate: string;
  status: string;
  fatherName: string | null;
  motherName: string | null;
  phone: string | null;
  email: string | null;
  transport: string | null;
}
const STUDENT_COLUMNS: Array<{ key: keyof StudentRow; label: string; on?: boolean; fmt?: (r: StudentRow) => string }> = [
  { key: 'admissionNo', label: 'Adm. no.', on: true },
  { key: 'rollNo', label: 'Roll', on: true },
  { key: 'name', label: 'Name', on: true },
  { key: 'classLabel', label: 'Class', on: true },
  { key: 'gender', label: 'Gender', on: true, fmt: (r) => r.gender.charAt(0) + r.gender.slice(1).toLowerCase() },
  { key: 'dob', label: 'Date of birth', on: true, fmt: (r) => (r.dob ? formatDate(r.dob) : '') },
  { key: 'fatherName', label: 'Father', on: true },
  { key: 'motherName', label: 'Mother' },
  { key: 'phone', label: 'Mobile', on: true },
  { key: 'email', label: 'Email' },
  { key: 'category', label: 'Category' },
  { key: 'religion', label: 'Religion' },
  { key: 'bloodGroup', label: 'Blood group' },
  { key: 'isRte', label: 'RTE', fmt: (r) => (r.isRte ? 'Yes' : '') },
  { key: 'penNo', label: 'PEN' },
  { key: 'apaarId', label: 'APAAR id' },
  { key: 'aadhaar', label: 'Aadhaar (masked)' },
  { key: 'address', label: 'Address' },
  { key: 'admissionDate', label: 'Admitted on', fmt: (r) => formatDate(r.admissionDate) },
  { key: 'transport', label: 'Transport' },
  { key: 'status', label: 'Status', fmt: (r) => r.status.toLowerCase().replace('_', ' ') },
];
const cell = (r: StudentRow, c: (typeof STUDENT_COLUMNS)[number]) => (c.fmt ? c.fmt(r) : ((r[c.key] as string | null) ?? ''));

function StudentsReport() {
  const { data: lk } = useLookups(['classes']);
  const [f, setF] = React.useState({ classId: '', sectionId: '', status: 'ACTIVE', gender: '', category: '', rte: '', transport: '' });
  const [cols, setCols] = React.useState(() => STUDENT_COLUMNS.filter((c) => c.on).map((c) => c.key));
  const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v));
  const { data, isLoading } = useApiQuery<{ rows: StudentRow[]; truncated: boolean }>('/api/reports/students', params);
  const visible = STUDENT_COLUMNS.filter((c) => cols.includes(c.key));
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v, ...(k === 'classId' ? { sectionId: '' } : {}) }));
  return (
    <Card>
      <Toolbar count={data?.rows.length} onExport={() => downloadCsv('student-report', (data?.rows ?? []).map((r) => Object.fromEntries(visible.map((c) => [c.label, cell(r, c)]))))}>
        <Field label="Class">
          <Select className="w-32" value={f.classId} onChange={(e) => set('classId', e.target.value)} options={[{ value: '', label: 'All' }, ...classOptions(lk)]} />
        </Field>
        <Field label="Section">
          <Select className="w-28" disabled={!f.classId} value={f.sectionId} onChange={(e) => set('sectionId', e.target.value)} options={[{ value: '', label: 'All' }, ...sectionOptions(lk, f.classId)]} />
        </Field>
        <Field label="Status">
          <Select className="w-32" value={f.status} onChange={(e) => set('status', e.target.value)} options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'TRANSFERRED', label: 'Transferred' }, { value: 'PASSED_OUT', label: 'Passed out' }, { value: 'DROPPED', label: 'Dropped' }, { value: 'INACTIVE', label: 'Inactive' }, { value: 'ALL', label: 'All' }]} />
        </Field>
        <Field label="Gender">
          <Select className="w-28" value={f.gender} onChange={(e) => set('gender', e.target.value)} options={[{ value: '', label: 'All' }, { value: 'MALE', label: 'Boys' }, { value: 'FEMALE', label: 'Girls' }, { value: 'OTHER', label: 'Other' }]} />
        </Field>
        <Field label="Category">
          <Select className="w-28" value={f.category} onChange={(e) => set('category', e.target.value)} options={[{ value: '', label: 'All' }, ...['GENERAL', 'OBC', 'SC', 'ST', 'EWS'].map((c) => ({ value: c, label: c }))]} />
        </Field>
        <Field label="RTE">
          <Select className="w-24" value={f.rte} onChange={(e) => set('rte', e.target.value)} options={[{ value: '', label: 'All' }, { value: 'yes', label: 'RTE' }, { value: 'no', label: 'Non-RTE' }]} />
        </Field>
        <Field label="Transport">
          <Select className="w-28" value={f.transport} onChange={(e) => set('transport', e.target.value)} options={[{ value: '', label: 'All' }, { value: 'yes', label: 'Uses bus' }, { value: 'no', label: 'Own' }]} />
        </Field>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost">
              Columns ({cols.length})
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60">
            <div className="grid max-h-80 gap-1.5 overflow-y-auto">
              {STUDENT_COLUMNS.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={cols.includes(c.key)} onCheckedChange={(on) => setCols((x) => (on ? STUDENT_COLUMNS.map((s) => s.key).filter((k) => x.includes(k) || k === c.key) : x.filter((k) => k !== c.key)))} />
                  {c.label}
                </label>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </Toolbar>
      {data?.truncated && <p className="px-4 py-2 text-xs text-amber-700">Showing the first 5,000 students. Narrow the filters to see the rest.</p>}
      <DataTable<StudentRow> data={data?.rows} loading={isLoading} emptyTitle="No students match" columns={visible.map((c) => ({ id: c.key, header: c.label, accessorFn: (r: StudentRow) => cell(r, c) }))} />
    </Card>
  );
}

// ---------------------------------------------------------------- parents
interface ParentRow {
  id: string;
  familyCode: string | null;
  fatherName: string | null;
  fatherPhone: string | null;
  fatherEmail: string | null;
  fatherOccupation: string | null;
  motherName: string | null;
  motherPhone: string | null;
  primaryPhone: string;
  address: string | null;
  children: string;
  childCount: number;
  hasLogin: boolean;
}
function ParentsReport() {
  const { data, isLoading } = useApiQuery<{ rows: ParentRow[] }>('/api/reports/parents');
  const [q, setQ] = React.useState('');
  const rows = (data?.rows ?? []).filter((r) => !q || [r.fatherName, r.motherName, r.primaryPhone, r.children].some((v) => v?.toLowerCase().includes(q.toLowerCase())));
  return (
    <Card>
      <Toolbar count={rows.length} onExport={() => downloadCsv('parent-contacts', rows.map((r) => ({ Father: r.fatherName, 'Father mobile': r.fatherPhone, Mother: r.motherName, 'Mother mobile': r.motherPhone, 'Primary mobile': r.primaryPhone, Email: r.fatherEmail, Occupation: r.fatherOccupation, Address: r.address, Children: r.children, 'App login': r.hasLogin ? 'Yes' : 'No' })))}>
        <Input className="w-64" placeholder="Search parent, mobile or child…" value={q} onChange={(e) => setQ(e.target.value)} />
      </Toolbar>
      <DataTable<ParentRow>
        data={data ? rows : undefined}
        loading={isLoading}
        columns={[
          { id: 'parents', header: 'Parents', cell: ({ row: { original: r } }) => <div><p className="font-medium">{r.fatherName ?? '—'}</p><p className="text-xs text-ink-faint">{r.motherName}</p></div> },
          { accessorKey: 'primaryPhone', header: 'Mobile', cell: ({ row: { original: r } }) => <div className="font-mono text-xs"><p>{r.primaryPhone}</p>{r.motherPhone && r.motherPhone !== r.primaryPhone && <p className="text-ink-faint">{r.motherPhone}</p>}</div> },
          { accessorKey: 'children', header: 'Children', cell: ({ getValue }) => <span className="text-xs">{getValue()}</span> },
          { accessorKey: 'address', header: 'Address', cell: ({ getValue }) => <span className="line-clamp-2 text-xs text-ink-soft">{getValue()}</span> },
          { accessorKey: 'hasLogin', header: 'App', cell: ({ getValue }) => (getValue() ? <Badge tone="success">active</Badge> : <Badge>none</Badge>) },
        ]}
      />
    </Card>
  );
}

// ---------------------------------------------------------------- strength
interface StrengthRow {
  sectionId: string;
  classLabel: string;
  boys: number;
  girls: number;
  other: number;
  total: number;
  general: number;
  obc: number;
  sc: number;
  st: number;
  ews: number;
  rte: number;
}
const STRENGTH_COLS: Array<[keyof StrengthRow, string]> = [['boys', 'Boys'], ['girls', 'Girls'], ['other', 'Other'], ['total', 'Total'], ['general', 'General'], ['obc', 'OBC'], ['sc', 'SC'], ['st', 'ST'], ['ews', 'EWS'], ['rte', 'RTE']];
function StrengthReport() {
  const { data, isLoading } = useApiQuery<{ rows: StrengthRow[]; totals: Record<string, number> }>('/api/reports/strength');
  if (isLoading || !data) return <LoadingBlock />;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <StatCard label="Students" value={(data.totals.total ?? 0).toLocaleString('en-IN')} icon={Users} />
        <StatCard label="Boys" value={(data.totals.boys ?? 0).toLocaleString('en-IN')} icon={User} tone="sky" />
        <StatCard label="Girls" value={(data.totals.girls ?? 0).toLocaleString('en-IN')} icon={UserRound} tone="rose" />
        <StatCard label="RTE (25% quota)" value={(data.totals.rte ?? 0).toLocaleString('en-IN')} icon={Scale} tone="amber" />
      </div>
      <Card>
        <Toolbar count={data.rows.length} onExport={() => downloadCsv('class-strength', [...data.rows, { classLabel: 'TOTAL', ...data.totals } as unknown as StrengthRow].map((r) => ({ Class: r.classLabel, ...Object.fromEntries(STRENGTH_COLS.map(([k, l]) => [l, r[k] ?? 0])) })))} />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-2 text-left font-medium">Class</th>
                {STRENGTH_COLS.map(([k, l]) => (
                  <th key={k} className={cn('px-3 py-2 text-right font-medium', k === 'total' && 'text-ink')}>
                    {l}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r) => (
                <tr key={r.sectionId} className="border-b border-line/60">
                  <td className="px-4 py-2 font-medium">{r.classLabel}</td>
                  {STRENGTH_COLS.map(([k]) => (
                    <td key={k} className={cn('px-3 py-2 text-right tabular-nums', k === 'total' && 'font-semibold')}>
                      {r[k] || '—'}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-canvas font-semibold">
                <td className="px-4 py-2">Total</td>
                {STRENGTH_COLS.map(([k]) => (
                  <td key={k} className="px-3 py-2 text-right tabular-nums">
                    {data.totals[k] ?? 0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- attendance
interface AttRow {
  id: string;
  name: string;
  admissionNo: string;
  rollNo: string | null;
  classLabel: string;
  phone: string | null;
  total: number;
  present: number;
  absent: number;
  leave: number;
  percent: number | null;
  below: boolean;
}
function AttendanceReport() {
  const { data: lk } = useLookups(['classes']);
  const [sectionId, setSectionId] = React.useState('');
  const [from, setFrom] = React.useState('');
  const [to, setTo] = React.useState('');
  const [threshold, setThreshold] = React.useState(75);
  const [onlyBelow, setOnlyBelow] = React.useState(true);
  const { data, isLoading } = useApiQuery<{ from: string; to: string; threshold: number; average: number | null; belowCount: number; rows: AttRow[] }>('/api/reports/attendance', { sectionId: sectionId || undefined, from: from || undefined, to: to || undefined, threshold });
  const rows = (data?.rows ?? []).filter((r) => !onlyBelow || r.below);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label="Average attendance" value={data?.average != null ? `${data.average}%` : '—'} icon={CalendarCheck2} />
        <StatCard label={`Below ${threshold}%`} value={data ? String(data.belowCount) : '—'} icon={AlertTriangle} tone="rose" />
        <StatCard label="Period" value={data ? `${formatDate(data.from)} – ${formatDate(data.to)}` : '—'} icon={CalendarRange} tone="violet" />
      </div>
      <Card>
        <Toolbar count={rows.length} onExport={() => downloadCsv('attendance-eligibility', rows.map((r) => ({ 'Adm. no.': r.admissionNo, Roll: r.rollNo, Name: r.name, Class: r.classLabel, 'Days marked': r.total, Present: r.present, Absent: r.absent, Leave: r.leave, 'Attendance %': r.percent, Mobile: r.phone })))}>
          <Field label="Section">
            <Select className="w-36" value={sectionId} onChange={(e) => setSectionId(e.target.value)} options={[{ value: '', label: 'All sections' }, ...allSectionOptions(lk)]} />
          </Field>
          <Field label="From">
            <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="To">
            <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Threshold %">
            <Input type="number" className="w-24" min={1} max={100} value={threshold} onChange={(e) => setThreshold(Math.min(100, Math.max(1, Number(e.target.value) || 75)))} />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm">
            <Checkbox checked={onlyBelow} onCheckedChange={(c) => setOnlyBelow(c === true)} /> Only below threshold
          </label>
        </Toolbar>
        <DataTable<AttRow>
          data={data ? rows : undefined}
          loading={isLoading}
          emptyTitle={onlyBelow ? 'Everyone is above the threshold' : 'No attendance marked yet'}
          columns={[
            { accessorKey: 'name', header: 'Student', cell: ({ row: { original: r } }) => <div><p className="font-medium">{r.name}</p><p className="text-xs text-ink-faint">{r.admissionNo} · {r.classLabel}{r.rollNo ? ` · Roll ${r.rollNo}` : ''}</p></div> },
            { accessorKey: 'total', header: 'Days', cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> },
            { accessorKey: 'present', header: 'Present', cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> },
            { accessorKey: 'absent', header: 'Absent', cell: ({ getValue }) => <span className="tabular-nums">{getValue()}</span> },
            { accessorKey: 'percent', header: '%', cell: ({ row: { original: r } }) => (r.percent == null ? '—' : <Badge tone={r.below ? 'danger' : r.percent < 85 ? 'warning' : 'success'}>{r.percent}%</Badge>) },
            { accessorKey: 'phone', header: 'Parent mobile', cell: ({ getValue }) => <span className="font-mono text-xs">{getValue() ?? '—'}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- birthdays
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function BirthdaysReport() {
  const [month, setMonth] = React.useState(new Date().getMonth() + 1);
  const { data, isLoading } = useApiQuery<{ rows: Array<{ id: string; type: 'STUDENT' | 'EMPLOYEE'; name: string; detail: string; day: number; turning: number; photoUrl: string | null }> }>('/api/reports/birthdays', { month });
  const today = new Date();
  return (
    <Card>
      <Toolbar count={data?.rows.length} onExport={() => downloadCsv(`birthdays-${MONTHS[month - 1]}`, (data?.rows ?? []).map((r) => ({ Date: `${r.day} ${MONTHS[month - 1]}`, Name: r.name, Type: r.type === 'STUDENT' ? 'Student' : 'Staff', 'Class / designation': r.detail, Turning: r.turning })))}>
        <Field label="Month">
          <Select className="w-40" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
        </Field>
      </Toolbar>
      {isLoading ? (
        <LoadingBlock />
      ) : !data?.rows.length ? (
        <p className="p-8 text-center text-sm text-ink-faint">No birthdays recorded for {MONTHS[month - 1]}.</p>
      ) : (
        <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {data.rows.map((r) => {
            const isToday = month === today.getMonth() + 1 && r.day === today.getDate();
            return (
              <li key={`${r.type}${r.id}`} className={cn('flex items-center gap-3 bg-surface px-4 py-3', isToday && 'bg-amber-50 dark:bg-amber-950/30')}>
                <span className="w-10 text-center">
                  <span className="block text-lg font-bold leading-none">{r.day}</span>
                  <span className="text-[10px] uppercase text-ink-faint">{MONTHS[month - 1].slice(0, 3)}</span>
                </span>
                <Avatar name={r.name} src={r.photoUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.name} {isToday && '🎂'}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    {r.detail} · turns {r.turning}
                  </p>
                </div>
                <Badge>{r.type === 'STUDENT' ? 'student' : 'staff'}</Badge>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

const VIEWS: Record<ReportKey, () => React.JSX.Element> = { builder: ReportBuilder, students: StudentsReport, parents: ParentsReport, strength: StrengthReport, attendance: AttendanceReport, birthdays: BirthdaysReport };

export default function ReportsPage() {
  const { can } = useApp();
  const [active, setActive] = React.useState<ReportKey>('students');
  const View = VIEWS[active];
  const current = REPORTS.find((r) => r.key === active)!;
  return (
    <>
      <PageHeader title="Reports" description="Ready-made reports for the office, management and government returns. Everything exports to Excel (CSV) or prints." icon={FileSpreadsheet} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="no-print space-y-4">
          <Card>
            <nav className="p-2" aria-label="Reports">
              {REPORTS.map((r) => (
                <button key={r.key} type="button" onClick={() => setActive(r.key)} className={cn('flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition', active === r.key ? 'bg-brand-50 text-brand-800 dark:bg-brand-950/60 dark:text-brand-200' : 'hover:bg-canvas')}>
                  <r.icon className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <span className="block text-sm font-medium">{r.title}</span>
                    <span className="block text-xs text-ink-faint">{r.description}</span>
                  </span>
                </button>
              ))}
            </nav>
          </Card>
          <Card>
            <CardHeader title="More reports" />
            <ul className="p-2">
              {LINKS.filter((l) => can(l.module)).map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-canvas">
                    <l.icon className="size-4 text-ink-faint" />
                    <span className="flex-1">{l.title}</span>
                    <ChevronRight className="size-4 text-ink-faint" />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="min-w-0 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <current.icon className="size-5 text-brand-600" /> {current.title}
          </h2>
          <View />
        </div>
      </div>
    </>
  );
}
