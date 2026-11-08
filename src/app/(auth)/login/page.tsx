'use client';

import * as React from 'react';
import { Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Loader2, Lock, Smartphone } from 'lucide-react';
import { Field } from '@/website/components/form-field';

const ERRORS: Record<string, string> = {
  INVALID: 'Invalid school code, username or password.',
  LOCKED: 'Too many failed attempts. Try again in 15 minutes or ask your administrator to reset your password.',
  SUSPENDED: 'This school account is suspended. Please contact support.',
  RATE_LIMITED: 'Too many login attempts from this network. Please wait a few minutes.',
  SSO_SCHOOL: 'This sign-in option is not turned on for that school. Use your username and password.',
  SSO_EMAIL: 'Your account provider did not confirm your email address.',
  SSO_DOMAIN: 'Sign in with your school email address.',
  SSO_NO_ACCOUNT: 'No active account in this school uses that email. Ask the school office to add your email to your profile.',
  OAuthSignin: 'Could not start single sign-on. Please try again.',
  OAuthCallback: 'Single sign-on was cancelled or failed. Please try again.',
  AccessDenied: 'Single sign-on was refused.',
};

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === '1';
const DEMO_ACCOUNTS = [
  ['owner', 'Owner'],
  ['admin', 'Principal'],
  ['teacher', 'Teacher'],
  ['accountant', 'Accountant'],
  ['reception', 'Front office'],
  ['parent', 'Parent'],
  ['student', 'Student'],
  ['librarian', 'Librarian'],
] as const;

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [schoolCode, setSchoolCode] = React.useState('');
  const [identifier, setIdentifier] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [show, setShow] = React.useState(false);
  const [error, setError] = React.useState<string | null>(params.get('reason') === 'expired' ? 'Your session ended. Please sign in again.' : params.get('error') ? (ERRORS[params.get('error')!] ?? ERRORS.OAuthCallback) : null);
  const [loading, setLoading] = React.useState(false);
  const [sso, setSso] = React.useState<{ google: boolean; microsoft: boolean }>({ google: false, microsoft: false });
  const [ssoBusy, setSsoBusy] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/public/sso')
      .then((r) => r.json())
      .then((j) => j.success && setSso(j.data))
      .catch(() => undefined);
  }, []);

  async function startSso(provider: 'google' | 'microsoft') {
    setError(null);
    if (!schoolCode.trim()) {
      setError('Enter your school code first.');
      return;
    }
    setSsoBusy(provider);
    try {
      const res = await fetch('/api/public/sso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ schoolCode: schoolCode.trim(), provider }) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? ERRORS.SSO_SCHOOL);
      try {
        localStorage.setItem('vidyalaya-school-code', schoolCode.trim().toUpperCase());
      } catch {
        // storage unavailable
      }
      await signIn(json.data.providerId, { callbackUrl: '/dashboard' });
    } catch (e) {
      setError((e as Error).message);
      setSsoBusy(null);
    }
  }

  React.useEffect(() => {
    const fromUrl = params.get('school');
    let saved: string | null = null;
    try {
      saved = localStorage.getItem('vidyalaya-school-code');
    } catch {
      // storage unavailable
    }
    setSchoolCode((fromUrl || saved || (DEMO ? 'DEMO' : '')).toUpperCase());
  }, [params]);

  async function submit(e?: React.FormEvent, override?: { identifier: string; password: string }) {
    e?.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn('credentials', {
      redirect: false,
      schoolCode: schoolCode.trim(),
      identifier: (override?.identifier ?? identifier).trim(),
      password: override?.password ?? password,
    });
    setLoading(false);
    if (!res || res.error) {
      setError(ERRORS[res?.error ?? ''] ?? ERRORS.INVALID);
      return;
    }
    try {
      if (schoolCode.trim()) localStorage.setItem('vidyalaya-school-code', schoolCode.trim().toUpperCase());
    } catch {
      // storage unavailable
    }
    const callback = params.get('callbackUrl');
    router.replace(callback && callback.startsWith('/') && !callback.startsWith('//') ? callback : '/');
    router.refresh();
  }

  const spinner = <Loader2 className="animate-spin" />;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className="w-full max-w-md">
      <div className="web-card p-6 sm:p-9">
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-3xl">Sign in</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">Students, parents and staff use the same login.</p>

        <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
          <Field label="School code" hint="Printed on your login slip, e.g. DEMO" htmlFor="school">
            <input suppressHydrationWarning id="school" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.toUpperCase())} autoComplete="organization" placeholder="SCHOOL CODE" className="web-input uppercase tracking-wider" />
          </Field>
          <Field label="Username, email or mobile" htmlFor="identifier">
            <input suppressHydrationWarning id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus className="web-input" />
          </Field>
          <Field label="Password" htmlFor="password">
            <div className="relative">
              <input suppressHydrationWarning id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="web-input pr-10" />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </Field>
          {error && (
            <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}
          <button type="submit" className="web-btn web-btn-primary w-full py-3.5 text-base" disabled={loading || !identifier || !password}>
            {loading ? spinner : <Lock />} Sign in securely
          </button>
        </form>

        {(sso.google || sso.microsoft) && (
          <div className="mt-5">
            <p className="mb-3 flex items-center gap-3 text-xs text-slate-400 before:h-px before:flex-1 before:bg-slate-200 after:h-px after:flex-1 after:bg-slate-200 dark:before:bg-white/10 dark:after:bg-white/10">or use your school email</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {sso.google && (
                <button type="button" className="web-btn web-btn-secondary" disabled={ssoBusy === 'google'} onClick={() => startSso('google')}>
                  {ssoBusy === 'google' ? (
                    spinner
                  ) : (
                    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                  )}
                  Google
                </button>
              )}
              {sso.microsoft && (
                <button type="button" className="web-btn web-btn-secondary" disabled={ssoBusy === 'microsoft'} onClick={() => startSso('microsoft')}>
                  {ssoBusy === 'microsoft' ? (
                    spinner
                  ) : (
                    <svg viewBox="0 0 23 23" className="size-4" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                  )}
                  Microsoft
                </button>
              )}
            </div>
          </div>
        )}

        <p className="mt-6 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Smartphone className="size-3.5" /> Forgot password? Ask your school office to reset it.
        </p>
        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          New to Vidyalaya?{' '}
          <Link href="/get-started" className="font-semibold text-indigo-700 hover:underline dark:text-indigo-300">
            Start a free trial for your school
          </Link>
        </p>

        {DEMO && (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-4 dark:border-white/15">
            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">Demo accounts · school DEMO · password Demo@12345</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map(([u, label]) => (
                <button
                  key={u}
                  type="button"
                  className="web-btn web-btn-secondary px-3 py-2"
                  onClick={() => {
                    setSchoolCode('DEMO');
                    setIdentifier(u);
                    setPassword('Demo@12345');
                    void submit(undefined, { identifier: u, password: 'Demo@12345' });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
