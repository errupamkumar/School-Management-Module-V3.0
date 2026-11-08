'use client';

import { motion } from 'motion/react';
import { BadgeIndianRupee, Bell, BookOpen, Briefcase, Bus, ClipboardCheck, Crown, DoorOpen, GraduationCap, Library, Package, ShieldCheck, UserRound, Users, Wrench, Zap, type LucideIcon } from 'lucide-react';
import { ROLES, ROLE_LABELS } from '@/lib/modules';
import { FACTS } from '../../content/site';
import { LogoMark } from '../logo';
import { Reveal } from '../motion';

const ROLE_ICONS: Record<(typeof ROLES)[number], LucideIcon> = {
  SUPER_ADMIN: Crown,
  ADMIN: ShieldCheck,
  TEACHER: BookOpen,
  ACCOUNTANT: BadgeIndianRupee,
  RECEPTIONIST: DoorOpen,
  LIBRARIAN: Library,
  TRANSPORT_MANAGER: Bus,
  STORE_MANAGER: Package,
  STAFF: Wrench,
  PARENT: Users,
  STUDENT: GraduationCap,
};

const SHORT: Partial<Record<(typeof ROLES)[number], string>> = { SUPER_ADMIN: 'Owner', ADMIN: 'Principal', RECEPTIONIST: 'Front office', TRANSPORT_MANAGER: 'Transport', STORE_MANAGER: 'Store', STAFF: 'Staff' };

const OUTER: LucideIcon[] = [ClipboardCheck, Bell, Briefcase, Zap, UserRound, BookOpen, BadgeIndianRupee, Bus];

function point(i: number, n: number, r: number) {
  const a = (i / n) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + r * Math.cos(a), y: 50 + r * Math.sin(a) };
}

export function PlatformOrbit() {
  const roles = ROLES;
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 text-white lg:py-28">
      <div className="web-grid-bg-dark web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 size-[44rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/20 blur-[120px]" aria-hidden="true" />
      <div className="web-container relative grid items-center gap-16 lg:grid-cols-[1fr_1.1fr]">
        <Reveal>
          <p className="web-eyebrow bg-white/10 text-indigo-100 ring-white/15">One connected platform</p>
          <h2 className="web-h2 mt-4 text-white">Every role. One source of truth.</h2>
          <p className="web-lead mt-4 text-slate-300">
            When the accountant records a payment, the parent gets the receipt, the owner’s dashboard updates and the ledger balances — instantly. Vidyalaya connects all {FACTS.roles} roles in your school to the same live data, and each one sees only what they should.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {[
              ['Real-time everywhere', 'Attendance, fees and results update for every role the moment they are saved.'],
              ['Role-based views', 'Menus, dashboards and data are shaped by each person’s role and rights.'],
              ['One login per person', 'Parents switch between children; staff use the same app on phone and laptop.'],
              ['Nothing to install', 'Runs in the browser and installs like an app on Android, iPhone and desktop.'],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <p className="font-semibold text-white">{t}</p>
                <p className="mt-1 text-sm text-slate-400">{d}</p>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1} className="relative mx-auto aspect-square w-full max-w-[34rem]">
          {/* Rings */}
          <div className="absolute inset-[6%] rounded-full border border-dashed border-white/10" aria-hidden="true" />
          <div className="absolute inset-[22%] rounded-full border border-white/10" aria-hidden="true" />
          <motion.div className="absolute inset-[36%] rounded-full bg-indigo-500/10" animate={{ scale: [1, 1.18, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeOut' }} aria-hidden="true" />

          {/* Outer ring of module icons */}
          <motion.div className="absolute inset-0" animate={{ rotate: 360 }} transition={{ duration: 90, repeat: Infinity, ease: 'linear' }} aria-hidden="true">
            {OUTER.map((Icon, i) => {
              const p = point(i, OUTER.length, 44);
              return (
                <span key={i} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  <motion.span className="flex size-8 items-center justify-center rounded-full bg-white/5 text-indigo-200 ring-1 ring-white/10 sm:size-9" animate={{ rotate: -360 }} transition={{ duration: 90, repeat: Infinity, ease: 'linear' }}>
                    <Icon className="size-4" />
                  </motion.span>
                </span>
              );
            })}
          </motion.div>

          {/* Role ring with data-flow lines */}
          <motion.div className="absolute inset-0" animate={{ rotate: -360 }} transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}>
            <svg viewBox="0 0 100 100" className="absolute inset-0 size-full" aria-hidden="true">
              <defs>
                <linearGradient id="orbit-line" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#818cf8" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#e879f9" stopOpacity="0.4" />
                </linearGradient>
              </defs>
              {roles.map((r, i) => {
                const p = point(i, roles.length, 31);
                return (
                  <motion.line
                    key={r}
                    x1="50"
                    y1="50"
                    x2={p.x}
                    y2={p.y}
                    stroke="url(#orbit-line)"
                    strokeWidth="0.35"
                    strokeDasharray="1.2 1.6"
                    animate={{ strokeDashoffset: [0, -5.6] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'linear', delay: i * 0.12 }}
                  />
                );
              })}
            </svg>
            {roles.map((r, i) => {
              const p = point(i, roles.length, 31);
              const Icon = ROLE_ICONS[r];
              return (
                <div key={r} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
                  {/* Counter-rotates so icons stay upright; the label hangs below the icon's centre. */}
                  <motion.div className="relative flex size-10 items-center justify-center sm:size-12" animate={{ rotate: 360 }} transition={{ duration: 140, repeat: Infinity, ease: 'linear' }}>
                    <span className="flex size-full items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-900/50 ring-1 ring-white/20">
                      <Icon className="size-4 sm:size-5" />
                    </span>
                    <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/80 px-2 py-0.5 text-[10px] font-semibold text-slate-200 ring-1 ring-white/10 max-[420px]:hidden sm:text-[11px]">{SHORT[r] ?? ROLE_LABELS[r]}</span>
                  </motion.div>
                </div>
              );
            })}
          </motion.div>

          {/* Core */}
          <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
            <div className="relative flex size-24 items-center justify-center rounded-[1.75rem] bg-white/5 ring-1 ring-white/15 backdrop-blur sm:size-28">
              <div className="absolute inset-0 rounded-[1.75rem] bg-gradient-to-br from-indigo-500/30 to-fuchsia-500/20 blur-xl" aria-hidden="true" />
              <LogoMark className="relative size-14 sm:size-16" />
            </div>
            <p className="mt-2 font-display text-sm font-bold tracking-tight">Vidyalaya</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
