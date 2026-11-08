'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { Mail, MessageCircle, Phone, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FAQS, SITE } from '../content/site';
import { COMPANY, telHref } from '../content/company';
import { SectionHeading } from './section';

export function Faq({ items = FAQS }: { items?: readonly { q: string; a: string }[] }) {
  const [open, setOpen] = React.useState<number | null>(0);
  return (
    <section id="faq" className="web-container scroll-mt-24 py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <SectionHeading align="left" eyebrow="FAQ" title="Questions schools ask us" lead="Can’t find what you’re looking for? Our team replies within one working day." />
          <div className="web-card mt-8 p-6">
            <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <MessageCircle className="size-5 text-indigo-600 dark:text-indigo-400" /> Talk to a person
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              {COMPANY.phones.map((phone) => (
                <li key={phone} className="flex items-center gap-2">
                  <Phone className="size-4 text-slate-400" />
                  <a href={telHref(phone)} className="hover:text-indigo-700 dark:hover:text-indigo-300">
                    {phone}
                  </a>
                </li>
              ))}
              <li className="flex items-center gap-2">
                <Mail className="size-4 text-slate-400" />
                <a href={`mailto:${COMPANY.email}`} className="hover:text-indigo-700 dark:hover:text-indigo-300">
                  {COMPANY.email}
                </a>
              </li>
            </ul>
            <Link href={`${SITE.signupHref}?interest=demo`} className="web-btn web-btn-secondary mt-5 w-full">
              Book a live demo
            </Link>
          </div>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-white/10 border-y border-slate-200 dark:border-white/10">
          {items.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={f.q}>
                <button type="button" onClick={() => setOpen(isOpen ? null : i)} aria-expanded={isOpen} className="flex w-full items-center gap-4 py-5 text-left">
                  <span className="flex-1 font-display text-base font-bold text-slate-900 dark:text-white sm:text-lg">{f.q}</span>
                  <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full ring-1 transition', isOpen ? 'rotate-45 bg-indigo-600 text-white ring-indigo-600' : 'text-slate-500 dark:text-slate-400 ring-slate-200 dark:ring-white/10')}>
                    <Plus className="size-4" />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }} className="overflow-hidden">
                      <p className="pb-6 pr-12 text-sm leading-relaxed text-slate-600 dark:text-slate-300 sm:text-base">{f.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
