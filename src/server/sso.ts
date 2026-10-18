import { prisma } from './db';
import { readSettings } from './settings';

/**
 * Single sign-on with Google Workspace and Microsoft 365 (Azure AD / Entra ID).
 *
 * The OAuth apps are registered once by the platform operator (env vars below);
 * each school then switches the providers on in School Settings and may limit
 * them to its own email domains. A provider only signs in an EXISTING active
 * user of the chosen school whose email matches the verified email from the
 * provider — SSO never creates accounts or changes roles.
 */
export type SsoProvider = 'google' | 'microsoft';

/** NextAuth provider ids. */
export const PROVIDER_IDS: Record<SsoProvider, string> = { google: 'google', microsoft: 'azure-ad' };

export const SSO_COOKIE = 'vsso';

export function ssoProviderConfigured(p: SsoProvider): boolean {
  if (p === 'google') return !!(process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim());
  return !!(process.env.AZURE_AD_CLIENT_ID?.trim() && process.env.AZURE_AD_CLIENT_SECRET?.trim());
}

export function providerFromId(id: string | undefined): SsoProvider | null {
  if (id === 'google') return 'google';
  if (id === 'azure-ad') return 'microsoft';
  return null;
}

export function emailDomainAllowed(email: string, allowed: string[]): boolean {
  if (!allowed.length) return true;
  const domain = email.split('@')[1]?.toLowerCase() ?? '';
  return allowed.some((d) => domain === d.toLowerCase());
}

/** Login-page error codes for SSO failures. */
export const SSO_ERRORS = {
  SSO_SCHOOL: 'This sign-in option is not turned on for that school. Use your username and password.',
  SSO_EMAIL: 'Your account provider did not confirm your email address.',
  SSO_DOMAIN: 'Sign in with your school email address.',
  SSO_NO_ACCOUNT: 'No active account in this school uses that email. Ask the school office to add your email to your profile.',
} as const;
export type SsoErrorCode = keyof typeof SSO_ERRORS | 'SUSPENDED' | 'LOCKED';

export type SsoResult =
  | { ok: true; user: { id: string; name: string; email: string | null; role: string; schoolId: string | null; sessionVersion: number; mustChangePassword: boolean } }
  | { ok: false; code: SsoErrorCode; schoolId?: string };

/** Pure policy check, unit-tested: is this provider usable for this school and email? */
export function ssoPolicy(settings: { sso: { google: boolean; microsoft: boolean; allowedDomains: string[] } }, provider: SsoProvider, email: string | null, emailVerified: boolean): SsoErrorCode | null {
  if (!settings.sso[provider]) return 'SSO_SCHOOL';
  if (!email || !emailVerified) return 'SSO_EMAIL';
  if (!emailDomainAllowed(email, settings.sso.allowedDomains)) return 'SSO_DOMAIN';
  return null;
}

export async function resolveSsoUser(provider: SsoProvider, schoolCode: string | undefined, email: string | null, emailVerified: boolean): Promise<SsoResult> {
  const code = (schoolCode ?? '').trim().toUpperCase().slice(0, 32);
  if (!code) return { ok: false, code: 'SSO_SCHOOL' };
  const school = await prisma.school.findUnique({ where: { code }, select: { id: true, status: true, settings: true } });
  if (!school) return { ok: false, code: 'SSO_SCHOOL' };
  if (school.status === 'SUSPENDED' || school.status === 'CANCELLED') return { ok: false, code: 'SUSPENDED', schoolId: school.id };
  const denied = ssoPolicy(readSettings(school.settings), provider, email, emailVerified);
  if (denied) return { ok: false, code: denied, schoolId: school.id };
  const users = await prisma.user.findMany({
    where: { schoolId: school.id, email: email!.toLowerCase(), isActive: true, role: { not: 'PLATFORM_ADMIN' } },
    select: { id: true, name: true, email: true, role: true, schoolId: true, sessionVersion: true, mustChangePassword: true, lockedUntil: true },
    take: 2,
  });
  // Ambiguous (two accounts share the email) is treated as no match rather than guessing.
  if (users.length !== 1) return { ok: false, code: 'SSO_NO_ACCOUNT', schoolId: school.id };
  const u = users[0];
  if (u.lockedUntil && u.lockedUntil > new Date()) return { ok: false, code: 'LOCKED', schoolId: school.id };
  return { ok: true, user: { id: u.id, name: u.name, email: u.email, role: u.role, schoolId: u.schoolId, sessionVersion: u.sessionVersion, mustChangePassword: u.mustChangePassword } };
}
