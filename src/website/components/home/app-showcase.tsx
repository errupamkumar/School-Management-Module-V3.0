'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowRight, Bell, CreditCard, Laptop, MapPin, Smartphone, Tablet, UsersRound } from 'lucide-react';
import { FACTS } from '../../content/site';
import { PhoneFrame } from '../screen-frame';
import { Reveal } from '../motion';

const POINTS = [
  { icon: UsersRound, title: 'One login, every child', text: 'Switch between siblings in a single tap.' },
  { icon: CreditCard, title: 'Fees by UPI', text: 'Pay in seconds; the receipt arrives instantly.' },
  { icon: MapPin, title: 'Live school bus', text: 'Distance and arrival time to their own stop.' },
  { icon: Bell, title: 'Phone alerts', text: 'Absence, homework, notices and gate passes.' },
];

// Position and tilt live on a plain wrapper: motion's inline transform would override Tailwind transforms.
const PHONES = [
  { id: '40-fees-parent-mobile', alt: 'Pay fees online', className: 'left-[2%] top-[9%] w-[36%] -rotate-[9deg]', float: 7, delay: 0.1 },
  { id: '69-parent-live-mobile', alt: 'Live bus tracking', className: 'right-[2%] top-[9%] w-[36%] rotate-[9deg]', float: 8, delay: 0.2 },
  { id: '05-dashboard-parent-mobile', alt: 'Parent home', className: 'left-[29%] top-0 z-10 w-[42%]', float: 6, delay: 0 },
] as const;

export function AppShowcase() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-violet-700 to-fuchsia-700 py-20 text-white lg:py-28">
      <div className="web-grid-bg-dark web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="pointer-events-none absolute -left-40 top-0 size-[36rem] rounded-full bg-indigo-400/30 blur-3xl" aria-hidden="true" />
      <div className="web-container relative grid items-center gap-16 lg:grid-cols-2">
        <Reveal>
          <p className="web-eyebrow bg-white/10 text-indigo-100 ring-white/20">Parent & student app</p>
          <h2 className="web-h2 mt-4 text-white">The school app families actually open every day</h2>
          <p className="web-lead mt-4 text-indigo-100">
            Attendance, homework, results, fees and the school bus — in {FACTS.languages} Indian languages. Families install it from the browser in seconds, with no app-store download needed.
          </p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {POINTS.map((p) => (
              <li key={p.title} className="flex gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300">
                  <p.icon className="size-5" />
                </span>
                <span>
                  <span className="block font-semibold">{p.title}</span>
                  <span className="mt-0.5 block text-sm text-indigo-100">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link href="/features/parent-app" className="web-btn web-btn-light">
              Explore the parent app <ArrowRight />
            </Link>
            <span className="flex items-center gap-3 text-sm text-indigo-100">
              <Smartphone className="size-4" /> Android & iPhone
              <Tablet className="size-4" /> Tablet
              <Laptop className="size-4" /> Desktop
            </span>
          </div>
        </Reveal>

        <div className="relative mx-auto aspect-[1/0.95] w-full max-w-xl">
          {PHONES.map((p) => (
            <div key={p.id} className={`absolute ${p.className}`}>
              <motion.div initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-80px' }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: p.delay }}>
                <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: p.float, repeat: Infinity, ease: 'easeInOut' }}>
                  <PhoneFrame id={p.id} alt={p.alt} sizes="(min-width: 1024px) 260px, 40vw" />
                </motion.div>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
