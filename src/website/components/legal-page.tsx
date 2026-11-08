import { LEGAL_UPDATED, type LegalSection } from '../content/legal';
import { Reveal } from './motion';

export function LegalPage({ title, intro, sections }: { title: string; intro: string; sections: LegalSection[] }) {
  return (
    <section className="relative -mt-16 overflow-hidden pt-16 lg:-mt-[4.5rem] lg:pt-[4.5rem]">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 via-white to-white dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950" aria-hidden="true" />
      <div className="web-container max-w-3xl pb-24 pt-14 lg:pt-20">
        <Reveal>
          <p className="web-eyebrow">Legal</p>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">{title}</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Last updated {LEGAL_UPDATED}</p>
          <p className="web-lead mt-6">{intro}</p>
        </Reveal>
        <div className="mt-12 space-y-10">
          {sections.map((s, i) => (
            <section key={s.heading} aria-labelledby={`legal-${i}`}>
              <h2 id={`legal-${i}`} className="font-display text-xl font-bold text-slate-900 dark:text-white">
                {i + 1}. {s.heading}
              </h2>
              {s.paragraphs?.map((p) => (
                <p key={p} className="mt-3 leading-relaxed text-slate-600 dark:text-slate-300">
                  {p}
                </p>
              ))}
              {s.bullets && (
                <ul className="mt-3 list-disc space-y-2 pl-5 leading-relaxed text-slate-600 marker:text-indigo-500 dark:text-slate-300">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
