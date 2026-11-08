'use client';

import * as React from 'react';
import Link from 'next/link';
import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowRight, CalendarCheck, Check, ChevronDown, Loader2, LogIn, Mail, Phone, Rocket, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FEATURES } from '../content/features';
import { SITE } from '../content/site';
import { INDIAN_STATES, LEAD_BOARDS, LEAD_ROLES, STUDENT_BANDS, leadSchema } from '../lead-schema';
import { readAttribution, track, trackLead } from '../analytics';
import { COMPANY, telHref } from '../content/company';
import { Field } from './form-field';

type Interest = 'trial' | 'demo';
type Errors = Partial<Record<string, string>>;

/** Pre-filled email with everything the visitor typed, for when the form cannot reach the server. */
function fallbackMailto(v: Record<string, string>, interest: Interest, features: string[]) {
  const lines = [
    `Request: ${interest === 'demo' ? 'Book a live demo' : 'Start free trial'}`,
    `School: ${v.schoolName}`,
    `Name: ${v.contactName}${v.role ? ` (${v.role})` : ''}`,
    `Email: ${v.email}`,
    `Mobile: ${v.phone}`,
    `City / State: ${[v.city, v.state].filter(Boolean).join(', ')}`,
    `Board: ${v.board}`,
    `Students: ${v.students}`,
    `Interested in: ${features.map((f) => FEATURES.find((x) => x.slug === f)?.short ?? f).join(', ')}`,
    '',
    v.message,
  ];
  return `mailto:${COMPANY.email}?subject=${encodeURIComponent(`Vidyalaya ${interest === 'demo' ? 'demo' : 'trial'} request — ${v.schoolName}`)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

function Success({ name, interest }: { name: string; interest: Interest }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="py-6 text-center">
      <div className="relative mx-auto size-24">
        <motion.span className="absolute inset-0 rounded-full bg-emerald-400/30" initial={{ scale: 0.6, opacity: 1 }} animate={{ scale: 1.6, opacity: 0 }} transition={{ duration: 1.4, repeat: 2 }} />
        <svg viewBox="0 0 96 96" className="relative size-24">
          <circle cx="48" cy="48" r="44" className="fill-emerald-500" />
          <motion.path d="M30 49 l12 12 l24 -26" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, delay: 0.2 }} />
        </svg>
      </div>
      <h2 className="mt-6 font-display text-2xl font-extrabold text-slate-900 dark:text-white sm:text-3xl">Thank you, {name.split(' ')[0] || 'there'}!</h2>
      <p className="mx-auto mt-3 max-w-md text-slate-600 dark:text-slate-300">
        {interest === 'demo' ? 'We will call you within one working day to fix a time for your live demo.' : 'We will call you within one working day to set up your school and share your login.'}
      </p>
      <ol className="mx-auto mt-8 max-w-sm space-y-3 text-left text-sm">
        {['We call to understand your school', interest === 'demo' ? 'A 30-minute live demo on your schedule' : 'Your school code and admin login are created', 'Your staff, students and fees are imported'].map((s, i) => (
          <li key={s} className="flex items-center gap-3 rounded-xl bg-slate-50 dark:bg-white/[0.04] px-4 py-3 text-slate-700 dark:text-slate-200">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
            {s}
          </li>
        ))}
      </ol>
      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link href="/features" className="web-btn web-btn-primary">
          Explore all features <ArrowRight />
        </Link>
        <Link href={SITE.loginHref} className="web-btn web-btn-secondary">
          <LogIn /> Log in
        </Link>
      </div>
    </motion.div>
  );
}

export function LeadForm({ initialInterest = 'trial', initialFeatures = [] }: { initialInterest?: Interest; initialFeatures?: string[] }) {
  const [interest, setInterest] = React.useState<Interest>(initialInterest);
  const [v, setV] = React.useState({ schoolName: '', contactName: '', role: '', email: '', phone: '', city: '', state: '', board: '', students: '', message: '', website: '' });
  const [features, setFeatures] = React.useState<string[]>(initialFeatures);
  const [showAll, setShowAll] = React.useState(initialFeatures.length > 0);
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Errors>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [fallback, setFallback] = React.useState(false);

  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setV((x) => ({ ...x, [k]: e.target.value }));
    if (errors[k]) setErrors((x) => ({ ...x, [k]: undefined }));
  };
  const toggleFeature = (slug: string) => setFeatures((fs) => (fs.includes(slug) ? fs.filter((s) => s !== slug) : [...fs, slug]));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFallback(false);
    const payload = { ...v, interest, features, consent, source: `${window.location.pathname}${window.location.search}`.slice(0, 200), attribution: readAttribution() };
    const parsed = leadSchema.safeParse(payload);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? '_');
        next[key] ??= issue.message;
      }
      setErrors(next);
      document.getElementById(Object.keys(next)[0])?.focus();
      return;
    }
    setBusy(true);
    try {
      const res = await fetch('/api/public/website/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string; details?: Errors };
      if (!res.ok || !json.success) {
        if (json.details) setErrors(json.details);
        // Server trouble (not a validation problem): offer direct contact so the request is not lost.
        if (res.status >= 500) setFallback(true);
        throw new Error(json.error ?? 'Could not send your request. Please try again.');
      }
      trackLead(interest);
      setDone(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      if (err instanceof TypeError) setFallback(true); // network failure
      track('lead_submit_failed', { reason: (err as Error).message.slice(0, 80) });
      setFormError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <Success name={v.contactName} interest={interest} />;

  const input = (k: keyof typeof v, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input id={k} name={k} value={v[k]} onChange={set(k)} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-error` : undefined} className={cn('web-input', errors[k] && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/15')} {...props} />
  );
  const select = (k: keyof typeof v, options: readonly string[], placeholder: string) => (
    <div className="relative">
      <select id={k} name={k} value={v[k]} onChange={set(k)} aria-invalid={!!errors[k]} className={cn('web-input appearance-none pr-9', !v[k] && 'text-slate-400')}>
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} className="text-slate-900 dark:text-white">
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
  );

  const visibleFeatures = showAll ? FEATURES : FEATURES.slice(0, 10);

  return (
    <form onSubmit={submit} noValidate className="relative space-y-6">
      <LayoutGroup id="interest">
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 dark:bg-white/10 p-1" role="radiogroup" aria-label="What would you like?">
          {(
            [
              ['trial', 'Start free trial', 'Free trial', Rocket],
              ['demo', 'Book a live demo', 'Live demo', CalendarCheck],
            ] as const
          ).map(([key, label, short, Icon]) => (
            <button key={key} type="button" role="radio" aria-checked={interest === key} aria-label={label} onClick={() => setInterest(key)} className={cn('relative flex items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 py-3 text-sm font-semibold transition-colors', interest === key ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white')}>
              {interest === key && <motion.span layoutId="interest-pill" className="absolute inset-0 rounded-xl bg-white dark:bg-slate-900 shadow-sm ring-1 ring-slate-200 dark:ring-white/10" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              <Icon className="relative size-4 shrink-0" />
              <span className="relative sm:hidden">{short}</span>
              <span className="relative hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </LayoutGroup>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="School name" htmlFor="schoolName" error={errors.schoolName} required className="sm:col-span-2">
          {input('schoolName', { placeholder: 'e.g. Green Valley Public School', autoComplete: 'organization' })}
        </Field>
        <Field label="Your name" htmlFor="contactName" error={errors.contactName} required>
          {input('contactName', { autoComplete: 'name' })}
        </Field>
        <Field label="Your role" htmlFor="role" error={errors.role}>
          {select('role', LEAD_ROLES, 'Select role')}
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email} required>
          {input('email', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
        </Field>
        <Field label="Mobile number" htmlFor="phone" error={errors.phone} required>
          {input('phone', { type: 'tel', autoComplete: 'tel', inputMode: 'tel', placeholder: '10-digit mobile' })}
        </Field>
        <Field label="City" htmlFor="city" error={errors.city}>
          {input('city', { autoComplete: 'address-level2' })}
        </Field>
        <Field label="State" htmlFor="state" error={errors.state}>
          {select('state', INDIAN_STATES, 'Select state')}
        </Field>
        <Field label="Board" htmlFor="board" error={errors.board}>
          {select('board', LEAD_BOARDS, 'Select board')}
        </Field>
        <Field label="Number of students" htmlFor="students" error={errors.students}>
          {select('students', STUDENT_BANDS, 'Select range')}
        </Field>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-200">What matters most to you?</legend>
        <div className="flex flex-wrap gap-2">
          {visibleFeatures.map((f) => {
            const on = features.includes(f.slug);
            return (
              <button key={f.slug} type="button" aria-pressed={on} onClick={() => toggleFeature(f.slug)} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset transition', on ? 'bg-indigo-600 text-white ring-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-white/10 hover:ring-indigo-300 dark:hover:ring-indigo-400/50')}>
                {on ? <Check className="size-3.5" strokeWidth={3} /> : <f.icon className="size-3.5 text-slate-400" />}
                {f.short}
              </button>
            );
          })}
          {!showAll && (
            <button type="button" onClick={() => setShowAll(true)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50">
              +{FEATURES.length - visibleFeatures.length} more
            </button>
          )}
        </div>
      </fieldset>

      <Field label="Anything else we should know?" htmlFor="message" error={errors.message}>
        <textarea id="message" name="message" value={v.message} onChange={set('message')} rows={3} className="web-input h-auto py-3" placeholder="Current software, number of campuses, go-live date…" />
      </Field>

      {/* Honeypot — hidden from people and assistive tech. */}
      <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} />
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (errors.consent) setErrors((x) => ({ ...x, consent: undefined }));
            }}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-300 dark:border-white/20 accent-indigo-600"
          />
          <span>
            I agree that Vidyalaya may contact me by phone, WhatsApp or email about this request. My details are used only for this purpose, as described in the{' '}
            <Link href="/privacy" target="_blank" className="font-semibold text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-300">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {errors.consent && <p className="mt-1.5 text-xs font-medium text-rose-600 dark:text-rose-400">{errors.consent}</p>}
      </div>

      <AnimatePresence>
        {formError && !fallback && (
          <motion.p role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
            {formError}
          </motion.p>
        )}
        {fallback && (
          <motion.div role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
            <p className="font-semibold">We couldn’t send your request just now.</p>
            <p className="mt-1">Your details are still here — send them to us directly and we will reply within one working day:</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={fallbackMailto(v, interest, features)} className="web-btn web-btn-primary px-4 py-2.5">
                <Mail /> Email my request
              </a>
              <a href={telHref(COMPANY.phones[0])} className="web-btn web-btn-secondary px-4 py-2.5">
                <Phone /> {COMPANY.phones[0]}
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button type="submit" disabled={busy} className="web-btn web-btn-primary w-full py-3.5 text-base">
        {busy ? <Loader2 className="animate-spin" /> : interest === 'demo' ? <CalendarCheck /> : <Rocket />}
        {busy ? 'Sending…' : interest === 'demo' ? 'Book my live demo' : 'Start my free trial'}
      </button>
      <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
        <ShieldCheck className="size-3.5 text-emerald-500" /> We never share your details. Already a customer?{' '}
        <Link href={SITE.loginHref} className="font-semibold text-indigo-700 dark:text-indigo-300 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
