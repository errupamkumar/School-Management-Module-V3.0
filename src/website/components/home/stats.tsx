'use client';

import { Boxes, GraduationCap, Languages, LayoutGrid, School, ShieldCheck, Users } from 'lucide-react';
import { FACTS } from '../../content/site';
import { FEATURES } from '../../content/features';
import { ADOPTION, SHOW_SAMPLE_CONTENT } from '../../content/placeholder';
import { CountUp, Stagger, StaggerItem } from '../motion';

const PRODUCT_STATS = [
  { icon: Boxes, value: FACTS.modules, suffix: '', label: 'Modules in one product', tone: 'from-indigo-500 to-violet-500' },
  { icon: ShieldCheck, value: FACTS.roles, suffix: '', label: 'School roles, each with its own view', tone: 'from-emerald-500 to-teal-500' },
  { icon: Languages, value: FACTS.languages, suffix: '', label: 'Indian languages', tone: 'from-amber-400 to-orange-500' },
];
const SAMPLE_STATS = [
  { icon: School, value: ADOPTION.schools, suffix: '+', label: 'Schools on Vidyalaya', tone: 'from-rose-500 to-pink-500' },
  { icon: Users, value: ADOPTION.users / 100000, suffix: 'L+', label: 'Students, parents and staff', tone: 'from-sky-500 to-blue-600', decimals: 1 },
];
const MORE_FACTS = [
  { icon: LayoutGrid, value: FEATURES.length, suffix: '', label: 'Solutions, each with its own page', tone: 'from-rose-500 to-pink-500' },
  { icon: GraduationCap, value: 6, suffix: '', label: 'Boards: CBSE, ICSE, State, IB, Cambridge, NIOS', tone: 'from-sky-500 to-blue-600' },
];
const STATS: { icon: typeof Boxes; value: number; suffix: string; label: string; tone: string; decimals?: number }[] = [...PRODUCT_STATS, ...(SHOW_SAMPLE_CONTENT ? SAMPLE_STATS : MORE_FACTS)];

export function Stats() {
  return (
    <section className="web-container py-16 lg:py-20">
      <Stagger className="grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-5">
        {STATS.map((s, i) => (
          <StaggerItem key={s.label} className={i === STATS.length - 1 ? 'col-span-2 lg:col-span-1' : undefined}>
            <div className="web-card group h-full p-5 transition-transform duration-300 hover:-translate-y-1 sm:p-6">
              <span className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg shadow-slate-900/10 ${s.tone}`}>
                <s.icon className="size-5" />
              </span>
              <p className="mt-5 font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
                <CountUp to={s.value} suffix={s.suffix} decimals={s.decimals ?? 0} />
              </p>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
