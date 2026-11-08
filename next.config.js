/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV !== 'production';

// Google tag (GA4 / Google Ads) on the public website — only when an ID is configured
// (src/website/analytics.ts). Domains from Google's CSP guide for GA4 + Ads, incl. google.co.in.
const googleTag = Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GOOGLE_ADS_ID);
const gtagScript = googleTag ? ' https://*.googletagmanager.com https://www.googleadservices.com https://*.doubleclick.net' : '';
const gtagConnect = googleTag
  ? ' https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com https://*.doubleclick.net https://www.googleadservices.com https://pagead2.googlesyndication.com https://www.google.com https://www.google.co.in'
  : '';

// Next.js injects inline bootstrap scripts, so script-src needs 'unsafe-inline'
// unless nonces are wired through every page. Everything else is locked down:
// no framing (clickjacking), no plugins, no foreign form targets.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://checkout.razorpay.com${gtagScript}${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  `connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com${gtagConnect}`,
  // https: — Google Docs/Drive and YouTube previews, and the school's own tools in Apps (App Frame).
  "frame-src 'self' https:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ['upgrade-insecure-requests']),
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=(self), geolocation=(self), payment=(self "https://checkout.razorpay.com")' },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  ...(isDev ? [] : [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]),
];

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ['bcryptjs', 'exceljs'],
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  experimental: {
    serverActions: { bodySizeLimit: '2mb' },
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/api/:path*', headers: [{ key: 'Cache-Control', value: 'no-store' }] },
    ];
  },
};

module.exports = nextConfig;
