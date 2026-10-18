'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { BadgeIndianRupee, Bus, CalendarCheck, Eye, EyeOff, GraduationCap, Lock, MessageSquare, ShieldCheck, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/form';

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

const FEATURES = [
  { icon: BadgeIndianRupee, text: 'UPI & online fee collection with instant receipts' },
  { icon: CalendarCheck, text: 'Attendance with SMS / WhatsApp alerts to parents' },
  { icon: MessageSquare, text: 'Parent & student app in English and हिंदी' },
  { icon: Bus, text: 'Transport with vehicle compliance reminders' },
  { icon: ShieldCheck, text: 'Role-based access, audit trail, encrypted Aadhaar' },
];

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

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-violet-700 p-12 text-white lg:flex lg:flex-col">
        <div className="absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-violet-400/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
            <GraduationCap className="size-6" />
          </span>
          <div>
            <p className="text-lg font-bold">Vidyalaya</p>
            <p className="text-xs text-white/70">School ERP for India</p>
          </div>
        </div>
        <div className="relative mt-auto max-w-lg">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">Run your entire school from one secure place.</h1>
          <p className="mt-4 text-white/80">Admissions to alumni — fees, attendance, exams, transport and parent communication, built for CBSE, ICSE and State Board schools.</p>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex size-8 items-center justify-center rounded-lg bg-white/15">
                  <f.icon className="size-4" />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-white/60">Data hosted in India · DPDP Act 2023 ready</p>
      </section>

      <section className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <GraduationCap className="size-5" />
            </span>
            <p className="text-lg font-bold">Vidyalaya</p>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Sign in</h2>
          <p className="mt-1 text-sm text-ink-soft">Students, parents and staff use the same login.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <Field label="School code" hint="Printed on your login slip, e.g. DEMO" htmlFor="school">
              <Input suppressHydrationWarning id="school" value={schoolCode} onChange={(e) => setSchoolCode(e.target.value.toUpperCase())} autoComplete="organization" placeholder="SCHOOL CODE" className="uppercase tracking-wider" />
            </Field>
            <Field label="Username, email or mobile" htmlFor="identifier">
              <Input suppressHydrationWarning id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoComplete="username" required autoFocus />
            </Field>
            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input suppressHydrationWarning id="password" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required className="pr-10" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink-faint hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            {error && (
              <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" size="lg" loading={loading} disabled={!identifier || !password}>
              <Lock /> Sign in securely
            </Button>
          </form>

          {(sso.google || sso.microsoft) && (
            <div className="mt-5">
              <p className="mb-3 flex items-center gap-3 text-xs text-ink-faint before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">or use your school email</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {sso.google && (
                  <Button type="button" variant="secondary" loading={ssoBusy === 'google'} onClick={() => startSso('google')}>
                    <svg viewBox="0 0 48 48" className="size-4" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
                    Google
                  </Button>
                )}
                {sso.microsoft && (
                  <Button type="button" variant="secondary" loading={ssoBusy === 'microsoft'} onClick={() => startSso('microsoft')}>
                    <svg viewBox="0 0 23 23" className="size-4" aria-hidden="true"><path fill="#f35325" d="M1 1h10v10H1z"/><path fill="#81bc06" d="M12 1h10v10H12z"/><path fill="#05a6f0" d="M1 12h10v10H1z"/><path fill="#ffba08" d="M12 12h10v10H12z"/></svg>
                    Microsoft
                  </Button>
                )}
              </div>
            </div>
          )}

          <p className="mt-6 flex items-center gap-2 text-xs text-ink-faint">
            <Smartphone className="size-3.5" /> Forgot password? Ask your school office to reset it.
          </p>

          {DEMO && (
            <div className="mt-8 rounded-2xl border border-dashed border-line p-4">
              <p className="text-xs font-semibold text-ink-soft">Demo accounts · school DEMO · password Demo@12345</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map(([u, label]) => (
                  <Button
                    key={u}
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSchoolCode('DEMO');
                      setIdentifier(u);
                      setPassword('Demo@12345');
                      void submit(undefined, { identifier: u, password: 'Demo@12345' });
                    }}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
