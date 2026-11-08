import Link from 'next/link';
import { ArrowRight, Building2, Check, GraduationCap, MessageCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FACTS, SITE } from '../content/site';
import { COMPANY } from '../content/company';
import { planPrice, type PublicPlan } from '../server/plans';
import { Stagger, StaggerItem } from './motion';

export function PricingUnavailable() {
  return (
    <div className="web-card mx-auto max-w-xl p-8 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
        <MessageCircle className="size-6" />
      </span>
      <p className="mt-4 font-display text-xl font-bold text-slate-900 dark:text-white">Plans for every size of school</p>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Tell us about your school and we will share pricing within one working day. Call {COMPANY.phones[0]} or email {COMPANY.email}.
      </p>
      <Link href={SITE.signupHref} className="web-btn web-btn-primary mt-6">
        Get pricing <ArrowRight />
      </Link>
    </div>
  );
}

export function PricingCards({ plans, detailed = false }: { plans: PublicPlan[] | null; detailed?: boolean }) {
  if (!plans?.length) return <PricingUnavailable />;
  const popular = plans.length >= 3 ? Math.floor(plans.length / 2) : -1;
  return (
    <Stagger className={cn('mx-auto grid gap-6', plans.length === 1 ? 'max-w-md' : plans.length === 2 ? 'max-w-4xl md:grid-cols-2' : 'max-w-6xl md:grid-cols-2 lg:grid-cols-3')}>
      {plans.map((p, i) => {
        const price = planPrice(p);
        const hot = i === popular;
        return (
          <StaggerItem key={p.code} className="h-full">
            <div className={cn('relative flex h-full flex-col rounded-[2rem] p-7 sm:p-8', hot ? 'bg-slate-950 text-white shadow-2xl shadow-indigo-900/30 ring-1 ring-indigo-500/40 lg:-my-4 lg:py-12' : 'web-card')}>
              {hot && (
                <>
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[2rem]" aria-hidden="true">
                    <div className="absolute -right-16 -top-16 size-56 rounded-full bg-indigo-600/40 blur-3xl" />
                    <div className="absolute -bottom-20 -left-10 size-56 rounded-full bg-fuchsia-600/25 blur-3xl" />
                  </div>
                  <span className="absolute -top-3.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-3.5 py-1 text-xs font-bold text-white shadow-lg">
                    <Sparkles className="size-3.5" /> Most popular
                  </span>
                </>
              )}
              <div className="relative">
                <p className={cn('font-display text-xl font-bold', hot ? 'text-white' : 'text-slate-900 dark:text-white')}>{p.name}</p>
                {p.description && <p className={cn('mt-1.5 text-sm', hot ? 'text-slate-300' : 'text-slate-500 dark:text-slate-400')}>{p.description}</p>}
                <p className="mt-6 flex items-baseline gap-1.5">
                  <span className={cn('font-display text-4xl font-extrabold tracking-tight sm:text-5xl', hot ? 'text-white' : 'text-slate-900 dark:text-white')}>{price.amount}</span>
                  <span className={cn('text-sm', hot ? 'text-slate-400' : 'text-slate-500 dark:text-slate-400')}>{price.unit}</span>
                </p>
                <div className={cn('mt-5 flex flex-wrap gap-2 text-xs font-medium', hot ? 'text-slate-200' : 'text-slate-600 dark:text-slate-300')}>
                  <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1', hot ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/10')}>
                    <GraduationCap className="size-3.5" /> {p.maxStudents ? `Up to ${p.maxStudents.toLocaleString('en-IN')} students` : 'Unlimited students'}
                  </span>
                  <span className={cn('flex items-center gap-1.5 rounded-full px-3 py-1', hot ? 'bg-white/10' : 'bg-slate-100 dark:bg-white/10')}>
                    <Building2 className="size-3.5" /> {p.maxCampuses ? `${p.maxCampuses} campus${p.maxCampuses > 1 ? 'es' : ''}` : 'Unlimited campuses'}
                  </span>
                </div>
                <Link href={`${SITE.signupHref}?plan=${encodeURIComponent(p.code)}`} className={cn('web-btn mt-7 w-full', hot ? 'web-btn-light' : 'web-btn-primary')}>
                  Start free trial <ArrowRight />
                </Link>
                <p className={cn('mt-7 text-sm font-semibold', hot ? 'text-white' : 'text-slate-900 dark:text-white')}>
                  {p.modules.length} of {FACTS.modules} modules
                </p>
                <ul className="mt-4 space-y-3">
                  {(detailed ? p.groups : p.groups.slice(0, 6)).map((g) => (
                    <li key={g.group} className="flex gap-2.5 text-sm">
                      <Check className={cn('mt-0.5 size-4 shrink-0', hot ? 'text-emerald-400' : 'text-emerald-500')} strokeWidth={3} />
                      <span className={hot ? 'text-slate-300' : 'text-slate-600 dark:text-slate-300'}>
                        <span className={cn('font-semibold', hot ? 'text-white' : 'text-slate-800 dark:text-slate-100')}>{g.group}:</span> {detailed ? g.labels.join(', ') : `${g.labels.slice(0, 3).join(', ')}${g.labels.length > 3 ? ` +${g.labels.length - 3} more` : ''}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </StaggerItem>
        );
      })}
    </Stagger>
  );
}
