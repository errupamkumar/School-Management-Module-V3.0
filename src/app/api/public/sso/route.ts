import { NextResponse } from 'next/server';
import { z } from 'zod';
import { badRequest, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { readSettings } from '@/server/settings';
import { PROVIDER_IDS, SSO_COOKIE, SSO_ERRORS, ssoProviderConfigured } from '@/server/sso';

/** Which SSO buttons the login page should offer (configured on this server). */
export const GET = publicRoute({ name: 'sso-info', limit: 300, windowSec: 600 }, async () => ({
  google: ssoProviderConfigured('google'),
  microsoft: ssoProviderConfigured('microsoft'),
}));

/**
 * Step 1 of SSO: remember which school the user is signing in to (short-lived,
 * httpOnly cookie) and tell the page which NextAuth provider to start. The
 * school is only a lookup hint: the provider's verified email must still match
 * a user of that school, so a tampered cookie gains nothing.
 */
export const POST = publicRoute({ name: 'sso-start', limit: 30, windowSec: 600 }, async (req) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const input = z.object({ schoolCode: z.string().trim().min(2).max(32), provider: z.enum(['google', 'microsoft']) }).parse(raw);
  if (!ssoProviderConfigured(input.provider)) throw badRequest(SSO_ERRORS.SSO_SCHOOL);
  const school = await prisma.school.findUnique({ where: { code: input.schoolCode.toUpperCase() }, select: { status: true, settings: true } });
  if (!school || school.status === 'SUSPENDED' || school.status === 'CANCELLED' || !readSettings(school.settings).sso[input.provider]) throw badRequest(SSO_ERRORS.SSO_SCHOOL);
  const res = NextResponse.json({ success: true, data: { providerId: PROVIDER_IDS[input.provider] } });
  res.cookies.set(SSO_COOKIE, input.schoolCode.toUpperCase(), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 });
  return res;
});
