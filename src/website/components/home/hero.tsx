'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ArrowRight, BadgeIndianRupee, Bus, CalendarCheck, CheckCircle2, ChevronRight, PlayCircle, Star } from 'lucide-react';
import { FACTS, SITE } from '../../content/site';
import { ADOPTION } from '../../content/placeholder';
import { BrowserFrame, PhoneFrame } from '../screen-frame';

const EASE = [0.22, 1, 0.36, 1] as const;

function FloatingCard({ className, delay, children }: { className: string; delay: number; children: React.ReactNode }) {
  return (
    <motion.div
      className={`absolute z-20 ${className}`}
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5 + delay, repeat: Infinity, ease: 'easeInOut' }}
        className="flex items-center gap-3 rounded-2xl border border-white/60 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 p-3 pr-4 shadow-xl shadow-slate-900/10 backdrop-blur-md"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

const AVATARS = [
  ['MK', 'from-rose-400 to-orange-400'],
  ['RV', 'from-indigo-400 to-violet-500'],
  ['FS', 'from-emerald-400 to-teal-500'],
  ['AC', 'from-amber-400 to-orange-500'],
] as const;

export function Hero() {
  const ref = React.useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 120, damping: 20 });
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 });
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const lift = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const phoneLift = useTransform(scrollYProgress, [0, 1], [0, -150]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <section ref={ref} className="relative -mt-16 overflow-hidden pt-16 lg:-mt-[4.5rem] lg:pt-[4.5rem]">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 dark:from-indigo-950/40 via-white dark:via-slate-950 to-white dark:to-slate-950" aria-hidden="true" />
      <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <motion.div
        className="pointer-events-none absolute -left-32 top-10 -z-10 size-[28rem] rounded-full bg-indigo-300/30 blur-3xl"
        animate={{ x: [0, 40, 0], y: [0, 30, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />
      <motion.div
        className="pointer-events-none absolute -right-20 top-40 -z-10 size-[32rem] rounded-full bg-fuchsia-300/25 blur-3xl"
        animate={{ x: [0, -50, 0], y: [0, -20, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
        aria-hidden="true"
      />

      <div className="web-container grid items-center gap-14 pb-20 pt-12 lg:grid-cols-[1fr_1.15fr] lg:gap-10 lg:pb-28 lg:pt-20">
        {/* Copy */}
        <div className="relative z-10 text-center lg:text-left">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }}>
            <Link href="/features/transport" className="group inline-flex items-center gap-2 rounded-full bg-white/80 dark:bg-slate-900/80 py-1 pl-1 pr-3 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 backdrop-blur transition hover:ring-indigo-300 dark:hover:ring-indigo-400/50">
              <span className="rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 px-2.5 py-0.5 font-semibold text-white">New</span>
              Live bus tracking with arrival time for parents
              <ChevronRight className="size-3.5 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600" />
            </Link>
          </motion.div>

          <motion.h1
            className="mt-6 font-display text-[2.6rem] font-extrabold leading-[1.05] tracking-tight text-slate-900 dark:text-white sm:text-6xl lg:text-[4.1rem]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.05 }}
          >
            One app to run your <span className="web-text-gradient">entire school.</span>
          </motion.h1>

          <motion.p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-slate-600 dark:text-slate-300 lg:mx-0" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.15 }}>
            Admissions to alumni — fees, attendance, exams, transport, hostel and payroll, with a parent app in {FACTS.languages} Indian languages. Built for CBSE, ICSE and State Board schools.
          </motion.p>

          <motion.div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.25 }}>
            <Link href={SITE.signupHref} className="web-btn web-btn-primary w-full px-7 py-3.5 text-base sm:w-auto">
              Start free trial <ArrowRight />
            </Link>
            <Link href={`${SITE.signupHref}?interest=demo`} className="web-btn web-btn-secondary w-full px-7 py-3.5 text-base sm:w-auto">
              <PlayCircle className="text-indigo-600 dark:text-indigo-400" /> Book a live demo
            </Link>
          </motion.div>
          <motion.p className="mt-4 text-sm text-slate-500 dark:text-slate-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            Already using Vidyalaya?{' '}
            <Link href={SITE.loginHref} className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
              Log in to your school →
            </Link>
          </motion.p>

          <motion.div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.45 }}>
            <div className="flex -space-x-2.5">
              {AVATARS.map(([initials, color]) => (
                <span key={initials} className={`flex size-10 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white ring-[3px] ring-white dark:ring-slate-950 ${color}`}>
                  {initials}
                </span>
              ))}
            </div>
            <div className="text-sm">
              <div className="flex items-center justify-center gap-0.5 sm:justify-start" aria-label={`Rated ${ADOPTION.rating} out of 5`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1.5 font-semibold text-slate-800 dark:text-slate-100">{ADOPTION.rating}/5</span>
              </div>
              <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                Trusted by <span className="font-semibold text-slate-800 dark:text-slate-100">{ADOPTION.schools.toLocaleString('en-IN')}+ schools</span> across India
              </p>
            </div>
          </motion.div>
        </div>

        {/* Product composition */}
        <div className="relative mx-auto w-full max-w-2xl [perspective:1600px] lg:max-w-none" onMouseMove={onMove} onMouseLeave={onLeave}>
          <motion.div style={{ y: lift }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }}>
            <motion.div style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }} className="relative">
              <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-indigo-500/20 via-violet-500/10 to-fuchsia-500/20 blur-2xl" aria-hidden="true" />
              <BrowserFrame id="03-dashboard-admin" alt="Owner dashboard" priority aspect="wide" sizes="(min-width: 1024px) 640px, 92vw" />
            </motion.div>
          </motion.div>

          <motion.div className="absolute -bottom-10 -left-2 z-10 w-[30%] min-w-[7.5rem] max-w-[11.5rem] sm:-left-8 lg:-left-14" style={{ y: phoneLift }} initial={{ opacity: 0, x: -30, rotate: -8 }} animate={{ opacity: 1, x: 0, rotate: -6 }} transition={{ duration: 0.9, ease: EASE, delay: 0.45 }}>
            <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}>
              <PhoneFrame id="05-dashboard-parent-mobile" alt="Parent app home" priority sizes="190px" />
            </motion.div>
          </motion.div>

          <FloatingCard className="-right-2 -top-6 sm:-right-6" delay={0.7}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
              <BadgeIndianRupee className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">₹12,500 received</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">UPI · Class 7-B · receipt sent</span>
            </span>
          </FloatingCard>
          <FloatingCard className="-right-2 bottom-16 hidden sm:flex sm:-right-8" delay={0.95}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
              <CalendarCheck className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Attendance saved</span>
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <CheckCircle2 className="size-3 text-emerald-500" /> Parents of 2 absentees alerted
              </span>
            </span>
          </FloatingCard>
          <FloatingCard className="left-1/3 -bottom-14 hidden md:flex" delay={1.2}>
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-white">
              <Bus className="size-5" />
            </span>
            <span>
              <span className="block text-sm font-bold text-slate-900 dark:text-white">Bus 4 · 6 min away</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">1.8 km from Sector 12 stop</span>
            </span>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
