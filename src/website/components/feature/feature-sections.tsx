import Link from 'next/link';
import { ArrowRight, CalendarCheck, Check, ChevronRight, CircleDashed, Minus, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MODULE_MAP } from '@/lib/modules';
import { ACCENTS, CATEGORIES, SITE } from '../../content/site';
import type { Feature } from '../../content/features';
import { planCoverage, type PublicPlan } from '../../server/plans';
import { Reveal, Stagger, StaggerItem } from '../motion';
import { ScreenShot } from '../screen-frame';
import { SectionHeading } from '../section';

export function FeatureHero({ f }: { f: Feature }) {
  const a = ACCENTS[f.accent];
  const category = CATEGORIES.find((c) => c.key === f.category);
  const hero = f.screens[0];
  return (
    <section className="relative -mt-16 overflow-hidden pt-16 lg:-mt-[4.5rem] lg:pt-[4.5rem]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-slate-50 dark:from-slate-900/60 via-white dark:via-slate-950 to-white dark:to-slate-950" aria-hidden="true" />
      <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
      <div className={cn('pointer-events-none absolute -right-24 top-10 -z-10 size-[30rem] rounded-full blur-3xl', a.glow)} aria-hidden="true" />
      <div className="web-container grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[1fr_1.1fr] lg:pb-24 lg:pt-16">
        <Reveal>
          <nav className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-indigo-700 dark:hover:text-indigo-300">
              Home
            </Link>
            <ChevronRight className="size-3.5" />
            <Link href="/features" className="hover:text-indigo-700 dark:hover:text-indigo-300">
              Features
            </Link>
            <ChevronRight className="size-3.5" />
            <span className="text-slate-800 dark:text-slate-100">{f.short}</span>
          </nav>
          <div className="mt-6 flex items-center gap-3">
            <span className={cn('flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-xl', a.icon)}>
              <f.icon className="size-7" />
            </span>
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset', a.chip)}>{category?.label}</span>
          </div>
          <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-[3.4rem]">{f.title}</h1>
          <p className={cn('mt-4 text-lg font-semibold', a.text)}>{f.tagline}</p>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 dark:text-slate-300 sm:text-lg">{f.summary}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`${SITE.signupHref}?feature=${f.slug}`} className="web-btn web-btn-primary px-6">
              Try {f.short} free <ArrowRight />
            </Link>
            <Link href={`${SITE.signupHref}?interest=demo&feature=${f.slug}`} className="web-btn web-btn-secondary px-6">
              <CalendarCheck className="text-indigo-600 dark:text-indigo-400" /> See it in a live demo
            </Link>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-indigo-500/15 via-violet-500/10 to-fuchsia-500/15 blur-2xl" aria-hidden="true" />
          <ScreenShot id={hero.id} alt={hero.title} priority sizes="(min-width: 1024px) 620px, 92vw" />
        </Reveal>
      </div>
      <div className="web-container pb-6">
        <Stagger className="grid gap-4 sm:grid-cols-3">
          {f.highlights.map((h) => (
            <StaggerItem key={h.label}>
              <div className="web-card flex h-full items-center gap-4 p-5">
                <span className={cn('shrink-0 whitespace-nowrap font-display text-2xl font-extrabold tracking-tight sm:text-3xl', a.text)}>{h.value}</span>
                <span className="text-sm leading-snug text-slate-600 dark:text-slate-300">{h.label}</span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function Capabilities({ f }: { f: Feature }) {
  const a = ACCENTS[f.accent];
  return (
    <section className="web-container py-20 lg:py-24">
      <SectionHeading eyebrow="What you get" title={`Everything in ${f.short}`} lead={`The building blocks of ${f.title} in Vidyalaya — all included, nothing to bolt on.`} />
      <Stagger className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {f.capabilities.map((c) => (
          <StaggerItem key={c.title}>
            <div className="web-card group h-full p-6 transition duration-300 hover:-translate-y-1">
              <span className={cn('flex size-11 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110', a.soft, a.text)}>
                <c.icon className="size-5" />
              </span>
              <h3 className="mt-5 font-display text-lg font-bold text-slate-900 dark:text-white">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{c.text}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function Steps({ f }: { f: Feature }) {
  const a = ACCENTS[f.accent];
  return (
    <section className="relative overflow-hidden bg-slate-950 py-20 text-white lg:py-24">
      <div className="web-grid-bg-dark web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="web-container relative">
        <SectionHeading dark eyebrow="How it works" title={`${f.short} in four steps`} />
        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {f.steps.map((s, i) => (
            <li key={s.title}>
              <Reveal delay={i * 0.12} className="h-full">
                <div className="relative h-full rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <span className={cn('flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br font-display text-lg font-extrabold text-white shadow-lg', a.icon)}>{i + 1}</span>
                  <h3 className="mt-5 font-display text-lg font-bold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{s.text}</p>
                  {i < f.steps.length - 1 && <ArrowRight className="absolute -right-5 top-10 hidden size-5 text-white/25 lg:block" aria-hidden="true" />}
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function Roles({ f }: { f: Feature }) {
  return (
    <section className="web-container py-20 lg:py-24">
      <SectionHeading eyebrow="Who uses it" title="Made for the people who do the work" />
      <Stagger className="mt-12 grid gap-5 md:grid-cols-3">
        {f.roles.map((r) => (
          <StaggerItem key={r.role}>
            <div className="web-card h-full p-6">
              <span className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
                <UserRound className="size-5" />
              </span>
              <p className="mt-4 font-display text-lg font-bold text-slate-900 dark:text-white">{r.role}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{r.text}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}

export function PlanAvailability({ f, plans }: { f: Feature; plans: PublicPlan[] | null }) {
  if (!plans?.length) return null;
  const coverage = planCoverage(plans, f.modules);
  return (
    <section className="web-container pb-4">
      <Reveal>
        <div className="web-card overflow-hidden">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 dark:border-white/10 p-6 sm:p-8">
            <div>
              <p className="font-display text-xl font-bold text-slate-900 dark:text-white">Included in these plans</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Modules: {f.modules.map((m) => MODULE_MAP[m].label).join(' · ')}</p>
            </div>
            <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:gap-2.5">
              Compare plans <ArrowRight className="size-4 transition-all" />
            </Link>
          </div>
          <ul className={cn('grid divide-y divide-slate-100 dark:divide-white/10 sm:divide-x sm:divide-y-0', coverage.length >= 3 ? 'sm:grid-cols-3' : coverage.length === 2 ? 'sm:grid-cols-2' : '')}>
            {coverage.map(({ plan, level, missing }) => (
              <li key={plan.code} className="flex items-start gap-3 p-6">
                <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full', level === 'full' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : level === 'partial' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-600' : 'bg-slate-100 dark:bg-white/10 text-slate-400')}>
                  {level === 'full' ? <Check className="size-4" strokeWidth={3} /> : level === 'partial' ? <CircleDashed className="size-4" /> : <Minus className="size-4" />}
                </span>
                <span>
                  <span className="block font-semibold text-slate-900 dark:text-white">{plan.name}</span>
                  <span className="block text-sm text-slate-500 dark:text-slate-400">{level === 'full' ? 'Fully included' : level === 'partial' ? `Partly included — not ${missing.join(', ')}` : 'Not included'}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
