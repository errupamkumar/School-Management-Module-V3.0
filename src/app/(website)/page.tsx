import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { ArrowRight } from 'lucide-react';
import { authOptions } from '@/server/auth';
import { FACTS, SITE } from '@/website/content/site';
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

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Vidyalaya — School ERP & school management software for India' },
  description: SITE.description,
  openGraph: { title: 'Vidyalaya — School ERP for India', description: SITE.description, type: 'website', images: ['/website/screens/03-dashboard-admin.webp'] },
};

/** Signed-in users go straight to their workspace, exactly as before the website existed. */
async function signedInDestination(): Promise<string | null> {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string; mustChangePassword?: boolean } | undefined;
    if (!user) return null;
    if (user.mustChangePassword) return '/change-password';
    return user.role === 'PLATFORM_ADMIN' ? '/platform' : '/dashboard';
  } catch {
    return null;
  }
}

export default async function Home() {
  const destination = await signedInDestination();
  if (destination) redirect(destination);
  const plans = await getPublicPlans();

  return (
    <>
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
      <Testimonials />

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
