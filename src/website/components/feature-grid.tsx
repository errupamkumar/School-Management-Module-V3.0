import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCENTS, CATEGORIES } from '../content/site';
import { FEATURES, type Feature } from '../content/features';
import { Stagger, StaggerItem } from './motion';

export function FeatureTile({ f }: { f: Feature }) {
  const a = ACCENTS[f.accent];
  return (
    <Link href={`/features/${f.slug}`} className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 p-6 transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_24px_60px_-24px_rgb(79_70_229/0.35)]">
      <span className={cn('pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100', a.glow)} aria-hidden="true" />
      <span className="pointer-events-none absolute inset-0 rounded-3xl ring-2 ring-inset ring-transparent transition group-hover:ring-indigo-500/20" aria-hidden="true" />
      <div className="relative flex items-start justify-between">
        <span className={cn('flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3', a.icon)}>
          <f.icon className="size-6" />
        </span>
        <ArrowUpRight className="size-5 text-slate-300 transition duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-indigo-600" />
      </div>
      <p className="relative mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{CATEGORIES.find((c) => c.key === f.category)?.label}</p>
      <h3 className="relative mt-1 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-white">{f.title}</h3>
      <p className="relative mt-2 line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{f.tagline}</p>
    </Link>
  );
}

export function FeatureGrid({ features = FEATURES }: { features?: Feature[] }) {
  return (
    <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" gap={0.04}>
      {features.map((f) => (
        <StaggerItem key={f.slug}>
          <FeatureTile f={f} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}
