'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, GraduationCap, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form';
import { applyPalette } from '@/lib/theme';

interface SchoolInfo {
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
  state: string | null;
  board: string | null;
  themeColor: string;
  phone: string | null;
  email: string | null;
  classes: Array<{ id: string; label: string }>;
}

export default function ApplyPage() {
  const { code } = useParams<{ code: string }>();
  const [school, setSchool] = React.useState<SchoolInfo | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [v, setV] = React.useState({ studentName: '', gender: '', dob: '', classId: '', guardianName: '', guardianPhone: '', guardianEmail: '', address: '', previousSchool: '', message: '', website: '' });
  const [consent, setConsent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState<{ applicationNo: string; duplicate: boolean } | null>(null);

  React.useEffect(() => {
    fetch(`/api/public/schools/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.success) throw new Error(j.error);
        setSchool(j.data);
        applyPalette(j.data.themeColor);
        document.title = `Apply · ${j.data.name}`;
      })
      .catch((e) => setLoadError(e.message ?? 'School not found'));
  }, [code]);

  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const res = await fetch(`/api/public/admissions/${encodeURIComponent(code)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, consent }) });
      const j = await res.json();
      if (!j.success) {
        setErrors(j.details ?? { _: j.error });
        return;
      }
      setDone(j.data);
    } catch {
      setErrors({ _: 'Could not submit. Please check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  if (loadError)
    return (
      <div className="flex min-h-dvh items-center justify-center p-6 text-center">
        <div>
          <p className="text-lg font-semibold">Online admission is not available</p>
          <p className="mt-1 text-sm text-ink-soft">{loadError}</p>
        </div>
      </div>
    );
  if (!school)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-brand-600" />
      </div>
    );

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-6 pb-24 pt-10 text-white">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          {school.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={school.logoUrl} alt="" className="size-14 rounded-2xl bg-white object-contain p-1" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-2xl bg-white/15">
              <GraduationCap className="size-7" />
            </span>
          )}
          <div>
            <h1 className="text-2xl font-bold">{school.name}</h1>
            <p className="text-sm text-white/80">{[school.tagline, school.board, [school.city, school.state].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        <p className="mx-auto mt-6 max-w-3xl text-lg font-semibold">Online admission application</p>
      </header>
      <main className="mx-auto -mt-16 max-w-3xl px-4 pb-16">
        <div className="card p-6 sm:p-8">
          {done ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
              <h2 className="mt-4 text-xl font-bold">{done.duplicate ? 'We already have your application' : 'Application submitted'}</h2>
              <p className="mt-2 text-sm text-ink-soft">
                Your application number is <b className="font-mono text-ink">{done.applicationNo}</b>. The admissions office will contact you on {v.guardianPhone || 'your mobile'} soon.
              </p>
              {school.phone && <p className="mt-4 text-xs text-ink-faint">Questions? Call {school.phone}</p>}
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-6" noValidate>
              <section className="grid gap-4 sm:grid-cols-2">
                <h2 className="text-base font-semibold sm:col-span-2">Child’s details</h2>
                <Field label="Full name" required error={errors.studentName} className="sm:col-span-2">
                  <Input value={v.studentName} onChange={(e) => set('studentName', e.target.value)} autoComplete="off" />
                </Field>
                <Field label="Class applying for" required error={errors.classId}>
                  <Select value={v.classId} onChange={(e) => set('classId', e.target.value)} options={school.classes.map((c) => ({ value: c.id, label: c.label }))} placeholder="Choose…" />
                </Field>
                <Field label="Gender" required error={errors.gender}>
                  <Select value={v.gender} onChange={(e) => set('gender', e.target.value)} options={[{ value: 'MALE', label: 'Male' }, { value: 'FEMALE', label: 'Female' }, { value: 'OTHER', label: 'Other' }]} placeholder="Choose…" />
                </Field>
                <Field label="Date of birth" required error={errors.dob}>
                  <Input type="date" value={v.dob} onChange={(e) => set('dob', e.target.value)} />
                </Field>
                <Field label="Previous school" error={errors.previousSchool}>
                  <Input value={v.previousSchool} onChange={(e) => set('previousSchool', e.target.value)} />
                </Field>
              </section>
              <section className="grid gap-4 sm:grid-cols-2">
                <h2 className="text-base font-semibold sm:col-span-2">Parent / guardian</h2>
                <Field label="Name" required error={errors.guardianName}>
                  <Input value={v.guardianName} onChange={(e) => set('guardianName', e.target.value)} autoComplete="name" />
                </Field>
                <Field label="Mobile" required error={errors.guardianPhone}>
                  <Input value={v.guardianPhone} onChange={(e) => set('guardianPhone', e.target.value)} inputMode="numeric" autoComplete="tel" placeholder="98XXXXXXXX" />
                </Field>
                <Field label="Email" error={errors.guardianEmail} className="sm:col-span-2">
                  <Input type="email" value={v.guardianEmail} onChange={(e) => set('guardianEmail', e.target.value)} autoComplete="email" />
                </Field>
                <Field label="Address" error={errors.address} className="sm:col-span-2">
                  <Textarea rows={2} value={v.address} onChange={(e) => set('address', e.target.value)} />
                </Field>
                <Field label="Anything you’d like us to know?" className="sm:col-span-2">
                  <Textarea rows={2} value={v.message} onChange={(e) => set('message', e.target.value)} />
                </Field>
              </section>
              {/* Honeypot for bots — hidden from people and screen readers. */}
              <input tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 opacity-0" value={v.website} onChange={(e) => set('website', e.target.value)} name="website" />
              <label className="flex items-start gap-3 rounded-xl bg-canvas p-4 text-sm">
                <Checkbox checked={consent} onCheckedChange={(x) => setConsent(!!x)} />
                <span>
                  I consent to {school.name} processing the information above to evaluate this admission application, in line with the Digital Personal Data Protection Act, 2023. It will not be shared with third parties for marketing.
                </span>
              </label>
              {errors._ && <p className="text-sm text-rose-600">{errors._}</p>}
              {errors.consent && <p className="text-sm text-rose-600">{errors.consent}</p>}
              <Button type="submit" size="lg" className="w-full" loading={busy} disabled={!consent}>
                Submit application
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-xs text-ink-faint">
                <ShieldCheck className="size-3.5" /> Secured · Powered by Vidyalaya ERP
              </p>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
