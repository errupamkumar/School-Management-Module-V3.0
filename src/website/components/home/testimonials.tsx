'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Quote, Star, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TESTIMONIALS } from '../../content/placeholder';
import { SectionHeading } from '../section';

const TONES = ['from-rose-400 to-orange-400', 'from-indigo-400 to-violet-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-sky-400 to-blue-500'];
const initials = (name: string) =>
  name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2);

export function Testimonials() {
  const reduce = useReducedMotion();
  const [[i, dir], set] = React.useState<[number, number]>([0, 1]);
  const [hover, setHover] = React.useState(false);
  const go = React.useCallback((d: number) => set(([x]) => [(x + d + TESTIMONIALS.length) % TESTIMONIALS.length, d]), []);

  React.useEffect(() => {
    if (hover || reduce) return;
    const t = setTimeout(() => go(1), 7000);
    return () => clearTimeout(t);
  }, [i, hover, reduce, go]);

  const t = TESTIMONIALS[i];
  return (
    <section className="relative overflow-hidden py-20 lg:py-28">
      <div className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-96 -translate-y-1/2 bg-gradient-to-r from-indigo-100/60 via-fuchsia-100/50 to-amber-100/50 blur-3xl" aria-hidden="true" />
      <div className="web-container">
        <SectionHeading eyebrow="Loved by schools" title="Principals, accountants and teachers say it best" />
        <div className="relative mx-auto mt-14 max-w-4xl" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
          <div className="web-card relative overflow-hidden p-8 sm:p-12">
            <Quote className="absolute right-8 top-8 size-16 text-indigo-100 dark:text-indigo-500/20" aria-hidden="true" />
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.figure key={i} custom={dir} initial={{ opacity: 0, x: dir * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: dir * -40 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
                <div className="flex gap-0.5" aria-label="5 out of 5">
                  {Array.from({ length: 5 }).map((_, k) => (
                    <Star key={k} className="size-5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <blockquote className="relative mt-6 font-display text-xl font-semibold leading-relaxed text-slate-800 dark:text-slate-100 sm:text-2xl">“{t.quote}”</blockquote>
                <figcaption className="mt-8 flex flex-wrap items-center gap-4">
                  <span className={cn('flex size-12 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white', TONES[i % TONES.length])}>{initials(t.name)}</span>
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-white">{t.name}</span>
                    <span className="block text-sm text-slate-500 dark:text-slate-400">
                      {t.role}, {t.school}
                    </span>
                  </span>
                  <span className="ml-auto flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-600/15 dark:ring-emerald-400/20">
                    <TrendingUp className="size-3.5" /> {t.metric}
                  </span>
                </figcaption>
              </motion.figure>
            </AnimatePresence>
          </div>
          <div className="mt-6 flex items-center justify-center gap-3">
            <button type="button" onClick={() => go(-1)} className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 hover:text-indigo-700 dark:hover:text-indigo-300" aria-label="Previous testimonial">
              <ChevronLeft className="size-5" />
            </button>
            <div className="flex gap-2">
              {TESTIMONIALS.map((x, k) => (
                <button key={x.name} type="button" onClick={() => set([k, k > i ? 1 : -1])} aria-label={`Testimonial ${k + 1}`} aria-current={k === i} className={cn('h-2 rounded-full transition-all', k === i ? 'w-8 bg-indigo-600' : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400')} />
              ))}
            </div>
            <button type="button" onClick={() => go(1)} className="flex size-10 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 hover:text-indigo-700 dark:hover:text-indigo-300" aria-label="Next testimonial">
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
