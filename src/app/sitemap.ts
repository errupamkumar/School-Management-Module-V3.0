import type { MetadataRoute } from 'next';
import { FEATURES } from '@/website/content/features';
import { siteUrl } from '@/website/site-url';

/** Public marketing pages only; the app itself sits behind sign-in. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();
  return [
    { url: `${base}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/features`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${base}/pricing`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/get-started`, lastModified, changeFrequency: 'monthly', priority: 0.8 },
    ...FEATURES.map((f) => ({ url: `${base}/features/${f.slug}`, lastModified, changeFrequency: 'monthly' as const, priority: 0.7 })),
    { url: `${base}/privacy`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, lastModified, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
