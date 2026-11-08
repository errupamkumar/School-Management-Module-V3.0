import type { MetadataRoute } from 'next';
import { siteUrl } from '@/website/site-url';

/** Crawl the public website; keep APIs, printouts and signed-in areas out of search. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/print/', '/platform', '/dashboard', '/change-password'] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
