'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/form';

interface Info {
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  city: string | null;
  state: string | null;
}

/** Public alumni self-registration (no sign-in). The school approves entries before they appear in its directory. */
export default function AlumniJoin() {
  const { code } = useParams<{ code: string }>();
  const [info, setInfo] = React.useState<Info | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [v, setV] = React.useState({ name: '', passingYear: '', lastClass: '', email: '', phone: '', currentStatus: '', organisation: '', designation: '', higherEducation: '', city: '', linkedinUrl: '', achievements: '', consentToContact: true, isMentor: false });
  React.useEffect(() => {
    fetch(`/api/public/alumni/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((j) => (j.success ? setInfo(j.data) : setError(j.error ?? 'Not found')))
      .catch(() => setError('Could not load this page.'));
  }, [code]);
  const set = (k: string, val: unknown) => setV((s) => ({ ...s, [k]: val }));
  if (error) return <p className="p-10 text-center text-sm text-ink-soft">{error}</p>;
  if (!info) return <p className="p-10 text-center text-sm text-ink-faint">Loading…</p>;
  return (
    <div className="min-h-dvh bg-canvas px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          {info.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.logoUrl} alt="" className="size-14 rounded-xl object-contain" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-xl bg-brand-600 text-white">
              <GraduationCap className="size-7" />
            </span>
          )}
          <div>
            <h1 className="text-xl font-bold">{info.name} — Alumni</h1>
            <p className="text-sm text-ink-soft">Stay connected with your school. The school checks each entry before adding it to the alumni directory.</p>
          </div>
        </div>
        {done ? (
          <div className="card p-8 text-center">
            <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
            <p className="mt-3 text-lg font-semibold">Thank you!</p>
            <p className="text-sm text-ink-soft">Your details have been sent to the school.</p>
          </div>
        ) : (
          <form
            className="card grid gap-4 p-6 sm:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError(null);
              try {
                const res = await fetch(`/api/public/alumni/${encodeURIComponent(code)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, passingYear: Number(v.passingYear) }) });
                const j = await res.json();
                if (!res.ok || !j.success) throw new Error(j.error ?? 'Could not submit');
                setDone(true);
              } catch (err) {
                alert((err as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Full name" required className="sm:col-span-2">
              <Input value={v.name} onChange={(e) => set('name', e.target.value)} required minLength={2} />
            </Field>
            <Field label="Year you left school" required>
              <Input type="number" min={1950} max={new Date().getFullYear() + 1} value={v.passingYear} onChange={(e) => set('passingYear', e.target.value)} required />
            </Field>
            <Field label="Last class">
              <Input value={v.lastClass} onChange={(e) => set('lastClass', e.target.value)} placeholder="Class 12 Science" />
            </Field>
            <Field label="Email">
              <Input type="email" value={v.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Mobile">
              <Input type="tel" value={v.phone} onChange={(e) => set('phone', e.target.value)} placeholder="10-digit mobile" />
            </Field>
            <Field label="What do you do now?">
              <Select value={v.currentStatus} onChange={(e) => set('currentStatus', e.target.value)} options={[{ value: 'STUDYING', label: 'Studying' }, { value: 'EMPLOYED', label: 'Working' }, { value: 'SELF_EMPLOYED', label: 'Own business' }, { value: 'OTHER', label: 'Other' }]} placeholder="Choose…" />
            </Field>
            <Field label="City">
              <Input value={v.city} onChange={(e) => set('city', e.target.value)} />
            </Field>
            <Field label="College / company">
              <Input value={v.organisation} onChange={(e) => set('organisation', e.target.value)} />
            </Field>
            <Field label="Course / role">
              <Input value={v.designation} onChange={(e) => set('designation', e.target.value)} />
            </Field>
            <Field label="Higher education" className="sm:col-span-2">
              <Input value={v.higherEducation} onChange={(e) => set('higherEducation', e.target.value)} placeholder="B.Tech, IIT Delhi (2024)" />
            </Field>
            <Field label="LinkedIn (https://…)" className="sm:col-span-2">
              <Input value={v.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
            </Field>
            <Field label="Achievements" className="sm:col-span-2">
              <Textarea rows={3} value={v.achievements} onChange={(e) => set('achievements', e.target.value)} />
            </Field>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={v.isMentor} onCheckedChange={(c) => set('isMentor', c)} /> I can mentor current students
            </label>
            <label className="flex items-center gap-3 text-sm sm:col-span-2">
              <Switch checked={v.consentToContact} onCheckedChange={(c) => set('consentToContact', c)} /> The school may contact me about alumni events
            </label>
            <Button type="submit" loading={busy} className="sm:col-span-2">
              Submit
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
