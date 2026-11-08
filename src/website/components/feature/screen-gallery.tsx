'use client';

import * as React from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SCREENS, type ScreenId } from '../../content/screens.generated';
import { BrowserFrame, PhoneFrame } from '../screen-frame';

export function ScreenGallery({ screens }: { screens: { id: ScreenId; title: string }[] }) {
  const [[i, dir], set] = React.useState<[number, number]>([0, 1]);
  const go = (to: number) => set([(to + screens.length) % screens.length, to > i ? 1 : -1]);
  const s = screens[i];
  const meta = SCREENS[s.id];

  return (
    <div
      className="grid gap-8 lg:grid-cols-[1fr_20rem] lg:gap-10"
      role="region"
      aria-roledescription="carousel"
      aria-label="Screens"
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(i + 1);
        if (e.key === 'ArrowLeft') go(i - 1);
      }}
    >
      <div className="relative flex min-h-[18rem] items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-100 dark:from-slate-900 via-white dark:via-slate-950 to-indigo-50 dark:to-indigo-950/30 p-4 ring-1 ring-slate-200/70 dark:ring-white/10 sm:p-8">
        <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
        <AnimatePresence mode="popLayout" custom={dir} initial={false}>
          <motion.div
            key={s.id}
            custom={dir}
            initial={{ opacity: 0, x: dir * 50, scale: 0.97 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: dir * -50, scale: 0.97 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            drag={screens.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, { offset }) => {
              if (offset.x < -70) go(i + 1);
              else if (offset.x > 70) go(i - 1);
            }}
            className={cn('relative w-full', meta.mobile ? 'max-w-[16rem]' : 'max-w-4xl', screens.length > 1 && 'cursor-grab active:cursor-grabbing')}
          >
            {meta.mobile ? <PhoneFrame id={s.id} alt={s.title} sizes="260px" /> : <BrowserFrame id={s.id} alt={s.title} aspect="none" sizes="(min-width: 1024px) 860px, 92vw" />}
          </motion.div>
        </AnimatePresence>
        {screens.length > 1 && (
          <>
            <button type="button" onClick={() => go(i - 1)} className="absolute left-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md ring-1 ring-slate-200 dark:ring-white/10 backdrop-blur hover:text-indigo-700 dark:hover:text-indigo-300" aria-label="Previous screen">
              <ChevronLeft className="size-5" />
            </button>
            <button type="button" onClick={() => go(i + 1)} className="absolute right-3 top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 dark:bg-slate-900/90 text-slate-700 dark:text-slate-200 shadow-md ring-1 ring-slate-200 dark:ring-white/10 backdrop-blur hover:text-indigo-700 dark:hover:text-indigo-300" aria-label="Next screen">
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      <div className="flex flex-col">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={s.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }}>
            <p className="font-mono text-xs text-slate-400">
              Screen {i + 1} of {screens.length}
            </p>
            <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">{s.title}</h3>
            {meta.notes.length > 0 && (
              <ol className="mt-5 space-y-2.5">
                {meta.notes.map((n, k) => (
                  <li key={n} className="flex gap-3 text-sm text-slate-600 dark:text-slate-300">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">{k + 1}</span>
                    {n}
                  </li>
                ))}
              </ol>
            )}
          </motion.div>
        </AnimatePresence>
        {screens.length > 1 && (
          <div className="mt-8 grid grid-cols-3 gap-2 lg:mt-auto lg:pt-8">
            {screens.map((x, k) => {
              const m = SCREENS[x.id];
              return (
                <button key={x.id} type="button" onClick={() => go(k)} aria-label={`Show ${x.title}`} aria-current={k === i} className={cn('group relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 dark:bg-white/10 ring-2 transition', k === i ? 'ring-indigo-600' : 'ring-transparent hover:ring-slate-300 dark:hover:ring-white/25')}>
                  <Image src={m.src} alt="" width={m.width} height={m.height} sizes="120px" className={cn('h-full w-full object-cover', m.mobile ? 'object-top' : 'object-left-top')} />
                  {k !== i && <span className="absolute inset-0 bg-white/30 transition group-hover:bg-transparent" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
        <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
          <MousePointerClick className="size-3.5" /> Real screens from Vidyalaya with demo data. Swipe or use ← → keys.
        </p>
      </div>
    </div>
  );
}
