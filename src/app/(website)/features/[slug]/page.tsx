import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { FEATURES, FEATURE_MAP, relatedFeatures } from '@/website/content/features';
import { getPublicPlans } from '@/website/server/plans';
import { SectionHeading } from '@/website/components/section';
import { ScreenGallery } from '@/website/components/feature/screen-gallery';
import { Capabilities, FeatureHero, PlanAvailability, Roles, Steps } from '@/website/components/feature/feature-sections';
import { FeatureTile } from '@/website/components/feature-grid';
import { Stagger, StaggerItem } from '@/website/components/motion';
import { CtaBand } from '@/website/components/cta-band';

export const revalidate = 300;
export const dynamicParams = false;

export function generateStaticParams() {
  return FEATURES.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const f = FEATURE_MAP[(await params).slug];
  if (!f) return {};
  return {
    title: f.title,
    description: f.summary,
    openGraph: { title: `${f.title} · Vidyalaya School ERP`, description: f.tagline, images: [`/website/screens/${f.screens[0].id}.webp`] },
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const f = FEATURE_MAP[(await params).slug];
  if (!f) notFound();
  const plans = await getPublicPlans();

  return (
    <>
      <FeatureHero f={f} />

      <section className="web-container py-20 lg:py-24">
        <SectionHeading eyebrow="See it in Vidyalaya" title={`${f.short}, screen by screen`} lead="Every image on this page is a real Vidyalaya screen, captured with our demo school’s data." />
        <div className="mt-12">
          <ScreenGallery screens={f.screens} />
        </div>
      </section>

      <Capabilities f={f} />
      <Steps f={f} />
      <Roles f={f} />
      <PlanAvailability f={f} plans={plans} />

      <section className="web-container py-20">
        <SectionHeading align="left" eyebrow="Keep exploring" title="Works hand in hand with" />
        <Stagger className="mt-10 grid gap-4 md:grid-cols-3">
          {relatedFeatures(f.slug).map((r) => (
            <StaggerItem key={r.slug}>
              <FeatureTile f={r} />
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <CtaBand title={`Bring ${f.short} to your school`} lead={`${f.tagline} Start a free trial or book a live demo — we will set it up with your own data.`} />
    </>
  );
}
