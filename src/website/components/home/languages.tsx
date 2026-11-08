'use client';

import * as React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { LANGS } from '@/lib/i18n';
import { BrowserFrame } from '../screen-frame';
import { Reveal } from '../motion';

export function Languages() {
  const reduce = useReducedMotion();
  const [i, setI] = React.useState(1);
  React.useEffect(() => {
    if (reduce) return;
    const t = setInterval(() => setI((x) => (x + 1) % LANGS.length), 1800);
    return () => clearInterval(t);
  }, [reduce]);
  const lang = LANGS[i];

  return (
    <section className="relative overflow-hidden bg-slate-50 dark:bg-white/[0.04] py-20 lg:py-28">
      <div className="web-container grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <p className="web-eyebrow">Made for Bharat</p>
          <h2 className="web-h2 mt-4">
            Vidyalaya speaks
            <span className="relative block h-[1.5em] overflow-hidden" aria-live="polite">
              <AnimatePresence initial={false}>
                <motion.span key={lang.code} lang={lang.code} className="web-text-gradient absolute left-0 top-0 whitespace-nowrap py-[0.1em] font-hindi leading-[1.3]" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '-100%', opacity: 0 }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}>
                  {lang.native}
                </motion.span>
              </AnimatePresence>
            </span>
          </h2>
          <p className="web-lead mt-4">Every screen — notices, fees, homework, results — in {LANGS.length} Indian languages. Your school chooses which to offer; each parent, student and teacher picks their own.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {LANGS.map((l, idx) => (
              <button
                key={l.code}
                type="button"
                lang={l.code}
                onClick={() => setI(idx)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium ring-1 ring-inset transition ${idx === i ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-400/50'}`}
              >
                {l.native}
                {l.native !== l.name && <span className={`ml-1.5 text-xs ${idx === i ? 'text-indigo-200' : 'text-slate-400'}`}>{l.name}</span>}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.1} className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-tr from-amber-200/50 via-rose-200/40 to-indigo-200/50 blur-2xl" aria-hidden="true" />
          <BrowserFrame id="76-tamil-dashboard" alt="Dashboard in Tamil" sizes="(min-width: 1024px) 600px, 92vw" />
          <div className="absolute -bottom-8 -left-4 w-1/2 sm:-left-8">
            <BrowserFrame id="67-hindi" alt="Hindi interface" sizes="300px" className="shadow-xl" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
