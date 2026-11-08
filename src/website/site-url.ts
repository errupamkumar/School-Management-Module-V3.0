/**
 * Public URL of the deployment, used for canonical links, the sitemap, robots.txt,
 * Open Graph images and structured data. Set NEXT_PUBLIC_SITE_URL once a custom
 * domain is live; on Vercel the production domain is picked up automatically.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel}` : '') || process.env.NEXTAUTH_URL?.trim() || 'http://localhost:3000';
  return url.replace(/\/+$/, '');
}

export const absoluteUrl = (path = '/') => `${siteUrl()}${path.startsWith('/') ? path : `/${path}`}`;
