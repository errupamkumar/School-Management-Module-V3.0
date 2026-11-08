import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { authSecret } from '@/server/env';

/**
 * Coarse page gate. Fine-grained permission checks happen in every API route
 * (src/server/api.ts); this only keeps signed-out users off app pages and
 * routes users who must change their password to that screen.
 */

const PUBLIC_PREFIXES = ['/login', '/apply', '/verify', '/news/', '/alumni-join/', '/api/auth', '/api/public', '/_next', '/favicon', '/robots.txt', '/sw.js', '/manifest.webmanifest', '/icons/', '/offline.html'];
// Marketing website pages (src/app/(website)); `/` itself is handled below.
const WEBSITE_PATHS = ['/features', '/pricing', '/get-started'];
const isWebsitePath = (p: string) => WEBSITE_PATHS.some((w) => p === w || p.startsWith(`${w}/`));
const PASSWORD_CHANGE_ALLOWED = ['/change-password', '/api/me', '/api/auth'];

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (pathname === '/' || isWebsitePath(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = (await getToken({ req, secret: authSecret() })) as { sub?: string; role?: string; mcp?: boolean } | null;

  if (pathname.startsWith('/api/')) {
    // API routes authenticate themselves and return JSON errors.
    return NextResponse.next();
  }

  if (!token?.sub) {
    const url = new URL('/login', req.url);
    url.searchParams.set('callbackUrl', pathname + search);
    return NextResponse.redirect(url);
  }

  if (token.mcp && !PASSWORD_CHANGE_ALLOWED.some((p) => pathname.startsWith(p))) {
    return NextResponse.redirect(new URL('/change-password', req.url));
  }

  if (pathname.startsWith('/platform') && token.role !== 'PLATFORM_ADMIN') {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
  if (!pathname.startsWith('/platform') && token.role === 'PLATFORM_ADMIN' && pathname !== '/change-password') {
    return NextResponse.redirect(new URL('/platform', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)'],
};
