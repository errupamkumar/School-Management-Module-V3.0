import Link from 'next/link';
import { ArrowRight, Building2, Fingerprint, History, KeyRound, Lock, ShieldCheck } from 'lucide-react';
import { FACTS } from '../../content/site';
import { Stagger, StaggerItem } from '../motion';
import { SectionHeading } from '../section';

const ITEMS = [
  { icon: KeyRound, title: 'Role-based access', text: `${FACTS.roles} school roles with view, create, edit and delete rights per module.` },
  { icon: History, title: 'Complete audit log', text: 'Who changed what and when — searchable and exportable for inspections.' },
  { icon: Lock, title: 'Encrypted personal data', text: 'Sensitive fields such as Aadhaar numbers are encrypted at rest with AES.' },
  { icon: Building2, title: 'Each school kept separate', text: 'Every school’s records are isolated; the platform operator never sees school data.' },
  { icon: Fingerprint, title: 'Protected sign-in', text: 'Account lockout, rate limits, forced password change and “end all sessions”.' },
  { icon: ShieldCheck, title: 'Hosted in India', text: 'Data stays in India and the product is built for the DPDP Act 2023.' },
];

export function Security() {
  return (
    <section className="web-container py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <SectionHeading align="left" eyebrow="Security & privacy" title="Children’s data deserves serious protection" lead="Vidyalaya is designed around privacy from the first line of code — so your school can answer every parent and every inspector with confidence." />
          <Link href="/features/security-control" className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:gap-2.5">
            How we protect your data <ArrowRight className="size-4 transition-all" />
          </Link>
        </div>
        <Stagger className="grid gap-4 sm:grid-cols-2">
          {ITEMS.map((it) => (
            <StaggerItem key={it.title}>
              <div className="web-card h-full p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-600/10">
                  <it.icon className="size-5" />
                </span>
                <p className="mt-4 font-semibold text-slate-900 dark:text-white">{it.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{it.text}</p>
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
