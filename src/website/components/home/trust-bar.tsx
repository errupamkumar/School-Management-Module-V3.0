import Link from 'next/link';
import { CLIENT_SCHOOLS, SHOW_SAMPLE_CONTENT } from '../../content/placeholder';
import { ACCENTS } from '../../content/site';
import { FEATURES } from '../../content/features';
import { cn } from '@/lib/utils';

const TONES = ['from-indigo-500 to-violet-500', 'from-emerald-500 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-500 to-pink-500', 'from-sky-500 to-blue-600'];
const BOARDS = ['CBSE', 'ICSE', 'State Boards', 'IB', 'Cambridge', 'NIOS'];

/** Sample school names (opt-in placeholder) or, by default, every feature in the product. */
function Marquee() {
  if (SHOW_SAMPLE_CONTENT) {
    const row = [...CLIENT_SCHOOLS, ...CLIENT_SCHOOLS];
    return (
      <ul className="web-marquee flex w-max gap-4">
        {row.map((s, i) => (
          <li key={`${s.mark}-${i}`} className="flex items-center gap-3 rounded-2xl border border-slate-100 dark:border-white/10 bg-slate-50/60 dark:bg-white/[0.04] py-2.5 pl-2.5 pr-5" aria-hidden={i >= CLIENT_SCHOOLS.length}>
            <span className={`flex size-10 items-center justify-center rounded-xl bg-gradient-to-br font-display text-sm font-extrabold text-white ${TONES[i % TONES.length]}`}>{s.mark}</span>
            <span className="text-left">
              <span className="block whitespace-nowrap text-sm font-semibold text-slate-800 dark:text-slate-100">{s.name}</span>
              <span className="block text-xs text-slate-500 dark:text-slate-400">{s.city}</span>
            </span>
          </li>
        ))}
      </ul>
    );
  }
  const row = [...FEATURES, ...FEATURES];
  return (
    <ul className="web-marquee flex w-max gap-3">
      {row.map((f, i) => (
        <li key={`${f.slug}-${i}`} aria-hidden={i >= FEATURES.length}>
          <Link href={`/features/${f.slug}`} tabIndex={i >= FEATURES.length ? -1 : undefined} className="flex items-center gap-2.5 rounded-full border border-slate-100 bg-slate-50/60 py-2 pl-2 pr-4 transition hover:border-indigo-200 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-indigo-400/30">
            <span className={cn('flex size-8 items-center justify-center rounded-full bg-gradient-to-br text-white', ACCENTS[f.accent].icon)}>
              <f.icon className="size-4" />
            </span>
            <span className="whitespace-nowrap text-sm font-semibold text-slate-700 dark:text-slate-200">{f.title}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function TrustBar() {
  return (
    <section className="border-y border-slate-100 dark:border-white/10 bg-white dark:bg-slate-900 py-10" aria-label={SHOW_SAMPLE_CONTENT ? 'Schools using Vidyalaya' : 'What is included'}>
      <div className="web-container flex flex-col items-center gap-3 text-center">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{SHOW_SAMPLE_CONTENT ? 'Trusted by progressive schools across India, for every board' : 'Built for every board — and everything below is included'}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {BOARDS.map((b) => (
            <span key={b} className="rounded-full bg-slate-50 dark:bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-white/10">
              {b}
            </span>
          ))}
        </div>
      </div>
      <div className="web-mask-x mt-8 overflow-hidden">
        <Marquee />
      </div>
    </section>
  );
}
