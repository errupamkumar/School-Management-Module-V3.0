import type { Metadata } from 'next';
import { FACTS } from '@/website/content/site';
import { FEATURE_MAP } from '@/website/content/features';
import { COMPANY, telHref } from '@/website/content/company';
import { OFFER } from '@/website/content/placeholder';
import { Reveal } from '@/website/components/motion';
import { LeadForm } from '@/website/components/lead-form';

export const metadata: Metadata = {
  title: 'Start free trial',
  description: 'Start a free Vidyalaya trial or book a live demo. We set up your school and import your data.',
};

/** Sign up: one focused card, styled like the sign-in page. */
export default async function GetStartedPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const interest = one('interest') === 'demo' ? 'demo' : 'trial';
  const feature = one('feature');
  const initialFeatures = feature && FEATURE_MAP[feature] ? [feature] : [];

  return (
    <Reveal className="w-full max-w-2xl">
      <div className="web-card p-6 sm:p-9">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">
          Sign up your school
        </h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
          Tell us a little about your school. We set up your school code, classes, fee structure and logins — and show you around all {FACTS.modules} modules.
        </p>
        <div className="mt-8">
          <LeadForm initialInterest={interest} initialFeatures={initialFeatures} />
        </div>
      </div>
      <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
        {OFFER.join(' · ')}. Questions? Call{' '}
        <a href={telHref(COMPANY.phones[0])} className="font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300">
          {COMPANY.phones[0]}
        </a>{' '}
        or write to{' '}
        <a href={`mailto:${COMPANY.email}`} className="font-semibold text-slate-700 hover:text-indigo-700 dark:text-slate-200 dark:hover:text-indigo-300">
          {COMPANY.email}
        </a>
        .
      </p>
    </Reveal>
  );
}
