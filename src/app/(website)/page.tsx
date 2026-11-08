import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { FACTS, SITE } from '@/website/content/site';
import { SHOW_SAMPLE_CONTENT } from '@/website/content/placeholder';
import { JsonLd, faqLd, organizationLd, softwareLd, websiteLd } from '@/website/structured-data';
import { FEATURES } from '@/website/content/features';
import { getPublicPlans } from '@/website/server/plans';
import { SectionHeading } from '@/website/components/section';
import { FeatureCarousel } from '@/website/components/feature-carousel';
import { FeatureGrid } from '@/website/components/feature-grid';
import { PricingCards } from '@/website/components/pricing-cards';
import { Faq } from '@/website/components/faq';
import { CtaBand } from '@/website/components/cta-band';
import { Hero } from '@/website/components/home/hero';
import { TrustBar } from '@/website/components/home/trust-bar';
import { Stats } from '@/website/components/home/stats';
import { PlatformOrbit } from '@/website/components/home/platform-orbit';
import { Insights } from '@/website/components/home/insights';
import { RoleShowcase } from '@/website/components/home/role-showcase';
import { AppShowcase } from '@/website/components/home/app-showcase';
import { Languages } from '@/website/components/home/languages';
import { Security } from '@/website/components/home/security';
import { HowItWorks } from '@/website/components/home/how-it-works';
import { Testimonials } from '@/website/components/home/testimonials';

// Static and cached at the edge; refreshed every 5 minutes for live plan prices.
// Signed-in users never see it: src/proxy.ts sends them to their workspace.
export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: 'School Management Software & ERP for Indian Schools | Vidyalaya' },
  description: SITE.description,
  alternates: { canonical: '/' },
  openGraph: { title: 'Vidyalaya — School ERP & management software for Indian schools', description: SITE.description, type: 'website', siteName: SITE.product, locale: 'en_IN', url: '/' },
  twitter: { card: 'summary_large_image', title: 'Vidyalaya — School ERP for Indian schools', description: SITE.description },
};

export default async function Home() {
  const plans = await getPublicPlans();

  return (
    <>
      <JsonLd data={[organizationLd(), websiteLd(), softwareLd(plans), faqLd()]} />
      <Hero />
      <TrustBar />
      <Stats />

      <section id="features" className="scroll-mt-20 py-20 lg:py-28">
        <div className="web-container">
          <SectionHeading eyebrow="Comprehensive features" title={<>Everything your school needs, <span className="web-text-gradient">beautifully connected</span></>} lead={`${FEATURES.length} solutions built from ${FACTS.modules} modules — explore them one by one, with real screens from Vidyalaya.`} />
          <div className="mt-12">
            <FeatureCarousel />
          </div>
        </div>
      </section>

      <PlatformOrbit />
      <Insights />
      <RoleShowcase />

      <section className="bg-slate-50 dark:bg-white/[0.04] py-20 lg:py-28">
        <div className="web-container">
          <SectionHeading eyebrow="Single stop solution" title={`${FEATURES.length} solutions. ${FACTS.modules} modules. One login.`} lead="Switch on what your school needs today and add more as you grow. Every module shares the same students, staff and fees." />
          <div className="mt-12">
            <FeatureGrid />
          </div>
          <div className="mt-10 text-center">
            <Link href="/features" className="web-btn web-btn-secondary">
              See every feature in detail <ArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <AppShowcase />
      <Languages />
      <Security />
      <HowItWorks />
      {SHOW_SAMPLE_CONTENT && <Testimonials />}

      <section id="pricing" className="scroll-mt-20 bg-gradient-to-b from-white dark:from-slate-950 via-indigo-50/40 dark:via-indigo-950/30 to-white dark:to-slate-950 py-20 lg:py-28">
        <div className="web-container">
          <SectionHeading eyebrow="Simple pricing" title="Plans that grow with your school" lead={`Every plan includes the parent & student app and all ${FACTS.languages} languages. Prices come straight from our live plan catalogue.`} />
          <div className="mt-14">
            <PricingCards plans={plans} />
          </div>
          <div className="mt-10 text-center">
            <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 hover:gap-2.5">
              Compare every module by plan <ArrowRight className="size-4 transition-all" />
            </Link>
          </div>
        </div>
      </section>

      <Faq />
      <CtaBand />
    </>
  );
}
