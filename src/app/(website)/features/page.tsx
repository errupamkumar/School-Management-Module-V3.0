import type { Metadata } from 'next';
import { CATEGORIES, FACTS } from '@/website/content/site';
import { FEATURES, featuresIn } from '@/website/content/features';
import { Reveal } from '@/website/components/motion';
import { SectionHeading } from '@/website/components/section';
import { FeatureCarousel } from '@/website/components/feature-carousel';
import { FeatureGrid } from '@/website/components/feature-grid';
import { CtaBand } from '@/website/components/cta-band';

export const metadata: Metadata = {
  title: 'Features',
  description: `All ${FEATURES.length} Vidyalaya solutions across ${FACTS.modules} modules — admissions, fees, attendance, exams, transport, hostel, payroll, parent app and more.`,
};

export default function FeaturesPage() {
  return (
    <>
      <section className="relative -mt-16 overflow-hidden pt-16 lg:-mt-[4.5rem] lg:pt-[4.5rem]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 dark:from-indigo-950/40 via-white dark:via-slate-950 to-white dark:to-slate-950" aria-hidden="true" />
        <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="web-container pb-10 pt-14 text-center lg:pt-20">
          <Reveal>
            <p className="web-eyebrow">All features</p>
            <h1 className="mx-auto mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Every tool your school needs, <span className="web-text-gradient">in one place</span>
            </h1>
            <p className="web-lead mx-auto mt-5 max-w-2xl">
              {FEATURES.length} solutions, {FACTS.modules} modules, {FACTS.roles} roles and {FACTS.languages} languages — all sharing the same students, staff and fees. Pick a feature to see real screens and how it works.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <a key={c.key} href={`#${c.key}`} className="rounded-full bg-white dark:bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm ring-1 ring-slate-200 dark:ring-white/10 transition hover:text-indigo-700 dark:hover:text-indigo-300 hover:ring-indigo-300 dark:hover:ring-indigo-400/50">
                {c.label} <span className="ml-1 text-slate-400">{featuresIn(c.key).length}</span>
              </a>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="web-container pb-16">
        <FeatureCarousel />
      </section>

      {CATEGORIES.map((c, i) => (
        <section key={c.key} id={c.key} className={`scroll-mt-20 py-16 lg:py-20 ${i % 2 === 0 ? 'bg-slate-50 dark:bg-white/[0.04]' : ''}`}>
          <div className="web-container">
            <SectionHeading align="left" eyebrow={c.label} title={c.blurb} />
            <div className="mt-10">
              <FeatureGrid features={featuresIn(c.key)} />
            </div>
          </div>
        </section>
      ))}

      <CtaBand title="See it working for your school" />
    </>
  );
}
