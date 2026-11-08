import type { Metadata } from 'next';
import { Check, Minus } from 'lucide-react';
import { MODULES, type ModuleGroup } from '@/lib/modules';
import { FACTS, FAQS } from '@/website/content/site';
import { getPublicPlans, planPrice } from '@/website/server/plans';
import { Reveal } from '@/website/components/motion';
import { SectionHeading } from '@/website/components/section';
import { PricingCards } from '@/website/components/pricing-cards';
import { Faq } from '@/website/components/faq';
import { CtaBand } from '@/website/components/cta-band';
import { JsonLd, faqLd, softwareLd } from '@/website/structured-data';

export const revalidate = 300;

export const metadata: Metadata = {
  title: 'School ERP Pricing & Plans',
  description: `Vidyalaya plans for every size of school. Compare all ${FACTS.modules} modules by plan.`,
  alternates: { canonical: '/pricing' },
};

export default async function PricingPage() {
  const plans = await getPublicPlans();
  const groups = MODULES.reduce<Map<ModuleGroup, (typeof MODULES)[number][]>>((m, mod) => m.set(mod.group, [...(m.get(mod.group) ?? []), mod]), new Map());

  return (
    <>
      <section className="relative -mt-16 overflow-hidden pt-16 lg:-mt-[4.5rem] lg:pt-[4.5rem]">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/80 dark:from-indigo-950/40 via-white dark:via-slate-950 to-white dark:to-slate-950" aria-hidden="true" />
        <div className="web-grid-bg web-mask-fade pointer-events-none absolute inset-0 -z-10" aria-hidden="true" />
        <div className="web-container pb-16 pt-14 text-center lg:pt-20">
          <Reveal>
            <p className="web-eyebrow">Pricing</p>
            <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-[1.08] tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
              Simple plans. <span className="web-text-gradient">No surprises.</span>
            </h1>
            <p className="web-lead mx-auto mt-5 max-w-2xl">Start with what you need and upgrade any time. Every plan includes the parent & student app, role-based access and all {FACTS.languages} languages.</p>
          </Reveal>
        </div>
        <div className="web-container pb-20">
          <PricingCards plans={plans} detailed />
        </div>
      </section>

      {plans && plans.length > 0 && (
        <section className="web-container pb-20">
          <SectionHeading eyebrow="Compare plans" title="Every module, side by side" />
          <Reveal className="mt-12">
            <div className="web-card overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left text-sm">
                <thead className="sticky top-0 bg-white dark:bg-slate-900">
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="p-4 font-display text-base font-bold text-slate-900 dark:text-white sm:p-5">Module</th>
                    {plans.map((p) => {
                      const price = planPrice(p);
                      return (
                        <th key={p.code} className="p-4 text-center sm:p-5">
                          <span className="block font-display text-base font-bold text-slate-900 dark:text-white">{p.name}</span>
                          <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                            {price.amount} {price.unit}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {[...groups].map(([group, mods]) => (
                    <GroupRows key={group} group={group} mods={mods} plans={plans} />
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>
      )}

      <JsonLd data={[softwareLd(plans), faqLd(FAQS.slice(0, 5))]} />
      <Faq items={FAQS.slice(0, 5)} />
      <CtaBand title="Not sure which plan fits?" lead="Tell us about your school and we will recommend the right plan — and set it up for you." />
    </>
  );
}

function GroupRows({ group, mods, plans }: { group: string; mods: (typeof MODULES)[number][]; plans: NonNullable<Awaited<ReturnType<typeof getPublicPlans>>> }) {
  return (
    <>
      <tr className="bg-slate-50 dark:bg-white/[0.04]">
        <td colSpan={plans.length + 1} className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 sm:px-5">
          {group}
        </td>
      </tr>
      {mods.map((m) => (
        <tr key={m.key} className="border-b border-slate-100 dark:border-white/10 last:border-0">
          <td className="p-4 sm:px-5">
            <span className="block font-medium text-slate-800 dark:text-slate-100">{m.label}</span>
            <span className="block text-xs text-slate-500 dark:text-slate-400">{m.description}</span>
          </td>
          {plans.map((p) => (
            <td key={p.code} className="p-4 text-center">
              {p.modules.includes(m.key) ? <Check className="mx-auto size-5 text-emerald-500" strokeWidth={3} aria-label="Included" /> : <Minus className="mx-auto size-4 text-slate-300" aria-label="Not included" />}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
