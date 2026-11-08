'use client';

import * as React from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { BadgeIndianRupee, BookOpen, Bus, Check, Crown, DoorOpen, GraduationCap, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ScreenId } from '../../content/screens.generated';
import { BrowserFrame, PhoneFrame, isMobileScreen } from '../screen-frame';
import { SectionHeading } from '../section';

const ROLES: { key: string; label: string; icon: LucideIcon; screen: ScreenId; screenTitle: string; headline: string; points: string[] }[] = [
  { key: 'owner', label: 'Owner', icon: Crown, screen: '03-dashboard-admin', screenTitle: 'Owner dashboard', headline: 'The whole school on one screen.', points: ['Collection vs billing, every day', 'Admissions pipeline and approvals', 'Income vs expense and audit trail'] },
  { key: 'principal', label: 'Principal', icon: ShieldCheck, screen: '31-results', screenTitle: 'Results analysis', headline: 'Academics and discipline under control.', points: ['Results, averages and pass rates', 'Leave approvals and staff attendance', 'Discipline and gate-pass oversight'] },
  { key: 'teacher', label: 'Teacher', icon: BookOpen, screen: '04-dashboard-teacher', screenTitle: 'Teacher dashboard', headline: 'More teaching, less admin.', points: ['Today’s periods and class-teacher section', 'Attendance in under a minute', 'Homework, marks and remarks'] },
  { key: 'accountant', label: 'Accountant', icon: BadgeIndianRupee, screen: '35-fees-collect', screenTitle: 'Fee counter', headline: 'A fee counter that never queues.', points: ['Collect for all siblings at once', 'Receipts, day-book and Tally export', 'Defaulter reminders in one click'] },
  { key: 'office', label: 'Front office', icon: DoorOpen, screen: '06-admissions', screenTitle: 'Admissions pipeline', headline: 'Every enquiry and visitor, handled.', points: ['Enquiry CRM with follow-ups', 'Visitor passes and gate passes', 'Certificates with QR verification'] },
  { key: 'parent', label: 'Parent', icon: Users, screen: '05-dashboard-parent-mobile', screenTitle: 'Parent app', headline: 'Their child’s day, in their pocket.', points: ['Attendance, homework and results', 'Pay fees by UPI in seconds', 'Live bus location and ETA'] },
  { key: 'student', label: 'Student', icon: GraduationCap, screen: '26-homework-student-mobile', screenTitle: 'Student homework', headline: 'Learning that follows them home.', points: ['Homework submitted from the phone', 'Study material and live classes', 'Online exams and results'] },
  { key: 'driver', label: 'Driver', icon: Bus, screen: '70-driver-mobile', screenTitle: 'Driver app', headline: 'One tap to start the trip.', points: ['Start and end trips from the phone', 'Parents see the bus live', 'No extra hardware needed'] },
];

export function RoleShowcase() {
  const [active, setActive] = React.useState(0);
  const role = ROLES[active];
  const mobile = isMobileScreen(role.screen);

  return (
    <section className="web-container py-20 lg:py-28">
      <SectionHeading eyebrow="Built for everyone" title="A tailored experience for every role" lead="Each person signs in to the same Vidyalaya and lands on a home screen made for their job — nothing more, nothing less." />

      <div className="mt-14 grid gap-8 lg:grid-cols-[18rem_1fr] lg:gap-12">
        <LayoutGroup id="roles">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0" role="tablist" aria-label="Roles">
            {ROLES.map((r, i) => (
              <button
                key={r.key}
                type="button"
                role="tab"
                aria-selected={i === active}
                onClick={() => setActive(i)}
                className={cn('relative flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors', i === active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}
              >
                {i === active && <motion.span layoutId="role-pill" className="absolute inset-0 rounded-2xl bg-white dark:bg-slate-900 shadow-lg shadow-slate-900/5 ring-1 ring-slate-200 dark:ring-white/10" transition={{ type: 'spring', stiffness: 380, damping: 32 }} />}
                <span className={cn('relative flex size-9 items-center justify-center rounded-xl transition-colors', i === active ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/30' : 'bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400')}>
                  <r.icon className="size-4" />
                </span>
                <span className="relative text-sm font-semibold">{r.label}</span>
              </button>
            ))}
          </div>
        </LayoutGroup>

        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-50 dark:from-indigo-950/40 via-white dark:via-slate-950 to-fuchsia-50 dark:to-fuchsia-950/30 p-6 ring-1 ring-slate-200/70 dark:ring-white/10 sm:p-10">
          <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
          <AnimatePresence mode="wait">
            <motion.div key={role.key} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.35, ease: 'easeOut' }} className={cn('relative grid items-center gap-8', mobile ? 'md:grid-cols-[1fr_16rem]' : 'xl:grid-cols-[17rem_1fr]')}>
              <div className={cn(mobile && 'md:order-first')}>
                <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{role.label}</p>
                <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{role.headline}</h3>
                <ul className="mt-5 space-y-3">
                  {role.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-600/15 dark:ring-emerald-400/20">
                        <Check className="size-3.5" strokeWidth={3} />
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              {mobile ? <PhoneFrame id={role.screen} alt={role.screenTitle} className="mx-auto w-[min(15rem,75%)]" sizes="240px" /> : <BrowserFrame id={role.screen} alt={role.screenTitle} sizes="(min-width: 1280px) 620px, 90vw" />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
