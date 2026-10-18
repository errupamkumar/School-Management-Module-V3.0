'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BadgeIndianRupee, CalendarCheck, FileText, GraduationCap, IdCard, KeyRound, LogOut, MessageSquare, Pencil, Printer, Star, Trash2, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, useApiQuery, useInvalidate } from '@/lib/api-client';
import { cn, formatDate, formatINR, periodLabel, todayISO } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, CardBody, CardHeader, EmptyState, ErrorState, KeyValue, LoadingBlock, Progress, StatusBadge } from '@/components/ui/display';
import { Field, Input, Select, Textarea } from '@/components/ui/form';
import { Dialog, Menu, MenuContent, MenuItem, MenuTrigger, Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';
import { StudentForm, splitStudentForm } from '@/components/student-form';
import { CredentialsDialog, type Credential } from '@/components/people';

interface Profile {
  id: string;
  name: string;
  firstName: string;
  lastName: string | null;
  admissionNo: string;
  rollNo: string | null;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  religion: string | null;
  caste: string | null;
  category: string | null;
  motherTongue: string | null;
  aadhaarMasked: string | null;
  apaarId: string | null;
  apaarConsent: string;
  penNo: string | null;
  identificationMark: string | null;
  medicalNotes: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  previousSchool: string | null;
  previousBoardRollNo: string | null;
  isRte: boolean;
  admissionDate: string;
  status: string;
  leftOn: string | null;
  leavingReason: string | null;
  feeDiscountPercent: number;
  notes: string | null;
  photoUrl: string | null;
  classId: string;
  sectionId: string;
  classLabel: string;
  classTeacher: string | null;
  campus: { name: string };
  guardian: Record<string, any> | null;
  user: { id: string; username: string; isActive: boolean; lastLoginAt: string | null } | null;
  parentUser: { id: string; username: string; isActive: boolean; lastLoginAt: string | null } | null;
  transport: { route: { name: string }; stop: { name: string; pickupTime: string | null; dropTime: string | null; monthlyFee: number }; tripType: string } | null;
  siblings: Array<{ id: string; name: string; admissionNo: string; classLabel: string; status: string }>;
  consents: Array<{ id: string; purpose: string; status: string; decidedAt: string | null }>;
  promotions: Array<{ id: string; academicYear: string; result: string; createdAt: string }>;
}

interface Overview {
  attendance?: { percent: number | null; present: number; total: number; months: Array<{ month: string; present: number; absent: number; late: number; leave: number }>; recent: Array<{ date: string; status: string }> };
  fees?: { billed: number; paid: number; due: number; invoices: Array<{ id: string; invoiceNo: string; period: string; title?: string | null; dueDate: string; total: number; paidAmount: number; status: string }>; payments: Array<{ id: string; receiptNo: string; amount: number; mode: string; paidAt: string; status: string }> };
  exams?: Array<{ examId: string; examName: string; isPublished: boolean; percentage: number; grade: string | null; result: string; rank: number | null; totalObtained: number; totalMax: number; subjects: Array<{ subjectId: string; subjectName: string; marks: number | null; maxMarks: number; isAbsent: boolean; passed: boolean; grade: string | null }> }>;
  classTests?: Array<{ id: string; title: string; date: string; subject: string; marks: number | null; maxMarks: number; isAbsent: boolean }>;
  behaviour?: { ratings: Array<{ id: string; term: string; category: string; trait: string; rating: number }>; observations: Array<{ id: string; kind: string; note: string; observedOn: string; createdByName: string }> };
  library?: Array<{ id: string; issuedOn: string; dueOn: string; returnedOn: string | null; fine: number; book: { title: string; author: string | null } }>;
}

const ATT_COLORS: Record<string, string> = { PRESENT: 'bg-emerald-500', LATE: 'bg-amber-400', HALF_DAY: 'bg-amber-300', ABSENT: 'bg-rose-500', LEAVE: 'bg-sky-400', HOLIDAY: 'bg-slate-300' };

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useApp();
  const confirm = useConfirm();
  const invalidate = useInvalidate();
  const { data: s, isLoading, error, refetch } = useApiQuery<Profile>(`/api/students/${id}`);
  const { data: ov } = useApiQuery<Overview>(`/api/students/${id}/overview`);
  const [tab, setTab] = React.useState('overview');
  const [editing, setEditing] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [creds, setCreds] = React.useState<Credential[]>([]);

  if (isLoading) return <LoadingBlock />;
  if (error || !s) return <ErrorState message={error?.message ?? 'Not found'} onRetry={() => refetch()} />;

  const g = s.guardian ?? {};
  const resetLogin = async (userId: string, who: string) => {
    if (!(await confirm({ title: `Reset ${who} password?`, description: 'A new temporary password will be issued and existing sessions signed out.', confirmLabel: 'Reset', tone: 'primary' }))) return;
    try {
      setCreds([await api<Credential>(`/api/users/${userId}`, { method: 'POST' })]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <>
      <Link href="/students" className="mb-4 inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink">
        <ArrowLeft className="size-4" /> Students
      </Link>

      <Card className="mb-6 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-brand-600 via-brand-500 to-violet-500" />
        <div className="flex flex-wrap items-end gap-4 px-6 pb-5">
          <Avatar name={s.name} src={s.photoUrl} size={88} className="-mt-10 ring-4 ring-surface" />
          <div className="min-w-0 flex-1 pt-2">
            <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold">
              {s.name} <StatusBadge status={s.status} /> {s.isRte && <Badge tone="info">RTE</Badge>}
            </h1>
            <p className="text-sm text-ink-soft">
              {s.classLabel} · Adm. {s.admissionNo}
              {s.rollNo ? ` · Roll ${s.rollNo}` : ''} · {s.campus.name}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('certificates') && (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/certificates?studentId=${s.id}`}>
                  <IdCard /> Certificates
                </Link>
              </Button>
            )}
            {can('fees', 'create') && (
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/fees?tab=collect&studentId=${s.id}`}>
                  <BadgeIndianRupee /> Collect fee
                </Link>
              </Button>
            )}
            {can('students', 'edit') && (
              <Button size="sm" onClick={() => setEditing(true)}>
                <Pencil /> Edit
              </Button>
            )}
            {(can('students', 'edit') || can('students', 'delete')) && (
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="secondary" size="sm">
                    More
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem onSelect={() => window.open(`/print/admission-letter/${s.id}`, '_blank')}>
                    <Printer /> Admission letter
                  </MenuItem>
                  {can('students', 'edit') && (
                    <MenuItem onSelect={() => setStatusOpen(true)}>
                      <LogOut /> Change status / leaving
                    </MenuItem>
                  )}
                  {can('students', 'delete') && (
                    <MenuItem
                      danger
                      onSelect={async () => {
                        if (!(await confirm({ title: `Delete ${s.name}?`, description: 'Only students without fee receipts can be deleted. This cannot be undone.', confirmLabel: 'Delete permanently' }))) return;
                        try {
                          await api(`/api/students/${s.id}`, { method: 'DELETE' });
                          toast.success('Student deleted');
                          invalidate(['/api/students']);
                          router.push('/students');
                        } catch (e) {
                          toast.error((e as Error).message);
                        }
                      }}
                    >
                      <Trash2 /> Delete record
                    </MenuItem>
                  )}
                </MenuContent>
              </Menu>
            )}
          </div>
        </div>
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MiniStat icon={UserCheck} label="Attendance (session)" value={ov?.attendance?.percent != null ? `${ov.attendance.percent}%` : '—'} />
        <MiniStat icon={BadgeIndianRupee} label="Fee due" value={ov?.fees ? formatINR(ov.fees.due, true) : '—'} tone={ov?.fees && ov.fees.due > 0 ? 'danger' : undefined} />
        <MiniStat icon={GraduationCap} label="Latest result" value={ov?.exams?.length ? `${ov.exams[ov.exams.length - 1].percentage}%` : '—'} />
        <MiniStat icon={Users} label="Siblings" value={String(s.siblings.length)} />
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        tabs={[
          { value: 'overview', label: 'Profile' },
          ...(ov?.attendance ? [{ value: 'attendance', label: 'Attendance' }] : []),
          ...(ov?.fees ? [{ value: 'fees', label: 'Fees' }] : []),
          ...(ov?.exams ? [{ value: 'exams', label: 'Results' }] : []),
          ...(ov?.behaviour ? [{ value: 'behaviour', label: 'Behaviour' }] : []),
          { value: 'account', label: 'Logins & consent' },
        ]}
      >
        <TabPanel value="overview" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Personal details" />
            <CardBody>
              <KeyValue
                cols={3}
                items={[
                  ['Gender', s.gender.toLowerCase()],
                  ['Date of birth', formatDate(s.dob, 'long')],
                  ['Blood group', s.bloodGroup],
                  ['Religion', s.religion],
                  ['Category', s.category],
                  ['Caste', s.caste],
                  ['Mother tongue', s.motherTongue],
                  ['Aadhaar', s.aadhaarMasked],
                  ['UDISE+ PEN', s.penNo],
                  ['APAAR ID', s.apaarId],
                  ['Identification mark', s.identificationMark],
                  ['Medical notes', s.medicalNotes],
                ]}
              />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Academic" />
            <CardBody>
              <KeyValue
                cols={1}
                items={[
                  ['Class teacher', s.classTeacher],
                  ['Admission date', formatDate(s.admissionDate, 'long')],
                  ['Previous school', s.previousSchool],
                  ['Fee discount', s.feeDiscountPercent ? `${s.feeDiscountPercent}%` : 'None'],
                  ...(s.status !== 'ACTIVE' ? ([['Left on', `${formatDate(s.leftOn)} — ${s.leavingReason ?? ''}`]] as Array<[string, string]>) : []),
                ]}
              />
            </CardBody>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader title="Family" description={g.familyCode ? `Family ${g.familyCode}` : undefined} />
            <CardBody>
              <KeyValue
                cols={3}
                items={[
                  ["Father", g.fatherName],
                  ["Father's mobile", g.fatherPhone],
                  ["Father's occupation", g.fatherOccupation],
                  ['Mother', g.motherName],
                  ["Mother's mobile", g.motherPhone],
                  ["Mother's occupation", g.motherOccupation],
                  ['Primary mobile', g.primaryPhone],
                  ['Guardian', g.guardianName ? `${g.guardianName} (${g.guardianRelation ?? ''})` : null],
                  ['Address', [s.address, s.city, s.state, s.pincode].filter(Boolean).join(', ')],
                ]}
              />
              {s.siblings.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <p className="mb-2 text-xs font-medium text-ink-faint">Siblings in school</p>
                  <div className="flex flex-wrap gap-2">
                    {s.siblings.map((x) => (
                      <Link key={x.id} href={`/students/${x.id}`} className="rounded-xl border border-line px-3 py-2 text-sm hover:border-brand-300">
                        {x.name} <span className="text-xs text-ink-faint">· {x.classLabel}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Transport" />
            <CardBody>
              {s.transport ? (
                <KeyValue
                  cols={1}
                  items={[
                    ['Route', s.transport.route.name],
                    ['Stop', s.transport.stop.name],
                    ['Pickup / drop', `${s.transport.stop.pickupTime ?? '—'} / ${s.transport.stop.dropTime ?? '—'}`],
                    ['Monthly fare', formatINR(s.transport.stop.monthlyFee, true)],
                  ]}
                />
              ) : (
                <p className="text-sm text-ink-soft">Not using school transport.</p>
              )}
            </CardBody>
          </Card>
        </TabPanel>

        {ov?.attendance && (
          <TabPanel value="attendance" className="space-y-6">
            <Card>
              <CardHeader title="Last 30 marked days" icon={CalendarCheck} description={`${ov.attendance.present} present of ${ov.attendance.total} days this session`} />
              <CardBody>
                <div className="flex flex-wrap gap-1.5">
                  {ov.attendance.recent.map((r) => (
                    <span key={r.date} title={`${formatDate(r.date)}: ${r.status}`} className={cn('flex size-8 items-center justify-center rounded-lg text-[10px] font-semibold text-white', ATT_COLORS[r.status])}>
                      {new Date(r.date).getUTCDate()}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-ink-soft">
                  {Object.entries({ PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', LEAVE: 'Leave' }).map(([k, v]) => (
                    <span key={k} className="flex items-center gap-1.5">
                      <span className={cn('size-2.5 rounded-sm', ATT_COLORS[k])} /> {v}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Month-wise" />
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[11px] uppercase tracking-wide text-ink-faint">
                      <th className="px-5 py-2.5">Month</th>
                      <th className="px-5 py-2.5">Present</th>
                      <th className="px-5 py-2.5">Late</th>
                      <th className="px-5 py-2.5">Absent</th>
                      <th className="px-5 py-2.5">Leave</th>
                      <th className="px-5 py-2.5">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ov.attendance.months.map((m) => {
                      const t = m.present + m.late + m.absent + m.leave;
                      const pct = t ? Math.round(((m.present + m.late) / t) * 100) : 0;
                      return (
                        <tr key={m.month} className="border-b border-line/60">
                          <td className="px-5 py-2.5 font-medium">{periodLabel(m.month)}</td>
                          <td className="px-5 py-2.5">{m.present}</td>
                          <td className="px-5 py-2.5">{m.late}</td>
                          <td className="px-5 py-2.5">{m.absent}</td>
                          <td className="px-5 py-2.5">{m.leave}</td>
                          <td className="w-40 px-5 py-2.5">
                            <div className="flex items-center gap-2">
                              <Progress value={pct} tone={pct >= 75 ? 'success' : 'danger'} className="h-1.5" />
                              <span className="text-xs">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabPanel>
        )}

        {ov?.fees && (
          <TabPanel value="fees" className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Invoices" description={`Billed ${formatINR(ov.fees.billed, true)} · Paid ${formatINR(ov.fees.paid, true)}`} />
              <ul className="divide-y divide-line">
                {ov.fees.invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{periodLabel(i.period, i.title)}</p>
                      <p className="text-xs text-ink-faint">
                        {i.invoiceNo} · due {formatDate(i.dueDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatINR(i.total, true)}</p>
                      <StatusBadge status={i.status} />
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <CardHeader title="Receipts" />
              {ov.fees.payments.length === 0 ? (
                <EmptyState title="No payments yet" />
              ) : (
                <ul className="divide-y divide-line">
                  {ov.fees.payments.map((p) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                      <div>
                        <p className="font-medium">{p.receiptNo}</p>
                        <p className="text-xs text-ink-faint">
                          {formatDate(p.paidAt)} · {p.mode}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn('font-semibold', p.status === 'CANCELLED' && 'line-through opacity-60')}>{formatINR(p.amount, true)}</span>
                        <Button variant="ghost" size="icon-sm" aria-label="Print receipt" onClick={() => window.open(`/print/receipt/${p.id}`, '_blank')}>
                          <Printer />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabPanel>
        )}

        {ov?.exams && (
          <TabPanel value="exams" className="space-y-6">
            {ov.exams.length === 0 ? (
              <Card>
                <EmptyState title="No results yet" />
              </Card>
            ) : (
              ov.exams.map((e) => (
                <Card key={e.examId}>
                  <CardHeader
                    title={e.examName}
                    icon={FileText}
                    description={`${e.totalObtained} / ${e.totalMax} · ${e.percentage}% · Grade ${e.grade ?? '—'}${e.rank ? ` · Rank ${e.rank}` : ''}`}
                    actions={
                      <>
                        <StatusBadge status={e.result} />
                        <Button variant="secondary" size="sm" onClick={() => window.open(`/print/report-card?examId=${e.examId}&studentId=${s.id}`, '_blank')}>
                          <Printer /> Report card
                        </Button>
                      </>
                    }
                  />
                  <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-3">
                    {e.subjects.map((sub) => (
                      <div key={sub.subjectId} className="flex items-center justify-between bg-surface px-5 py-3 text-sm">
                        <span>{sub.subjectName}</span>
                        <span className={cn('font-semibold', !sub.passed && 'text-rose-600')}>
                          {sub.isAbsent ? 'AB' : `${sub.marks ?? '—'}/${sub.maxMarks}`} {sub.grade && <Badge tone="brand">{sub.grade}</Badge>}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            )}
          </TabPanel>
        )}

        {ov?.behaviour && (
          <TabPanel value="behaviour" className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Ratings" icon={Star} />
              {ov.behaviour.ratings.length === 0 ? (
                <EmptyState title="Not rated yet" />
              ) : (
                <ul className="divide-y divide-line">
                  {ov.behaviour.ratings.map((r) => (
                    <li key={r.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                      <span>
                        {r.trait} <span className="text-xs text-ink-faint">· {r.term.replace('_', ' ').toLowerCase()}</span>
                      </span>
                      <span className="text-amber-500">{'★'.repeat(r.rating)}<span className="text-slate-300">{'★'.repeat(5 - r.rating)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <CardHeader title="Observations" icon={MessageSquare} />
              {ov.behaviour.observations.length === 0 ? (
                <EmptyState title="No observations" />
              ) : (
                <ul className="divide-y divide-line">
                  {ov.behaviour.observations.map((o) => (
                    <li key={o.id} className="px-5 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge tone={o.kind === 'POSITIVE' ? 'success' : o.kind === 'NEGATIVE' ? 'danger' : 'neutral'}>{o.kind.toLowerCase()}</Badge>
                        <span className="text-xs text-ink-faint">
                          {formatDate(o.observedOn)} · {o.createdByName}
                        </span>
                      </div>
                      <p className="mt-1">{o.note}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </TabPanel>
        )}

        <TabPanel value="account" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Logins" icon={KeyRound} />
            <CardBody className="space-y-4">
              {[
                ['Student', s.user],
                ['Parent', s.parentUser],
              ].map(([label, u]) => {
                const acc = u as Profile['user'];
                return (
                  <div key={label as string} className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{label as string}</p>
                      <p className="text-xs text-ink-faint">{acc ? `${acc.username} · ${acc.isActive ? 'active' : 'disabled'} · last login ${acc.lastLoginAt ? formatDate(acc.lastLoginAt) : 'never'}` : 'No login'}</p>
                    </div>
                    {acc && can(label === 'Student' ? 'students' : 'guardians', 'edit') && (
                      <Button variant="secondary" size="sm" onClick={() => resetLogin(acc.id, `${label}`.toLowerCase())}>
                        <KeyRound /> Reset
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Consent records (DPDP)" />
            {s.consents.length === 0 ? (
              <EmptyState title="No consent recorded" />
            ) : (
              <ul className="divide-y divide-line">
                {s.consents.map((c) => (
                  <li key={c.id} className="flex items-center justify-between px-5 py-2.5 text-sm">
                    <span>{c.purpose.replace('_', ' ').toLowerCase()}</span>
                    <span className="flex items-center gap-2">
                      <StatusBadge status={c.status} /> <span className="text-xs text-ink-faint">{formatDate(c.decidedAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </TabPanel>
      </Tabs>

      <Dialog open={editing} onOpenChange={setEditing} title={`Edit ${s.name}`} size="xl" side>
        <EditForm profile={s} onDone={() => { setEditing(false); refetch(); invalidate(['/api/students']); }} />
      </Dialog>
      <StatusDialog open={statusOpen} onOpenChange={setStatusOpen} studentId={s.id} current={s.status} onDone={() => refetch()} />
      <CredentialsDialog credentials={creds} onClose={() => setCreds([])} title="New temporary password" />
    </>
  );
}

function MiniStat({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: string; tone?: 'danger' }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className={cn('flex size-10 items-center justify-center rounded-xl', tone === 'danger' ? 'bg-rose-50 text-rose-600 dark:bg-rose-500/10' : 'bg-brand-50 text-brand-600 dark:bg-brand-500/10')}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs text-ink-faint">{label}</p>
        <p className={cn('text-lg font-bold', tone === 'danger' && 'text-rose-600')}>{value}</p>
      </div>
    </Card>
  );
}

function EditForm({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const [submitting, setSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const g = profile.guardian ?? {};
  const initial = {
    ...profile,
    dob: profile.dob?.slice(0, 10) ?? '',
    admissionDate: profile.admissionDate?.slice(0, 10) ?? '',
    aadhaar: '',
    ...Object.fromEntries(Object.entries(g).filter(([k]) => !['id', 'schoolId', 'userId', 'createdAt', 'updatedAt'].includes(k))),
    address: profile.address ?? g.address ?? '',
  };
  return (
    <StudentForm
      mode="edit"
      initial={initial}
      submitting={submitting}
      errors={errors}
      onSubmit={async (v) => {
        setSubmitting(true);
        setErrors({});
        try {
          const { student, guardian } = splitStudentForm(v, 'edit');
          await api(`/api/students/${profile.id}`, { method: 'PUT', body: student });
          if (g.id) {
            const { primaryPhone: _p, ...rest } = guardian;
            await api(`/api/guardians/${g.id}`, { method: 'PUT', body: rest }).catch((e: ApiError) => {
              if (e.status !== 403) throw e;
            });
          }
          toast.success('Student updated');
          onDone();
        } catch (e) {
          if (e instanceof ApiError && e.details) setErrors(e.details);
          toast.error((e as Error).message);
        } finally {
          setSubmitting(false);
        }
      }}
    />
  );
}

function StatusDialog({ open, onOpenChange, studentId, current, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; studentId: string; current: string; onDone: () => void }) {
  const [status, setStatus] = React.useState(current === 'ACTIVE' ? 'TRANSFERRED' : 'ACTIVE');
  const [leftOn, setLeftOn] = React.useState(todayISO());
  const [reason, setReason] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change student status"
      description="Leaving students keep their history; their logins are disabled automatically."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api(`/api/students/${studentId}/status`, { method: 'POST', body: { status, leftOn, reason } });
                toast.success('Status updated');
                onOpenChange(false);
                onDone();
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setSaving(false);
              }
            }}
          >
            Update
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="New status">
          <Select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[
              { value: 'ACTIVE', label: 'Active (re-admit)' },
              { value: 'TRANSFERRED', label: 'Transferred — issue TC' },
              { value: 'PASSED_OUT', label: 'Passed out' },
              { value: 'DROPPED', label: 'Dropped out' },
              { value: 'INACTIVE', label: 'Inactive (temporary)' },
            ]}
          />
        </Field>
        {status !== 'ACTIVE' && (
          <>
            <Field label="Leaving date">
              <Input type="date" value={leftOn} onChange={(e) => setLeftOn(e.target.value)} />
            </Field>
            <Field label="Reason">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Family relocated to Delhi" />
            </Field>
          </>
        )}
      </div>
    </Dialog>
  );
}
