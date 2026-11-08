import Link from 'next/link';
import { ArrowRight, CalendarCheck, CheckCircle2, LogIn } from 'lucide-react';
import { SITE } from '../content/site';
import { OFFER } from '../content/placeholder';
import { Reveal } from './motion';

export function CtaBand({ title = 'Ready to run your school the modern way?', lead = 'Start a free trial on your own data, or let us walk you through Vidyalaya in a 30-minute live demo.' }: { title?: string; lead?: string }) {
  return (
    <section className="web-container py-20 lg:py-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center text-white shadow-2xl shadow-indigo-600/30 sm:px-12 lg:py-20">
          <div className="web-grid-bg-dark web-mask-fade pointer-events-none absolute inset-0" aria-hidden="true" />
          <div className="pointer-events-none absolute -left-20 -top-24 size-80 rounded-full bg-white/15 blur-3xl" aria-hidden="true" />
          <div className="pointer-events-none absolute -bottom-28 -right-10 size-96 rounded-full bg-fuchsia-300/25 blur-3xl" aria-hidden="true" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
            <p className="mt-4 text-base text-indigo-100 sm:text-lg">{lead}</p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={SITE.signupHref} className="web-btn web-btn-light w-full sm:w-auto">
                Start free trial <ArrowRight />
              </Link>
              <Link href={`${SITE.signupHref}?interest=demo`} className="web-btn web-btn-ghost-dark w-full sm:w-auto">
                <CalendarCheck /> Book a live demo
              </Link>
              <Link href={SITE.loginHref} className="web-btn w-full text-white/90 hover:text-white sm:w-auto">
                <LogIn /> Log in
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-indigo-100">
              {OFFER.map((t) => (
                <li key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="size-4 text-emerald-300" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
