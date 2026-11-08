import type { MetadataRoute } from 'next';
import { FEATURES } from '@/website/content/features';

/** Public marketing pages only; the app itself sits behind sign-in. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return [
    { url: `${base}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/features`, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pricing`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/get-started`, changeFrequency: 'monthly', priority: 0.8 },
    ...FEATURES.map((f) => ({ url: `${base}/features/${f.slug}`, changeFrequency: 'monthly' as const, priority: 0.7 })),
  ];
}
