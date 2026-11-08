import { ImageResponse } from 'next/og';
import { CATEGORIES, FACTS } from '@/website/content/site';
import { FEATURE_MAP } from '@/website/content/features';
import { OG_SIZE, OgCard } from '@/website/og-card';

export const alt = 'Vidyalaya School ERP feature';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const f = FEATURE_MAP[(await params).slug];
  return new ImageResponse(
    <OgCard
      eyebrow={f ? (CATEGORIES.find((c) => c.key === f.category)?.label ?? 'Feature') : 'Feature'}
      title={f?.seo?.title ?? f?.title ?? 'Vidyalaya School ERP'}
      subtitle={f?.tagline ?? ''}
      chips={[`${f?.screens.length ?? 0} real screens`, `${FACTS.languages} languages`, 'Free trial']}
    />,
    size,
  );
}
