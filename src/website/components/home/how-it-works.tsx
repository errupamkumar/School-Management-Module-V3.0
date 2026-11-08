'use client';

import { motion } from 'motion/react';
import { HOW_IT_WORKS } from '../../content/site';
import { SectionHeading } from '../section';

export function HowItWorks() {
  return (
    <section className="web-container py-20 lg:py-28">
      <SectionHeading eyebrow="Go live in days, not months" title="From first call to first fee collected" lead="We do the heavy lifting — set-up, data import and training are part of getting started." />
      <div className="relative mt-16">
        {/* The track observes visibility: a scaled-to-zero bar has no area to intersect. */}
        <motion.div className="absolute left-0 right-0 top-7 hidden h-0.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10 lg:block" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-120px' }} aria-hidden="true">
          <motion.div className="h-full origin-left bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500" variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1 } }} transition={{ duration: 1.6, ease: 'easeInOut' }} />
        </motion.div>
        <ol className="grid gap-10 lg:grid-cols-4 lg:gap-8">
          {HOW_IT_WORKS.map((s, i) => (
            <motion.li key={s.title} className="relative" initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.6, delay: 0.25 + i * 0.25 }}>
              <span className="relative z-10 flex size-14 items-center justify-center rounded-2xl bg-white dark:bg-slate-900 font-display text-xl font-extrabold text-indigo-600 dark:text-indigo-400 shadow-lg shadow-indigo-500/10 ring-1 ring-slate-200 dark:ring-white/10">{String(i + 1).padStart(2, '0')}</span>
              <h3 className="mt-5 font-display text-lg font-bold text-slate-900 dark:text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{s.text}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
