'use client';

import { motion } from 'motion/react';
import { BadgeIndianRupee, CalendarCheck, TrendingUp, UserPlus, Wallet } from 'lucide-react';
import { CountUp, Reveal } from '../motion';
import { SectionHeading } from '../section';

const EASE = [0.22, 1, 0.36, 1] as const;
const VIEW = { once: true, margin: '-80px' } as const;

// Illustrative figures in the shape of the Vidyalaya demo school's dashboard.
const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep'];
const BILLED = [7.2, 6.4, 6.6, 8.1, 7.0, 7.6];
const COLLECTED = [5.9, 5.8, 6.1, 7.9, 6.6, 7.4];
const FUNNEL = [
  { stage: 'Enquiries', value: 240 },
  { stage: 'Applied', value: 182 },
  { stage: 'Test scheduled', value: 131 },
  { stage: 'Seat offered', value: 96 },
  { stage: 'Admitted', value: 81 },
];
const MODES = [
  { mode: 'UPI', pct: 42, color: 'bg-indigo-500' },
  { mode: 'Cash', pct: 24, color: 'bg-emerald-500' },
  { mode: 'Card', pct: 13, color: 'bg-amber-400' },
  { mode: 'Cheque', pct: 11, color: 'bg-rose-400' },
  { mode: 'Bank transfer', pct: 7, color: 'bg-sky-500' },
  { mode: 'Online', pct: 3, color: 'bg-fuchsia-500' },
];

const W = 640;
const H = 220;
const PAD = 18;

function toPoints(values: number[], max: number) {
  return values.map((v, i) => ({ x: PAD + (i * (W - PAD * 2)) / (values.length - 1), y: H - PAD - (v / max) * (H - PAD * 2) }));
}

/** Smooth curve through points (Catmull-Rom to cubic Bézier). */
function smooth(points: { x: number; y: number }[]) {
  return points.reduce((d, p, i, a) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const p0 = a[i - 2] ?? a[i - 1];
    const p1 = a[i - 1];
    const p2 = p;
    const p3 = a[i + 1] ?? p;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    return `${d} C${c1.x},${c1.y} ${c2.x},${c2.y} ${p2.x},${p2.y}`;
  }, '');
}

function FeeChart() {
  const max = 9;
  const billed = toPoints(BILLED, max);
  const collected = toPoints(COLLECTED, max);
  const line = smooth(collected);
  const area = `${line} L${collected[collected.length - 1].x},${H - PAD} L${collected[0].x},${H - PAD} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 26}`} className="w-full" role="img" aria-label="Fee collected versus billed over six months">
      <defs>
        <linearGradient id="fee-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6366f1" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} x2={W - PAD} y1={PAD + f * (H - PAD * 2)} y2={PAD + f * (H - PAD * 2)} className="stroke-slate-200 dark:stroke-white/10" strokeDasharray="3 4" />
      ))}
      <motion.path d={smooth(billed)} fill="none" className="stroke-slate-300 dark:stroke-slate-600" strokeWidth="2.5" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 1.4, ease: 'easeInOut' }} />
      <motion.path d={area} fill="url(#fee-area)" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={VIEW} transition={{ duration: 0.8, delay: 1 }} />
      <motion.path d={line} fill="none" stroke="#6366f1" strokeWidth="3.5" strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={VIEW} transition={{ duration: 1.6, ease: 'easeInOut' }} />
      {collected.map((p, i) => (
        <motion.circle key={i} cx={p.x} cy={p.y} r="5" className="fill-white dark:fill-slate-900" stroke="#6366f1" strokeWidth="3" initial={{ scale: 0 }} whileInView={{ scale: 1 }} viewport={VIEW} transition={{ delay: 0.3 + i * 0.22, type: 'spring', stiffness: 300 }} />
      ))}
      {MONTHS.map((m, i) => (
        <text key={m} x={collected[i].x} y={H + 18} textAnchor="middle" fontSize="13" className="fill-slate-400">
          {m}
        </text>
      ))}
    </svg>
  );
}

function AttendanceRing({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto size-44">
      <svg viewBox="0 0 128 128" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#10b981" />
            <stop offset="1" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={r} fill="none" className="stroke-emerald-50 dark:stroke-emerald-500/10" strokeWidth="12" />
        <motion.circle cx="64" cy="64" r={r} fill="none" stroke="url(#ring-grad)" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - pct / 100) }} viewport={VIEW} transition={{ duration: 1.6, ease: EASE }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="font-display text-4xl font-extrabold text-slate-900 dark:text-white">
          <CountUp to={pct} decimals={1} suffix="%" />
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">present today</p>
      </div>
    </div>
  );
}

