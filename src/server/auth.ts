import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import AzureADProvider from 'next-auth/providers/azure-ad';
import { cookies } from 'next/headers';
import { prisma } from './db';
import { authSecret } from './env';
import { burnPasswordCheck, verifyPassword } from './crypto';
import { rateLimit } from './rate-limit';
import { writeAudit } from './audit';
import { providerFromId, resolveSsoUser, ssoProviderConfigured, SSO_COOKIE } from './sso';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

/** Error codes surfaced to the login page (never reveal which field was wrong). */
export const LOGIN_ERRORS = {
  INVALID: 'Invalid school code, username or password.',
  LOCKED: `Too many failed attempts. Try again in ${LOCK_MINUTES} minutes or ask your administrator to reset your password.`,
  SUSPENDED: 'This school account is suspended. Please contact support.',
  RATE_LIMITED: 'Too many login attempts from this network. Please wait a few minutes.',
} as const;

function headerValue(headers: Record<string, unknown> | undefined, name: string): string {
  const v = headers?.[name];
  return Array.isArray(v) ? String(v[0] ?? '') : String(v ?? '');
}

export const authOptions: NextAuthOptions = {
  secret: authSecret(),
  session: { strategy: 'jwt', maxAge: 12 * 60 * 60, updateAge: 60 * 60 },
  pages: { signIn: '/login', error: '/login' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        schoolCode: { label: 'School code', type: 'text' },
        identifier: { label: 'Username, email or mobile', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        const schoolCode = (credentials?.schoolCode ?? '').trim().toUpperCase().slice(0, 32);
        const identifier = (credentials?.identifier ?? '').trim().slice(0, 120);
        const password = credentials?.password ?? '';
        if (!identifier || !password || password.length > 200) throw new Error('INVALID');

        const headers = (req as { headers?: Record<string, unknown> })?.headers;
        const ip = headerValue(headers, 'x-forwarded-for').split(',')[0].trim() || 'unknown';
        const userAgent = headerValue(headers, 'user-agent');

        const [byIp, byAccount] = await Promise.all([
          rateLimit(`login:ip:${ip}`, 30, 15 * 60),
          rateLimit(`login:acct:${schoolCode}:${identifier.toLowerCase()}`, 10, 15 * 60),
        ]);
        if (!byIp.ok || !byAccount.ok) throw new Error('RATE_LIMITED');

        let schoolId: string | null = null;
        if (schoolCode) {
          const school = await prisma.school.findUnique({ where: { code: schoolCode }, select: { id: true, status: true } });
          if (!school) {
            await burnPasswordCheck(password);
            throw new Error('INVALID');
          }
          if (school.status === 'SUSPENDED' || school.status === 'CANCELLED') throw new Error('SUSPENDED');
          schoolId = school.id;
        }

        const idLower = identifier.toLowerCase();
        const user = await prisma.user.findFirst({
          where: {
            schoolId,
            ...(schoolId ? {} : { role: 'PLATFORM_ADMIN' }),
            OR: [{ username: idLower }, { email: idLower }, { phone: identifier }],
          },
        });

        if (!user || !user.isActive) {
          await burnPasswordCheck(password);
          await writeAudit({ schoolId, action: 'LOGIN_FAILED', entity: 'User', summary: `Unknown or inactive account "${identifier}"`, ip, userAgent });
          throw new Error('INVALID');
        }

        if (user.lockedUntil && user.lockedUntil > new Date()) throw new Error('LOCKED');

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) {
          const failed = user.failedLoginCount + 1;
          const lock = failed >= MAX_FAILED_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: lock ? 0 : failed,
              lockedUntil: lock ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
            },
          });
          await writeAudit({
            schoolId,
            userId: user.id,
            userName: user.name,
            role: user.role,
            action: lock ? 'ACCOUNT_LOCKED' : 'LOGIN_FAILED',
            entity: 'User',
            entityId: user.id,
            ip,
            userAgent,
          });
          throw new Error(lock ? 'LOCKED' : 'INVALID');
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });
        await writeAudit({ schoolId, userId: user.id, userName: user.name, role: user.role, action: 'LOGIN', entity: 'User', entityId: user.id, ip, userAgent });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: user.schoolId,
          sv: user.sessionVersion,
          mcp: user.mustChangePassword,
        } as never;
      },
    }),
    ...(ssoProviderConfigured('google') ? [GoogleProvider({ clientId: process.env.GOOGLE_CLIENT_ID!.trim(), clientSecret: process.env.GOOGLE_CLIENT_SECRET!.trim() })] : []),
    ...(ssoProviderConfigured('microsoft')
      ? [AzureADProvider({ clientId: process.env.AZURE_AD_CLIENT_ID!.trim(), clientSecret: process.env.AZURE_AD_CLIENT_SECRET!.trim(), tenantId: process.env.AZURE_AD_TENANT_ID?.trim() || 'organizations' })]
      : []),
  ],
  callbacks: {
    /**
     * SSO: the school comes from the short-lived cookie set by /api/auth/sso;
     * the provider's verified email must match one active user of that school.
     * The matched user's id, role and session version replace the provider
     * profile, so the rest of the app sees an ordinary session.
     */
    async signIn({ user, account, profile }) {
      const provider = providerFromId(account?.provider);
      if (!provider) return true;
      const p = (profile ?? {}) as { email?: string; email_verified?: boolean; preferred_username?: string };
      const email = (p.email ?? p.preferred_username ?? user.email ?? '').toLowerCase() || null;
      // Google states verification explicitly; Microsoft work accounts are verified by the tenant.
      const verified = provider === 'google' ? p.email_verified === true : !!email;
      const jar = await cookies();
      const result = await resolveSsoUser(provider, jar.get(SSO_COOKIE)?.value, email, verified);
      jar.delete(SSO_COOKIE);
      if (!result.ok) {
        await writeAudit({ schoolId: result.schoolId ?? null, action: 'LOGIN_FAILED', entity: 'User', summary: `${provider} sign-in refused (${result.code}) for ${email ?? 'unknown email'}` });
        return `/login?error=${result.code}`;
      }
      const u = result.user;
      await prisma.user.update({ where: { id: u.id }, data: { failedLoginCount: 0, lastLoginAt: new Date() } });
      await writeAudit({ schoolId: u.schoolId, userId: u.id, userName: u.name, role: u.role as never, action: 'LOGIN', entity: 'User', entityId: u.id, summary: `Signed in with ${provider === 'google' ? 'Google' : 'Microsoft'}` });
      Object.assign(user, { id: u.id, name: u.name, email: u.email, role: u.role, schoolId: u.schoolId, sv: u.sessionVersion, mcp: u.mustChangePassword, sso: true });
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        const u = user as unknown as { id: string; role: string; schoolId: string | null; sv: number; mcp: boolean };
        token.sub = u.id;
        token.role = u.role;
        token.schoolId = u.schoolId;
        token.sv = u.sv;
        token.mcp = u.mcp;
      }
      // After a password change the client calls `update()`; re-read the flags.
      if (trigger === 'update' && token.sub) {
        const fresh = await prisma.user.findUnique({
          where: { id: token.sub },
          select: { mustChangePassword: true, sessionVersion: true, name: true },
        });
        if (fresh) {
          token.mcp = fresh.mustChangePassword;
          token.sv = fresh.sessionVersion;
          token.name = fresh.name;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as Record<string, unknown>;
        u.id = token.sub;
        u.role = token.role;
        u.schoolId = token.schoolId;
        u.mustChangePassword = token.mcp;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // fall through
      }
      return baseUrl;
    },
  },
};
