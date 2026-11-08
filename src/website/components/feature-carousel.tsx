'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion, useInView, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENTS, CATEGORIES, type CategoryKey } from '../content/site';
import { FEATURES } from '../content/features';
import { BrowserFrame, PhoneFrame, isMobileScreen } from './screen-frame';

const DURATION = 7000;
const EASE = [0.22, 1, 0.36, 1] as const;

const slide = {
  enter: (d: number) => ({ x: d * 48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (d: number) => ({ x: d * -48, opacity: 0 }),
};

type Tab = 'all' | CategoryKey;

export function FeatureCarousel({ initial = 'all' }: { initial?: Tab }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const chipsRef = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.35 });
  const reduce = useReducedMotion();
  const [tab, setTab] = React.useState<Tab>(initial);
  const [index, setIndex] = React.useState(0);
  const [dir, setDir] = React.useState(1);
  const [hover, setHover] = React.useState(false);
  const [paused, setPaused] = React.useState(false);

  const list = React.useMemo(() => (tab === 'all' ? FEATURES : FEATURES.filter((f) => f.category === tab)), [tab]);
  const feature = list[index] ?? list[0];
  const accent = ACCENTS[feature.accent];
  const running = !paused && !hover && inView && !reduce;

  const go = React.useCallback(
    (to: number, d?: number) => {
      setDir(d ?? (to > index ? 1 : -1));
      setIndex(((to % list.length) + list.length) % list.length);
    },
    [index, list.length],
  );
  const next = React.useCallback(() => go(index + 1, 1), [go, index]);
  const prev = React.useCallback(() => go(index - 1, -1), [go, index]);

  React.useEffect(() => {
    if (!running) return;
    const t = setTimeout(next, DURATION);
    return () => clearTimeout(t);
  }, [running, next, index, tab]);

  // Keep the active chip visible in the scrolling chip row.
  React.useEffect(() => {
    const row = chipsRef.current;
    const chip = row?.querySelector<HTMLElement>(`[data-index="${index}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - row.clientWidth / 2 + chip.clientWidth / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [index, tab, reduce]);

  const selectTab = (t: Tab) => {
    setTab(t);
    setIndex(0);
    setDir(1);
  };

  const hero = feature.screens[0];
  const mobile = isMobileScreen(hero.id);

  return (
    <div
      ref={ref}
      role="region"
      aria-roledescription="carousel"
      aria-label="Vidyalaya features"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
      }}
    >
      {/* Category tabs */}
      <LayoutGroup id="feature-tabs">
        <div className="web-mask-x -mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
          <div className="mx-auto flex w-max gap-1 rounded-full bg-slate-100/80 dark:bg-white/10 p-1 ring-1 ring-slate-200/70 dark:ring-white/10" role="tablist" aria-label="Feature categories">
            {[{ key: 'all' as const, label: 'All features' }, ...CATEGORIES].map((c) => (
              <button
                key={c.key}
                type="button"
                role="tab"
                aria-selected={tab === c.key}
                onClick={() => selectTab(c.key)}
                className={cn('relative rounded-full px-4 py-2 text-sm font-semibold transition-colors', tab === c.key ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white')}
              >
                {tab === c.key && <motion.span layoutId="feature-tab-pill" className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 shadow-md shadow-indigo-600/25" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />}
                <span className="relative">{c.label}</span>
              </button>
            ))}
          </div>
        </div>
      </LayoutGroup>

      {/* Slide */}
      <div className="mt-8 overflow-hidden rounded-[2rem] border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-[0_30px_80px_-30px_rgb(15_23_42/0.25)]">
        <div className="grid lg:grid-cols-[0.95fr_1.25fr]">
          <div className="relative flex min-h-[25rem] flex-col p-7 sm:p-10 lg:p-12">
            <AnimatePresence mode="wait" custom={dir} initial={false}>
              <motion.div key={`${tab}-${feature.slug}`} custom={dir} variants={slide} initial="enter" animate="center" exit="exit" transition={{ duration: 0.45, ease: EASE }} className="flex flex-1 flex-col">
                <div className="flex items-center gap-3">
                  <span className={cn('flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg', accent.icon)}>
                    <feature.icon className="size-6" />
                  </span>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', accent.chip)}>{CATEGORIES.find((c) => c.key === feature.category)?.label}</span>
                  <span className="ml-auto font-mono text-xs text-slate-400" aria-live="polite">
                    {String(index + 1).padStart(2, '0')} / {String(list.length).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{feature.title}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600 dark:text-slate-300">{feature.tagline}</p>
                <ul className="mt-6 space-y-3">
                  {feature.capabilities.slice(0, 4).map((c) => (
                    <li key={c.title} className="flex gap-3 text-sm">
                      <span className={cn('mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full', accent.soft)}>
                        <Check className={cn('size-3', accent.text)} strokeWidth={3} />
                      </span>
                      <span className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">{c.title}.</span> {c.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap items-center gap-3 pt-8">
                  <Link href={`/features/${feature.slug}`} className="web-btn web-btn-primary">
                    Explore {feature.short} <ArrowRight />
                  </Link>
                  <span className="text-xs text-slate-400">{feature.screens.length} real screens inside</span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className={cn('relative flex items-center justify-center overflow-hidden p-6 sm:p-10', accent.soft)}>
            <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
            <div className={cn('pointer-events-none absolute -right-16 -top-16 size-72 rounded-full blur-3xl', accent.glow)} aria-hidden="true" />
            <AnimatePresence mode="popLayout" custom={dir} initial={false}>
              <motion.div
                key={`${tab}-${feature.slug}-img`}
                custom={dir}
                initial={{ opacity: 0, scale: 0.94, x: dir * 60 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.96, x: dir * -60 }}
                transition={{ duration: 0.55, ease: EASE }}
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.18}
                onDragEnd={(_e, { offset, velocity }) => {
                  if (offset.x < -70 || velocity.x < -500) next();
                  else if (offset.x > 70 || velocity.x > 500) prev();
                }}
                className={cn('relative w-full cursor-grab active:cursor-grabbing', mobile ? 'max-w-[15rem]' : 'max-w-2xl')}
              >
                {mobile ? <PhoneFrame id={hero.id} alt={hero.title} sizes="240px" /> : <BrowserFrame id={hero.id} alt={hero.title} sizes="(min-width: 1024px) 660px, 92vw" />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex items-center gap-3">
        <button type="button" onClick={prev} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 transition hover:text-indigo-700 dark:hover:text-indigo-300 hover:ring-indigo-300 dark:hover:ring-indigo-400/50" aria-label="Previous feature">
          <ChevronLeft className="size-5" />
        </button>
        <div ref={chipsRef} className="web-mask-x flex min-w-0 flex-1 gap-2 overflow-x-auto px-6 py-1 [scrollbar-width:none]">
          {list.map((f, i) => (
            <button
              key={f.slug}
              type="button"
              data-index={i}
              onClick={() => go(i)}
              aria-label={`Show ${f.title}`}
              aria-current={i === index}
              className={cn('relative flex shrink-0 items-center gap-2 overflow-hidden rounded-full px-3.5 py-2 text-xs font-semibold ring-1 ring-inset transition', i === index ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm ring-slate-300 dark:ring-white/20' : 'text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-white/10 hover:text-slate-800 dark:hover:text-white')}
            >
              <f.icon className={cn('size-3.5', i === index ? ACCENTS[f.accent].text : 'text-slate-400')} />
              {f.short}
              {i === index && (
                <motion.span
                  key={`${tab}-${index}-${running}`}
                  className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-indigo-500 to-violet-500"
                  initial={{ width: '0%' }}
                  animate={{ width: running ? '100%' : '0%' }}
                  transition={{ duration: running ? DURATION / 1000 : 0, ease: 'linear' }}
                />
              )}
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setPaused((p) => !p)} className="hidden size-11 shrink-0 items-center justify-center rounded-full bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 transition hover:text-indigo-700 dark:hover:text-indigo-300 sm:flex" aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}>
          {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
        </button>
        <button type="button" onClick={next} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/25 transition hover:brightness-110" aria-label="Next feature">
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