export function Insights() {
  const max = FUNNEL[0].value;
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white dark:from-slate-950 via-slate-50/80 dark:via-slate-900/40 to-white dark:to-slate-950 py-20 lg:py-28">
      <div className="web-container">
        <SectionHeading eyebrow="Insight, not paperwork" title={<>Your whole school, <span className="web-text-gradient">at a glance</span></>} lead="Every number on these charts is something Vidyalaya calculates for you from day-to-day work — no spreadsheets, no month-end scramble." />

        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="web-card h-full p-6 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                    <BadgeIndianRupee className="size-5" />
                  </span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">Fee collection</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Collected vs billed · last six months (₹ lakh)</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                    <span className="h-1 w-4 rounded-full bg-indigo-500" /> Collected
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <span className="h-1 w-4 rounded-full bg-slate-300 dark:bg-slate-600" /> Billed
                  </span>
                </div>
              </div>
              <div className="mt-6">
                <FeeChart />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-slate-100 dark:border-white/10 pt-5 text-center sm:text-left">
                <div>
                  <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                    ₹<CountUp to={39.7} decimals={1} />L
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">collected</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-extrabold text-slate-900 dark:text-white">
                    <CountUp to={92.4} decimals={1} suffix="%" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">collection rate</p>
                </div>
                <div>
                  <p className="flex items-center justify-center gap-1 font-display text-2xl font-extrabold text-emerald-600 sm:justify-start">
                    <TrendingUp className="size-5" />
                    <CountUp to={18} suffix="%" />
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">more paid online</p>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="web-card flex h-full flex-col p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600">
                  <CalendarCheck className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Attendance today</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">25 of 25 sections marked</p>
                </div>
              </div>
              <div className="my-auto py-6">
                <AttendanceRing pct={94.2} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                {[
                  ['183', 'Present', 'text-emerald-600'],
                  ['8', 'Absent', 'text-rose-600'],
                  ['3', 'On leave', 'text-amber-600'],
                ].map(([v, l, c]) => (
                  <div key={l} className="rounded-xl bg-slate-50 dark:bg-white/[0.04] py-2">
                    <p className={`text-base font-bold ${c}`}>{v}</p>
                    <p className="text-slate-500 dark:text-slate-400">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.05}>
            <div className="web-card h-full p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-500/10 text-violet-600">
                  <UserPlus className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">Admissions funnel</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">This admission season</p>
                </div>
              </div>
              <ul className="mt-6 space-y-3.5">
                {FUNNEL.map((f, i) => (
                  <li key={f.stage}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-slate-600 dark:text-slate-300">{f.stage}</span>
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{f.value}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" initial={{ width: 0 }} whileInView={{ width: `${(f.value / max) * 100}%` }} viewport={VIEW} transition={{ duration: 1, ease: EASE, delay: i * 0.12 }} />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.15} className="lg:col-span-2">
            <div className="web-card h-full p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600">
                  <Wallet className="size-5" />
                </span>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">How parents pay</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Payment modes this month — every rupee lands in one ledger</p>
                </div>
              </div>
              <div className="mt-8 flex h-5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10">
                {MODES.map((m, i) => (
                  <motion.div key={m.mode} className={`${m.color} h-full first:rounded-l-full last:rounded-r-full`} initial={{ width: 0 }} whileInView={{ width: `${m.pct}%` }} viewport={VIEW} transition={{ duration: 0.9, ease: EASE, delay: 0.2 + i * 0.1 }} title={`${m.mode} ${m.pct}%`} />
                ))}
              </div>
              <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {MODES.map((m) => (
                  <li key={m.mode} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.04] px-3 py-2.5">
                    <span className={`size-2.5 rounded-full ${m.color}`} />
                    <span className="text-sm text-slate-600 dark:text-slate-300">{m.mode}</span>
                    <span className="ml-auto text-sm font-bold tabular-nums text-slate-900 dark:text-white">{m.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
        <p className="mt-6 text-center text-xs text-slate-400">Illustrative figures in the style of the Vidyalaya demo school’s dashboards.</p>
      </div>
    </section>
  );
}
