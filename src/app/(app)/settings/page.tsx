'use client';

import * as React from 'react';
import { AppWindow, Database, Gavel, Globe, Mail, Video, BellRing, Building2, CreditCard, FileCode2, Hash, ImagePlus, KeyRound, Landmark, Languages, Map as MapIcon, MessageSquareText, Palette, Plus, Radio, Save, ScrollText, Settings, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api, useApiQuery, useInvalidate } from '@/lib/api-client';
import { PALETTES, PALETTE_NAMES, applyPalette } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useApp } from '@/components/shell/app-context';
import { ResourcePage } from '@/components/resource';
import { Button } from '@/components/ui/button';
import { Badge, Card, CardBody, CardHeader, ErrorState, LoadingBlock, PageHeader } from '@/components/ui/display';
import { Checkbox, Field, Input, Select, Switch, Textarea } from '@/components/ui/form';
import { LANGS } from '@/lib/i18n';
import { useLookups } from '@/lib/lookups';
import { Tabs, TabPanel, useConfirm } from '@/components/ui/overlay';

interface Profile {
  code: string;
  name: string;
  shortName: string | null;
  tagline: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  logoUrl: string | null;
  board: string | null;
  affiliationNo: string | null;
  udiseCode: string | null;
  establishedYear: number | null;
  themeColor: string;
  defaultLanguage: string;
  academicYearStartMonth: number;
  status: string;
  trialEndsAt: string | null;
  plan: { name: string; maxStudents: number | null; maxCampuses: number | null } | null;
}
interface BankAccount {
  bankName: string;
  branch?: string;
  accountName?: string;
  accountNo: string;
  ifsc?: string;
  upiId?: string;
  instructions?: string;
}
interface SettingsData {
  numbering: Record<string, string>;
  workingDays: number[];
  attendance: { notifyParentsOnAbsence: boolean; allowEditAfterDays: number };
  exams: { overallPassPercent: number; subjectPassPercent: number; maxFailedSubjects: number; showRank: boolean };
  fees: { allowPartialPayment: boolean; carryForwardDues: boolean; onlinePaymentEnabled: boolean; allowAdvance: boolean; receiptFooter: string };
  behaviourTraits: string[];
  skillTraits: string[];
  rules: { students: string; employees: string };
  bankAccounts: BankAccount[];
  messaging: { smsProvider: string; smsSenderId: string; whatsappProvider: string; whatsappPhoneNumberId?: string; smsApiKeySet: boolean; whatsappTokenSet: boolean; emailProvider?: string; smtpHost?: string; smtpPort?: number; smtpSecure?: boolean; smtpUser?: string; fromEmail?: string; fromName?: string; smtpPasswordSet?: boolean };
  payments: { razorpayKeyId: string; razorpayKeySecretSet: boolean; razorpayWebhookSecretSet: boolean; sandbox: boolean };
  ai: { dailyTokenLimitPerUser: number };
  liveTracking: { enabled: boolean; shareWithParents: boolean; pingIntervalSec: number; approachAlertMeters: number; retainDays: number };
  maps: { tileUrl: string; attribution: string };
  languages: { enabled: string[]; default: string };
  notifications: { pushEnabled: boolean };
  tally: { companyName: string; cashLedger: string; bankLedger: string; ledgerMap: Record<string, string> };
  remarkBank: string[];
  disciplineCategories: string[];
  gate: { notifyParents: boolean };
  sso: { google: boolean; microsoft: boolean; allowedDomains: string[]; googleAvailable?: boolean; microsoftAvailable?: boolean };
  apps: Array<{ id: string; title: string; url: string; roles: string[]; newTab: boolean }>;
  liveClasses: { bbbUrl: string; bbbSecretSet?: boolean };
  blog: { publicPage: boolean };
  alumni: { selfRegistration: boolean };
}
interface Payload {
  profile: Profile;
  settings: SettingsData;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

/** Saves one part of the settings and refreshes everything that depends on it. */
function useSave(setData: (p: Payload) => void) {
  const invalidate = useInvalidate();
  const { refresh } = useApp();
  const [busy, setBusy] = React.useState<string | null>(null);
  const save = async (key: string, payload: Record<string, unknown>, okMsg = 'Saved') => {
    setBusy(key);
    try {
      const res = await api<Payload>('/api/settings', { method: 'PUT', body: payload });
      setData(res);
      toast.success(okMsg);
      invalidate(['/api/me', '/api/school']);
      refresh();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    } finally {
      setBusy(null);
    }
  };
  return { save, busy };
}

function SaveBar({ onClick, loading, disabled }: { onClick: () => void; loading: boolean; disabled?: boolean }) {
  return (
    <div className="flex justify-end border-t border-line px-5 py-3">
      <Button onClick={onClick} loading={loading} disabled={disabled}>
        <Save /> Save
      </Button>
    </div>
  );
}

function ProfileTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const [p, setP] = React.useState(data.profile);
  React.useEffect(() => setP(data.profile), [data.profile]);
  const { save, busy } = useSave(setData);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setP((s) => ({ ...s, [k]: v }));
  // A colour previewed but not saved must not outlive the page.
  const savedTheme = React.useRef(data.profile.themeColor);
  React.useEffect(() => {
    savedTheme.current = data.profile.themeColor;
  }, [data.profile.themeColor]);
  React.useEffect(() => () => applyPalette(savedTheme.current), []);
  const text = (k: keyof Profile, label: string, extra?: { placeholder?: string; hint?: string; span?: boolean; type?: string }) => (
    <Field label={label} hint={extra?.hint} className={extra?.span ? 'sm:col-span-2' : undefined}>
      <Input type={extra?.type ?? 'text'} disabled={!editable} value={(p[k] as string | number | null) ?? ''} placeholder={extra?.placeholder} onChange={(e) => set(k, e.target.value as never)} />
    </Field>
  );

  async function pickLogo(file: File) {
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) return toast.error('Choose a PNG, JPEG or WebP image');
    const img = new Image();
    img.src = URL.createObjectURL(file);
    await img.decode();
    const scale = Math.min(1, 256 / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(img.src);
    set('logoUrl', canvas.toDataURL('image/png'));
  }

  const { code: _c, status: _s, trialEndsAt: _t, plan: _p, defaultLanguage: _l, ...editableFields } = p;
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <Card>
        <CardHeader title="School profile" description="Shown on the letterhead of receipts, report cards, certificates and the parent app." icon={Building2} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {text('name', 'School name', { span: true })}
          {text('shortName', 'Short name', { placeholder: 'e.g. VPS' })}
          {text('tagline', 'Motto / tagline')}
          <Field label="Board">
            <Select disabled={!editable} value={p.board ?? ''} onChange={(e) => set('board', e.target.value || null)} placeholder="Choose…" options={['CBSE', 'ICSE', 'STATE', 'IB', 'CAMBRIDGE', 'NIOS', 'OTHER'].map((b) => ({ value: b, label: b === 'STATE' ? 'State board' : b }))} />
          </Field>
          {text('affiliationNo', 'Affiliation no.')}
          {text('udiseCode', 'UDISE+ code', { hint: '11 digits' })}
          {text('establishedYear', 'Established (year)', { type: 'number' })}
          {text('email', 'Email', { type: 'email' })}
          {text('phone', 'Phone')}
          {text('website', 'Website', { placeholder: 'https://', span: true })}
          {text('address', 'Address', { span: true })}
          {text('city', 'City / town')}
          {text('district', 'District')}
          <Field label="State">
            <Select disabled={!editable} value={p.state ?? ''} onChange={(e) => set('state', e.target.value || null)} placeholder="Choose…" options={STATES.map((s) => ({ value: s, label: s }))} />
          </Field>
          {text('pincode', 'PIN code')}
          <Field label="Session starts in">
            <Select disabled={!editable} value={String(p.academicYearStartMonth)} onChange={(e) => set('academicYearStartMonth', Number(e.target.value))} options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
          </Field>
          <Field label="Languages" hint="Choose languages and the default under Languages & app.">
            <Input disabled value={LANGS.filter((l) => data.settings.languages.enabled.includes(l.code)).map((l) => l.native).join(', ')} />
          </Field>
        </CardBody>
        {editable && <SaveBar loading={busy === 'profile'} onClick={() => save('profile', { profile: editableFields }, 'School profile saved')} />}
      </Card>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Logo" icon={ImagePlus} />
          <CardBody className="flex items-center gap-4">
            <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-canvas">
              {p.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.logoUrl} alt="" className="size-full object-contain" />
              ) : (
                <Building2 className="size-8 text-ink-faint" />
              )}
            </span>
            {editable && (
              <div className="flex flex-col gap-2">
                <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])} />
                <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                  <ImagePlus /> {p.logoUrl ? 'Change' : 'Upload'}
                </Button>
                {p.logoUrl && (
                  <Button size="sm" variant="ghost" onClick={() => set('logoUrl', null)}>
                    <X /> Remove
                  </Button>
                )}
                <p className="text-xs text-ink-faint">Square PNG with a transparent background works best. Save the profile to apply.</p>
              </div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Brand colour" description="Used across the app, parent portal, ID cards and the admission page." icon={Palette} />
          <CardBody>
            <div className="grid grid-cols-4 gap-2">
              {PALETTE_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  disabled={!editable}
                  aria-pressed={p.themeColor === name}
                  onClick={() => {
                    set('themeColor', name);
                    applyPalette(name);
                  }}
                  className={cn('flex flex-col items-center gap-1 rounded-xl border p-2 text-[11px] capitalize transition', p.themeColor === name ? 'border-brand-600 ring-2 ring-brand-500/40' : 'border-line hover:bg-canvas')}
                >
                  <span className="flex gap-0.5">
                    {([400, 600, 800] as const).map((shade) => (
                      <span key={shade} className="size-4 rounded-full" style={{ background: `rgb(${PALETTES[name][shade]})` }} />
                    ))}
                  </span>
                  {name}
                </button>
              ))}
            </div>
          </CardBody>
          {editable && <SaveBar loading={busy === 'brand'} disabled={p.themeColor === data.profile.themeColor} onClick={() => save('brand', { profile: { themeColor: p.themeColor } }, 'Brand colour saved')} />}
        </Card>
        <Card>
          <CardHeader title="Subscription" icon={Sparkles} />
          <CardBody className="space-y-1 text-sm">
            <p>
              School code <b className="font-mono">{p.code}</b> <span className="text-ink-faint">(used on the login screen)</span>
            </p>
            <p>
              Plan <b>{p.plan?.name ?? '—'}</b> <Badge tone={p.status === 'ACTIVE' ? 'success' : p.status === 'TRIAL' ? 'warning' : 'danger'}>{p.status.toLowerCase()}</Badge>
            </p>
            {p.plan?.maxStudents && <p className="text-ink-soft">Up to {p.plan.maxStudents.toLocaleString('en-IN')} students{p.plan.maxCampuses ? ` · ${p.plan.maxCampuses} campus(es)` : ''}</p>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function ListEditor({ value, onChange, disabled, placeholder }: { value: string[]; onChange: (v: string[]) => void; disabled?: boolean; placeholder: string }) {
  const [draft, setDraft] = React.useState('');
  const add = () => {
    const t = draft.trim();
    if (!t || value.includes(t) || value.length >= 20) return;
    onChange([...value, t]);
    setDraft('');
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-canvas px-2.5 py-1 text-xs">
            {v}
            {!disabled && (
              <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))}>
                <X className="size-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="flex gap-2">
          <Input value={draft} maxLength={40} placeholder={placeholder} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
          <Button variant="secondary" onClick={add}>
            <Plus />
          </Button>
        </div>
      )}
    </div>
  );
}

function AcademicTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const s = data.settings;
  const [v, setV] = React.useState({ workingDays: s.workingDays, attendance: s.attendance, exams: s.exams, behaviourTraits: s.behaviourTraits, skillTraits: s.skillTraits });
  const { save, busy } = useSave(setData);
  const num = (k: keyof typeof v.exams, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Input type="number" min={0} max={100} disabled={!editable} value={Number(v.exams[k])} onChange={(e) => setV((x) => ({ ...x, exams: { ...x.exams, [k]: Number(e.target.value) } }))} />
    </Field>
  );
  return (
    <Card>
      <CardHeader title="Academic preferences" icon={Settings} />
      <CardBody className="space-y-6">
        <Field label="Working days" hint="Used by attendance, timetable and payroll.">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d, i) => {
              const day = i + 1;
              const on = v.workingDays.includes(day);
              return (
                <button key={d} type="button" disabled={!editable} onClick={() => setV((x) => ({ ...x, workingDays: on ? x.workingDays.filter((w) => w !== day) : [...x.workingDays, day].sort() }))} className={cn('rounded-lg border px-3 py-1.5 text-sm', on ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300' : 'border-line text-ink-soft')}>
                  {d}
                </button>
              );
            })}
          </div>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            <span>
              <span className="font-medium">SMS parents when a child is absent</span>
              <span className="block text-xs text-ink-faint">Needs an SMS gateway (Messaging tab).</span>
            </span>
            <Switch disabled={!editable} checked={v.attendance.notifyParentsOnAbsence} onCheckedChange={(c) => setV((x) => ({ ...x, attendance: { ...x.attendance, notifyParentsOnAbsence: c } }))} />
          </label>
          <Field label="Teachers may edit attendance for (days)" hint="0 = same day only. Admins can always edit.">
            <Input type="number" min={0} max={30} disabled={!editable} value={v.attendance.allowEditAfterDays} onChange={(e) => setV((x) => ({ ...x, attendance: { ...x.attendance, allowEditAfterDays: Number(e.target.value) } }))} />
          </Field>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Result criteria</p>
          <div className="grid gap-4 sm:grid-cols-4">
            {num('overallPassPercent', 'Overall pass %')}
            {num('subjectPassPercent', 'Subject pass %')}
            {num('maxFailedSubjects', 'Compartment allowed', 'Subjects a student may fail and still be promoted')}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
              Show rank on report card
              <Switch disabled={!editable} checked={v.exams.showRank} onCheckedChange={(c) => setV((x) => ({ ...x, exams: { ...x.exams, showRank: c } }))} />
            </label>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Behaviour traits (report card)">
            <ListEditor disabled={!editable} value={v.behaviourTraits} onChange={(t) => setV((x) => ({ ...x, behaviourTraits: t }))} placeholder="e.g. Empathy" />
          </Field>
          <Field label="Co-scholastic skills (report card)">
            <ListEditor disabled={!editable} value={v.skillTraits} onChange={(t) => setV((x) => ({ ...x, skillTraits: t }))} placeholder="e.g. Yoga" />
          </Field>
        </div>
      </CardBody>
      {editable && <SaveBar loading={busy === 'academic'} disabled={!v.workingDays.length} onClick={() => save('academic', { settings: v })} />}
    </Card>
  );
}

/** Write-only credential: shows whether it is set; typing a value replaces it. */
function SecretField({ label, isSet, value, onChange, onRemove, disabled, hint }: { label: string; isSet: boolean; value: string; onChange: (v: string) => void; onRemove: () => void; disabled?: boolean; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <Input type="password" autoComplete="new-password" disabled={disabled} value={value} placeholder={isSet ? '•••••••• saved — type to replace' : 'Not set'} onChange={(e) => onChange(e.target.value)} />
        {isSet && !disabled && (
          <Button variant="ghost" title="Remove" onClick={onRemove}>
            <Trash2 className="text-rose-600" />
          </Button>
        )}
      </div>
    </Field>
  );
}

function FeesTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const s = data.settings;
  const confirm = useConfirm();
  const [fees, setFees] = React.useState(s.fees);
  const [keyId, setKeyId] = React.useState(s.payments.razorpayKeyId);
  const [secret, setSecret] = React.useState('');
  const [webhook, setWebhook] = React.useState('');
  const [banks, setBanks] = React.useState<BankAccount[]>(s.bankAccounts);
  const { save, busy } = useSave(setData);
  const hookUrl = typeof window !== 'undefined' ? `${window.location.origin}/api/public/razorpay/${data.profile.code}` : '';
  React.useEffect(() => {
    setFees(data.settings.fees);
    setKeyId(data.settings.payments.razorpayKeyId);
  }, [data.settings]);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Fee collection" icon={Landmark} />
        <CardBody className="space-y-3">
          {(
            [
              ['allowPartialPayment', 'Allow part payments', 'Accept less than the full due at the counter.'],
              ['carryForwardDues', 'Carry forward unpaid dues', 'Unpaid months stay on the next invoice and the family ledger.'],
              ['allowAdvance', 'Accept advance fees', 'Money received beyond the dues is kept and used automatically on the next invoices.'],
            ] as const
          ).map(([k, label, hint]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
              <span>
                <span className="font-medium">{label}</span>
                <span className="block text-xs text-ink-faint">{hint}</span>
              </span>
              <Switch disabled={!editable} checked={fees[k]} onCheckedChange={(c) => setFees((f) => ({ ...f, [k]: c }))} />
            </label>
          ))}
          <Field label="Receipt footer">
            <Textarea rows={2} maxLength={500} disabled={!editable} value={fees.receiptFooter} onChange={(e) => setFees((f) => ({ ...f, receiptFooter: e.target.value }))} />
          </Field>
        </CardBody>
        {editable && <SaveBar loading={busy === 'fees'} onClick={() => save('fees', { settings: { fees: { allowPartialPayment: fees.allowPartialPayment, carryForwardDues: fees.carryForwardDues, allowAdvance: fees.allowAdvance, receiptFooter: fees.receiptFooter } } })} />}
      </Card>
      <Card>
        <CardHeader
          title="Online payments (Razorpay)"
          description="Parents pay by UPI, cards or net banking from the app; money settles directly to the school's Razorpay account."
          icon={CreditCard}
          actions={s.payments.sandbox ? <Badge tone="warning">Sandbox mode</Badge> : undefined}
        />
        <CardBody className="space-y-4">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            <span className="font-medium">Accept online fee payments</span>
            <Switch
              disabled={!editable || busy !== null}
              checked={fees.onlinePaymentEnabled}
              onCheckedChange={async (c) => {
                if (await save('online', { settings: { fees: { onlinePaymentEnabled: c } } }, c ? 'Online payments enabled' : 'Online payments disabled')) setFees((f) => ({ ...f, onlinePaymentEnabled: c }));
              }}
            />
          </label>
          <Field label="Key id">
            <Input disabled={!editable} value={keyId} placeholder="rzp_live_…" onChange={(e) => setKeyId(e.target.value.trim())} />
          </Field>
          <SecretField label="Key secret" disabled={!editable} isSet={s.payments.razorpayKeySecretSet} value={secret} onChange={setSecret} onRemove={async () => (await confirm({ title: 'Remove the Razorpay key secret?', description: 'Online payments will stop working until a new secret is saved.', tone: 'danger' })) && save('rzp', { secrets: { razorpayKeySecret: null }, settings: { fees: { onlinePaymentEnabled: false } } }, 'Key secret removed')} />
          <SecretField label="Webhook secret" hint="Razorpay dashboard → Webhooks → add the URL below with event payment.captured." disabled={!editable} isSet={s.payments.razorpayWebhookSecretSet} value={webhook} onChange={setWebhook} onRemove={() => save('rzp', { secrets: { razorpayWebhookSecret: null } }, 'Webhook secret removed')} />
          <div className="rounded-xl bg-canvas p-3 text-xs">
            <p className="font-medium">Webhook URL</p>
            <code className="break-all text-ink-soft">{hookUrl}</code>
          </div>
        </CardBody>
        {editable && (
          <SaveBar
            loading={busy === 'rzp'}
            disabled={keyId === s.payments.razorpayKeyId && !secret && !webhook}
            onClick={async () => {
              const secrets: Record<string, string> = {};
              if (secret) secrets.razorpayKeySecret = secret;
              if (webhook) secrets.razorpayWebhookSecret = webhook;
              if (await save('rzp', { settings: { payments: { razorpayKeyId: keyId } }, ...(Object.keys(secrets).length ? { secrets } : {}) }, 'Razorpay settings saved')) {
                setSecret('');
                setWebhook('');
              }
            }}
          />
        )}
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader title="Bank accounts for offline payment" description="Printed on fee invoices and shown in the parent app." icon={Landmark} actions={editable && banks.length < 5 ? <Button size="sm" variant="secondary" onClick={() => setBanks((b) => [...b, { bankName: '', accountNo: '' }])}><Plus /> Add account</Button> : undefined} />
        <CardBody className="space-y-4">
          {!banks.length && <p className="text-sm text-ink-faint">No bank accounts added.</p>}
          {banks.map((b, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
              {(
                [
                  ['bankName', 'Bank', true],
                  ['branch', 'Branch', false],
                  ['accountName', 'Account name', false],
                  ['accountNo', 'Account number', true],
                  ['ifsc', 'IFSC', false],
                  ['upiId', 'UPI id', false],
                ] as const
              ).map(([k, label, required]) => (
                <Field key={k} label={label} required={required}>
                  <Input disabled={!editable} value={b[k] ?? ''} onChange={(e) => setBanks((all) => all.map((x, j) => (j === i ? { ...x, [k]: k === 'ifsc' ? e.target.value.toUpperCase() : e.target.value } : x)))} />
                </Field>
              ))}
              {editable && (
                <div className="sm:col-span-3 flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setBanks((all) => all.filter((_, j) => j !== i))}>
                    <Trash2 /> Remove
                  </Button>
                </div>
              )}
            </div>
          ))}
        </CardBody>
        {editable && <SaveBar loading={busy === 'banks'} disabled={banks.some((b) => !b.bankName.trim() || !b.accountNo.trim())} onClick={() => save('banks', { settings: { bankAccounts: banks.map((b) => Object.fromEntries(Object.entries(b).filter(([, v]) => v !== ''))) } })} />}
      </Card>
      <TallyCard data={data} setData={setData} editable={editable} />
    </div>
  );
}

function AppTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const s = data.settings;
  const [langs, setLangs] = React.useState<string[]>(s.languages.enabled);
  const [defLang, setDefLang] = React.useState(s.languages.default);
  const [push, setPush] = React.useState(s.notifications.pushEnabled);
  const [lt, setLt] = React.useState(s.liveTracking);
  const [maps, setMaps] = React.useState(s.maps);
  const { save, busy } = useSave(setData);
  const toggleLang = (code: string) => setLangs((l) => (l.includes(code) ? l.filter((x) => x !== code) : [...l, code]));
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Languages" description="Choose which languages your staff, parents and students can pick. Menus, navigation and common actions are translated." icon={Languages} />
        <CardBody className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {LANGS.map((l) => (
              <label key={l.code} className={cn('flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm', langs.includes(l.code) ? 'border-brand-400 bg-brand-50 dark:bg-brand-500/10' : 'border-line')}>
                <Checkbox disabled={!editable || (l.code === defLang && langs.includes(l.code))} checked={langs.includes(l.code)} onCheckedChange={() => toggleLang(l.code)} />
                <span className="min-w-0">
                  <span className="block font-medium">{l.native}</span>
                  {l.code !== 'en' && <span className="block text-[11px] text-ink-faint">{l.name}</span>}
                </span>
              </label>
            ))}
          </div>
          <Field label="Default language" hint="New users start in this language; anyone can switch from the language menu.">
            <Select disabled={!editable} value={defLang} onChange={(e) => setDefLang(e.target.value)} options={LANGS.filter((l) => langs.includes(l.code)).map((l) => ({ value: l.code, label: l.code === 'en' ? l.native : `${l.native} (${l.name})` }))} />
          </Field>
          <p className="text-xs text-ink-faint">Translations cover the app shell and navigation. Have a native speaker review them before rollout; ask support to adjust any wording.</p>
        </CardBody>
        {editable && <SaveBar loading={busy === 'lang'} disabled={!langs.length} onClick={() => save('lang', { settings: { languages: { enabled: langs, default: langs.includes(defLang) ? defLang : langs[0] } } }, 'Languages saved')} />}
      </Card>

      <Card>
        <CardHeader title="Phone notifications" description="Alerts on phones that installed the Vidyalaya app: absences, fee receipts, results, homework and bus approaching." icon={BellRing} />
        <CardBody className="space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Send phone notifications</span>
            <Switch disabled={!editable} checked={push} onCheckedChange={setPush} />
          </label>
          <p className="text-xs text-ink-faint">Each person turns notifications on for their own device under My profile → App &amp; notifications. Every alert also stays in the in-app bell.</p>
        </CardBody>
        {editable && <SaveBar loading={busy === 'push'} onClick={() => save('push', { settings: { notifications: { pushEnabled: push } } })} />}
      </Card>

      <Card>
        <CardHeader title="Live bus tracking" description="Drivers share the bus location from Driver mode, or a GPS device posts it. Parents see the bus on a map and get an alert as it nears their stop." icon={Radio} />
        <CardBody className="space-y-4">
          <label className="flex items-center justify-between gap-3 text-sm">
            <span className="font-medium">Turn on live tracking</span>
            <Switch disabled={!editable} checked={lt.enabled} onCheckedChange={(v) => setLt((x) => ({ ...x, enabled: v }))} />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Show the bus to parents and students</span>
            <Switch disabled={!editable || !lt.enabled} checked={lt.shareWithParents} onCheckedChange={(v) => setLt((x) => ({ ...x, shareWithParents: v }))} />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Driver update interval (sec)">
              <Input type="number" min={5} max={120} disabled={!editable || !lt.enabled} value={lt.pingIntervalSec} onChange={(e) => setLt((x) => ({ ...x, pingIntervalSec: Number(e.target.value) }))} />
            </Field>
            <Field label="Approach alert distance (m)" hint="0 turns alerts off">
              <Input type="number" min={0} max={5000} step={100} disabled={!editable || !lt.enabled} value={lt.approachAlertMeters} onChange={(e) => setLt((x) => ({ ...x, approachAlertMeters: Number(e.target.value) }))} />
            </Field>
            <Field label="Keep history (days)">
              <Input type="number" min={1} max={365} disabled={!editable || !lt.enabled} value={lt.retainDays} onChange={(e) => setLt((x) => ({ ...x, retainDays: Number(e.target.value) }))} />
            </Field>
          </div>
          <p className="text-xs text-ink-faint">Set up: Transport → Vehicles → link each driver&apos;s login (or create a GPS device link), and add coordinates to stops under Routes &amp; stops.</p>
        </CardBody>
        {editable && <SaveBar loading={busy === 'lt'} onClick={() => save('lt', { settings: { liveTracking: lt } }, lt.enabled ? 'Live tracking saved' : 'Saved')} />}
      </Card>

      <Card>
        <CardHeader title="Map tiles" description="Map background used by live tracking. OpenStreetMap works out of the box; large schools can switch to their own or a commercial tile provider." icon={MapIcon} />
        <CardBody className="space-y-4">
          <Field label="Tile URL" hint="https, with {z}, {x} and {y} placeholders">
            <Input disabled={!editable} value={maps.tileUrl} onChange={(e) => setMaps((x) => ({ ...x, tileUrl: e.target.value }))} />
          </Field>
          <Field label="Attribution">
            <Input disabled={!editable} value={maps.attribution} onChange={(e) => setMaps((x) => ({ ...x, attribution: e.target.value }))} />
          </Field>
        </CardBody>
        {editable && <SaveBar loading={busy === 'maps'} onClick={() => save('maps', { settings: { maps } })} />}
      </Card>
    </div>
  );
}

function TallyCard({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const [t, setT] = React.useState(data.settings.tally);
  const { data: lk } = useLookups(['accountHeads']);
  const heads = (lk?.accountHeads ?? []) as Array<{ id: string; name: string; type: string }>;
  const { save, busy } = useSave(setData);
  return (
    <Card>
      <CardHeader title="Tally export" description="Ledger names used when exporting accounts to Tally Prime / ERP 9 (Accounts → Statement → Tally). Leave a head blank to export it under its own name." icon={FileCode2} />
      <CardBody className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Tally company name" hint="Optional; selects the company on import">
            <Input disabled={!editable} value={t.companyName} onChange={(e) => setT((x) => ({ ...x, companyName: e.target.value }))} />
          </Field>
          <Field label="Cash ledger">
            <Input disabled={!editable} value={t.cashLedger} onChange={(e) => setT((x) => ({ ...x, cashLedger: e.target.value }))} />
          </Field>
          <Field label="Bank ledger" hint="Used for UPI, card, cheque, NEFT">
            <Input disabled={!editable} value={t.bankLedger} onChange={(e) => setT((x) => ({ ...x, bankLedger: e.target.value }))} />
          </Field>
        </div>
        {heads.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-line p-3">
            {heads.map((h) => (
              <div key={h.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <span className="truncate text-sm">
                  {h.name} <span className="text-[11px] text-ink-faint">{h.type.toLowerCase()}</span>
                </span>
                <Input disabled={!editable} placeholder={h.name} value={t.ledgerMap[h.name] ?? ''} onChange={(e) => setT((x) => ({ ...x, ledgerMap: { ...x.ledgerMap, [h.name]: e.target.value } }))} aria-label={`Tally ledger for ${h.name}`} />
              </div>
            ))}
          </div>
        )}
      </CardBody>
      {editable && <SaveBar loading={busy === 'tally'} onClick={() => save('tally', { settings: { tally: { ...t, ledgerMap: Object.fromEntries(Object.entries(t.ledgerMap).filter(([, v]) => v.trim())) } } })} />}
    </Card>
  );
}

function MessagingTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const m = data.settings.messaging;
  const [v, setV] = React.useState({ smsProvider: m.smsProvider, smsSenderId: m.smsSenderId, whatsappProvider: m.whatsappProvider, whatsappPhoneNumberId: m.whatsappPhoneNumberId ?? '' });
  const [smsKey, setSmsKey] = React.useState('');
  const [waToken, setWaToken] = React.useState('');
  const { save, busy } = useSave(setData);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
    <Card>
      <CardHeader title="SMS & WhatsApp gateway" description="Use your own DLT-registered sender. Messages stay queued as “skipped” until a gateway is configured." icon={MessageSquareText} />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="SMS provider">
          <Select disabled={!editable} value={v.smsProvider} onChange={(e) => setV((x) => ({ ...x, smsProvider: e.target.value }))} options={[{ value: 'NONE', label: 'Not configured' }, { value: 'MSG91', label: 'MSG91' }, { value: 'TWILIO', label: 'Twilio' }]} />
        </Field>
        <Field label="DLT sender ID" hint="6 capital letters, e.g. VIDYLA">
          <Input disabled={!editable} maxLength={6} value={v.smsSenderId} onChange={(e) => setV((x) => ({ ...x, smsSenderId: e.target.value.toUpperCase() }))} />
        </Field>
        <div className="sm:col-span-2">
          <SecretField label={v.smsProvider === 'TWILIO' ? 'Twilio “SID:auth token”' : 'SMS API key'} disabled={!editable} isSet={m.smsApiKeySet} value={smsKey} onChange={setSmsKey} onRemove={() => save('msg', { secrets: { smsApiKey: null } }, 'SMS key removed')} />
        </div>
        <Field label="WhatsApp provider">
          <Select disabled={!editable} value={v.whatsappProvider} onChange={(e) => setV((x) => ({ ...x, whatsappProvider: e.target.value }))} options={[{ value: 'NONE', label: 'Not configured' }, { value: 'META_CLOUD', label: 'WhatsApp Cloud API (Meta)' }, { value: 'GUPSHUP', label: 'Gupshup' }]} />
        </Field>
        <Field label="Phone number id">
          <Input disabled={!editable} value={v.whatsappPhoneNumberId} onChange={(e) => setV((x) => ({ ...x, whatsappPhoneNumberId: e.target.value.trim() }))} />
        </Field>
        <div className="sm:col-span-2">
          <SecretField label="WhatsApp access token" disabled={!editable} isSet={m.whatsappTokenSet} value={waToken} onChange={setWaToken} onRemove={() => save('msg', { secrets: { whatsappToken: null } }, 'WhatsApp token removed')} />
        </div>
      </CardBody>
      {editable && (
        <SaveBar
          loading={busy === 'msg'}
          onClick={async () => {
            const secrets: Record<string, string> = {};
            if (smsKey) secrets.smsApiKey = smsKey;
            if (waToken) secrets.whatsappToken = waToken;
            if (await save('msg', { settings: { messaging: v }, ...(Object.keys(secrets).length ? { secrets } : {}) }, 'Messaging settings saved')) {
              setSmsKey('');
              setWaToken('');
            }
          }}
        />
      )}
    </Card>
    <EmailCard data={data} setData={setData} editable={editable} />
    </div>
  );
}

function RulesTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const [rules, setRules] = React.useState(data.settings.rules);
  const { save, busy } = useSave(setData);
  return (
    <div className="space-y-4">
    <Card>
      <CardHeader title="Rules & regulations" description="Shown to parents, students and staff in their apps and printed in the prospectus." icon={ScrollText} />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        <Field label="For students & parents">
          <Textarea rows={14} maxLength={20000} disabled={!editable} value={rules.students} onChange={(e) => setRules((r) => ({ ...r, students: e.target.value }))} placeholder={'1. Students must reach school by 7:50 am.\n2. …'} />
        </Field>
        <Field label="For employees">
          <Textarea rows={14} maxLength={20000} disabled={!editable} value={rules.employees} onChange={(e) => setRules((r) => ({ ...r, employees: e.target.value }))} />
        </Field>
      </CardBody>
      {editable && <SaveBar loading={busy === 'rules'} onClick={() => save('rules', { settings: { rules } })} />}
    </Card>
    <RemarksDisciplineCard data={data} setData={setData} editable={editable} />
    </div>
  );
}

function AdvancedTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const [n, setN] = React.useState(data.settings.numbering);
  const [ai, setAi] = React.useState(data.settings.ai.dailyTokenLimitPerUser);
  const { save, busy } = useSave(setData);
  const labels: Record<string, string> = { admissionPrefix: 'Admission no.', receiptPrefix: 'Fee receipt', invoicePrefix: 'Fee invoice', employeePrefix: 'Employee code', salarySlipPrefix: 'Salary slip', certificatePrefix: 'Certificate', orderPrefix: 'Store bill', applicationPrefix: 'Admission application' };
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Document numbering" description="Prefixes for auto-generated numbers. Numbers stay sequential and gap-free; changing a prefix affects new documents only." icon={Hash} />
        <CardBody className="grid gap-4 sm:grid-cols-2">
          {Object.keys(labels).map((k) => (
            <Field key={k} label={labels[k]}>
              <Input disabled={!editable} maxLength={12} value={n[k] ?? ''} onChange={(e) => setN((x) => ({ ...x, [k]: e.target.value.toUpperCase().replace(/[^A-Z0-9/-]/g, '') }))} />
            </Field>
          ))}
        </CardBody>
        {editable && <SaveBar loading={busy === 'num'} onClick={() => save('num', { settings: { numbering: n } })} />}
      </Card>
      <Card>
        <CardHeader title="AI assistant" description="Daily usage cap per user, to keep AI costs predictable." icon={KeyRound} />
        <CardBody>
          <Field label="Daily tokens per user" hint="0 turns the assistant off for everyone. ~50,000 tokens ≈ 40–60 questions.">
            <Input type="number" min={0} max={2000000} step={5000} disabled={!editable} value={ai} onChange={(e) => setAi(Number(e.target.value))} />
          </Field>
        </CardBody>
        {editable && <SaveBar loading={busy === 'ai'} onClick={() => save('ai', { settings: { ai: { dailyTokenLimitPerUser: ai } } })} />}
      </Card>
    </div>
  );
}

function EmailCard({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const m = data.settings.messaging;
  const [v, setV] = React.useState({ emailProvider: m.emailProvider ?? 'NONE', smtpHost: m.smtpHost ?? '', smtpPort: m.smtpPort ?? 587, smtpSecure: m.smtpSecure ?? false, smtpUser: m.smtpUser ?? '', fromEmail: m.fromEmail ?? '', fromName: m.fromName ?? '' });
  const [pass, setPass] = React.useState('');
  const [testTo, setTestTo] = React.useState('');
  const [testing, setTesting] = React.useState(false);
  const { save, busy } = useSave(setData);
  return (
    <Card>
      <CardHeader title="Email (SMTP)" description="Send bulk email, reminders and notices from your school’s address — Google Workspace, Microsoft 365, Zoho or any SMTP service." icon={Mail} />
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <Field label="Email sending">
          <Select disabled={!editable} value={v.emailProvider} onChange={(e) => setV((x) => ({ ...x, emailProvider: e.target.value }))} options={[{ value: 'NONE', label: 'Not configured' }, { value: 'SMTP', label: 'SMTP server' }]} />
        </Field>
        <Field label="SMTP host" hint="e.g. smtp.gmail.com, smtp.office365.com, smtp.zoho.in">
          <Input disabled={!editable} value={v.smtpHost} onChange={(e) => setV((x) => ({ ...x, smtpHost: e.target.value.trim() }))} />
        </Field>
        <Field label="Port">
          <Input type="number" disabled={!editable} value={v.smtpPort} onChange={(e) => setV((x) => ({ ...x, smtpPort: Number(e.target.value) }))} />
        </Field>
        <label className="flex items-center gap-3 self-end pb-2 text-sm">
          <Switch disabled={!editable} checked={v.smtpSecure} onCheckedChange={(c) => setV((x) => ({ ...x, smtpSecure: c, smtpPort: c ? 465 : 587 }))} /> TLS from the start (port 465)
        </label>
        <Field label="Username">
          <Input disabled={!editable} autoComplete="off" value={v.smtpUser} onChange={(e) => setV((x) => ({ ...x, smtpUser: e.target.value.trim() }))} />
        </Field>
        <SecretField label="Password / app password" disabled={!editable} isSet={!!m.smtpPasswordSet} value={pass} onChange={setPass} onRemove={() => save('email', { secrets: { smtpPassword: null } }, 'SMTP password removed')} />
        <Field label="From email">
          <Input type="email" disabled={!editable} value={v.fromEmail} onChange={(e) => setV((x) => ({ ...x, fromEmail: e.target.value.trim() }))} placeholder="office@school.edu.in" />
        </Field>
        <Field label="From name">
          <Input disabled={!editable} value={v.fromName} onChange={(e) => setV((x) => ({ ...x, fromName: e.target.value }))} placeholder={data.profile.name} />
        </Field>
        {editable && (
          <div className="flex gap-2 sm:col-span-2">
            <Input type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="Send a test email to…" />
            <Button
              variant="secondary"
              loading={testing}
              disabled={!testTo}
              onClick={async () => {
                setTesting(true);
                try {
                  await api('/api/settings/test-email', { method: 'POST', body: { to: testTo } });
                  toast.success('Test email sent — check the inbox');
                } catch (e) {
                  toast.error((e as Error).message);
                } finally {
                  setTesting(false);
                }
              }}
            >
              Send test
            </Button>
          </div>
        )}
      </CardBody>
      {editable && (
        <SaveBar
          loading={busy === 'email'}
          onClick={async () => {
            if (await save('email', { settings: { messaging: v }, ...(pass ? { secrets: { smtpPassword: pass } } : {}) }, 'Email settings saved')) setPass('');
          }}
        />
      )}
    </Card>
  );
}

const APP_ROLE_CHOICES = [
  { value: 'TEACHER', label: 'Teachers' },
  { value: 'ACCOUNTANT', label: 'Accountants' },
  { value: 'RECEPTIONIST', label: 'Front office' },
  { value: 'LIBRARIAN', label: 'Librarians' },
  { value: 'TRANSPORT_MANAGER', label: 'Transport' },
  { value: 'STORE_MANAGER', label: 'Store' },
  { value: 'STAFF', label: 'Other staff' },
  { value: 'PARENT', label: 'Parents' },
  { value: 'STUDENT', label: 'Students' },
];

function IntegrationsTab({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const s = data.settings;
  const { role } = useApp();
  const { save, busy } = useSave(setData);
  const [sso, setSso] = React.useState({ google: s.sso.google, microsoft: s.sso.microsoft, allowedDomains: s.sso.allowedDomains });
  const [apps, setApps] = React.useState(s.apps);
  const [bbbUrl, setBbbUrl] = React.useState(s.liveClasses.bbbUrl);
  const [bbbSecret, setBbbSecret] = React.useState('');
  const [pages, setPages] = React.useState({ blog: s.blog.publicPage, alumni: s.alumni.selfRegistration });
  const [exporting, setExporting] = React.useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  React.useEffect(() => setApps(data.settings.apps), [data.settings.apps]);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader title="Single sign-on" description="Staff, parents and students sign in with their school Google or Microsoft account. Only existing users whose email matches can sign in." icon={KeyRound} />
        <CardBody className="space-y-3">
          {(
            [
              ['google', 'Google Workspace', s.sso.googleAvailable],
              ['microsoft', 'Microsoft 365 / Azure AD', s.sso.microsoftAvailable],
            ] as const
          ).map(([k, label, available]) => (
            <label key={k} className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
              <span>
                <span className="font-medium">{label}</span>
                {!available && <span className="block text-xs text-amber-600">Not set up on this server yet — your platform operator adds the OAuth client id and secret.</span>}
              </span>
              <Switch disabled={!editable || (!available && !sso[k])} checked={sso[k]} onCheckedChange={(c) => setSso((x) => ({ ...x, [k]: c }))} />
            </label>
          ))}
          <Field label="Allowed email domains" hint="Leave empty to accept any verified email that matches a user. Example: school.edu.in">
            <ListEditor value={sso.allowedDomains} onChange={(d) => setSso((x) => ({ ...x, allowedDomains: d.map((y) => y.toLowerCase()) }))} disabled={!editable} placeholder="school.edu.in" />
          </Field>
        </CardBody>
        {editable && <SaveBar loading={busy === 'sso'} onClick={() => save('sso', { settings: { sso } }, 'Sign-in settings saved')} />}
      </Card>

      <Card>
        <CardHeader title="Public pages" description="Pages anyone can open without signing in." icon={Globe} />
        <CardBody className="space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            <span>
              <span className="font-medium">School news page</span>
              <span className="block break-all text-xs text-ink-faint">{origin}/news/{data.profile.code} — shows blog posts marked “public”</span>
            </span>
            <Switch disabled={!editable} checked={pages.blog} onCheckedChange={(c) => setPages((p) => ({ ...p, blog: c }))} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-line p-3 text-sm">
            <span>
              <span className="font-medium">Alumni self-registration</span>
              <span className="block break-all text-xs text-ink-faint">{origin}/alumni-join/{data.profile.code} — entries wait for your approval</span>
            </span>
            <Switch disabled={!editable} checked={pages.alumni} onCheckedChange={(c) => setPages((p) => ({ ...p, alumni: c }))} />
          </label>
        </CardBody>
        {editable && <SaveBar loading={busy === 'pages'} onClick={() => save('pages', { settings: { blog: { publicPage: pages.blog }, alumni: { selfRegistration: pages.alumni } } })} />}
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader title="Apps (App Frame)" description="Add other web tools your school uses — they open inside Vidyalaya for the roles you choose (some sites only allow opening in a new tab)." icon={AppWindow} />
        <CardBody className="space-y-3">
          {!apps.length && <p className="text-sm text-ink-faint">No apps yet.</p>}
          {apps.map((a, i) => (
            <div key={a.id} className="space-y-2 rounded-xl border border-line p-3">
              <div className="grid gap-2 sm:grid-cols-[12rem_1fr_auto_auto]">
                <Input disabled={!editable} value={a.title} placeholder="Title" onChange={(e) => setApps((l) => l.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} aria-label="App title" />
                <Input disabled={!editable} value={a.url} placeholder="https://…" onChange={(e) => setApps((l) => l.map((x, j) => (j === i ? { ...x, url: e.target.value.trim() } : x)))} aria-label="App link" />
                <label className="flex items-center gap-2 text-xs">
                  <Switch disabled={!editable} checked={a.newTab} onCheckedChange={(c) => setApps((l) => l.map((x, j) => (j === i ? { ...x, newTab: c } : x)))} /> New tab
                </label>
                {editable && (
                  <Button variant="ghost" size="icon" aria-label="Remove app" onClick={() => setApps((l) => l.filter((_, j) => j !== i))}>
                    <Trash2 className="text-rose-600" />
                  </Button>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {APP_ROLE_CHOICES.map((r) => (
                  <label key={r.value} className="flex items-center gap-1.5 text-xs">
                    <Checkbox disabled={!editable} checked={a.roles.includes(r.value)} onCheckedChange={(c) => setApps((l) => l.map((x, j) => (j === i ? { ...x, roles: c ? [...x.roles, r.value] : x.roles.filter((y) => y !== r.value) } : x)))} /> {r.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
          {editable && apps.length < 12 && (
            <Button variant="secondary" size="sm" onClick={() => setApps((l) => [...l, { id: Math.random().toString(36).slice(2, 10), title: '', url: 'https://', roles: ['TEACHER'], newTab: false }])}>
              <Plus /> Add app
            </Button>
          )}
        </CardBody>
        {editable && <SaveBar loading={busy === 'apps'} onClick={() => save('apps', { settings: { apps } }, 'Apps saved')} />}
      </Card>

      <Card>
        <CardHeader title="BigBlueButton" description="Your own BigBlueButton server for live classes: teachers join as moderators, students get personal links — no meeting links to share." icon={Video} />
        <CardBody className="space-y-4">
          <Field label="Server URL" hint="e.g. https://bbb.yourschool.in/bigbluebutton/">
            <Input disabled={!editable} value={bbbUrl} onChange={(e) => setBbbUrl(e.target.value.trim())} />
          </Field>
          <SecretField label="Shared secret" hint="From `bbb-conf --secret` on the server" disabled={!editable} isSet={!!s.liveClasses.bbbSecretSet} value={bbbSecret} onChange={setBbbSecret} onRemove={() => save('bbb', { secrets: { bbbSecret: null } }, 'Secret removed')} />
        </CardBody>
        {editable && (
          <SaveBar
            loading={busy === 'bbb'}
            onClick={async () => {
              if (await save('bbb', { settings: { liveClasses: { bbbUrl } }, ...(bbbSecret ? { secrets: { bbbSecret } } : {}) }, 'BigBlueButton saved')) setBbbSecret('');
            }}
          />
        )}
      </Card>

      <Card>
        <CardHeader title="Data export" description="Download every record of your school (students, fees, attendance, exams, staff…) as one Excel workbook — for backup or moving to other software." icon={Database} />
        <CardBody className="space-y-3 text-sm text-ink-soft">
          <p>Passwords, encrypted Aadhaar numbers, gateway secrets and uploaded files are not included. Each export is recorded in the audit log.</p>
          <Button
            variant="secondary"
            loading={exporting}
            disabled={role !== 'SUPER_ADMIN'}
            onClick={async () => {
              setExporting(true);
              try {
                const res = await fetch('/api/settings/export');
                if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Export failed');
                const blob = await res.blob();
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `school-data-${data.profile.code}.xlsx`;
                a.click();
                URL.revokeObjectURL(a.href);
              } catch (e) {
                toast.error((e as Error).message);
              } finally {
                setExporting(false);
              }
            }}
          >
            <Database /> Download all data (.xlsx)
          </Button>
          {role !== 'SUPER_ADMIN' && <p className="text-xs">Only the owner can export all data.</p>}
        </CardBody>
      </Card>
    </div>
  );
}

function LinesField({ label, hint, value, onChange, disabled, max }: { label: string; hint?: string; value: string[]; onChange: (v: string[]) => void; disabled?: boolean; max: number }) {
  return (
    <Field label={label} hint={hint}>
      <Textarea rows={7} disabled={disabled} value={value.join('\n')} onChange={(e) => onChange(e.target.value.split('\n').map((x) => x.slice(0, max)))} />
    </Field>
  );
}

function RemarksDisciplineCard({ data, setData, editable }: { data: Payload; setData: (p: Payload) => void; editable: boolean }) {
  const s = data.settings;
  const [remarks, setRemarks] = React.useState(s.remarkBank);
  const [cats, setCats] = React.useState(s.disciplineCategories);
  const [notify, setNotify] = React.useState(s.gate.notifyParents);
  const { save, busy } = useSave(setData);
  return (
    <Card>
      <CardHeader title="Remarks, discipline & gate" description="Ready-made report-card remarks, discipline categories, and gate-pass alerts." icon={Gavel} />
      <CardBody className="grid gap-4 lg:grid-cols-2">
        <LinesField label="Remark bank (one per line)" hint="Teachers pick these when writing report-card remarks." value={remarks} onChange={setRemarks} disabled={!editable} max={300} />
        <LinesField label="Discipline categories (one per line)" value={cats} onChange={setCats} disabled={!editable} max={40} />
        <label className="flex items-center gap-3 text-sm lg:col-span-2">
          <Switch disabled={!editable} checked={notify} onCheckedChange={setNotify} /> Tell parents when a gate pass is issued and when their child leaves
        </label>
      </CardBody>
      {editable && (
        <SaveBar
          loading={busy === 'rd'}
          onClick={() => save('rd', { settings: { remarkBank: remarks.map((x) => x.trim()).filter(Boolean), disciplineCategories: cats.map((x) => x.trim()).filter(Boolean), gate: { notifyParents: notify } } })}
        />
      )}
    </Card>
  );
}

function Campuses() {
  return (
    <ResourcePage<{ id: string; name: string; code: string; city: string | null; phone: string | null; isMain: boolean; isActive: boolean; _count: { students: number; employees: number; classes: number } }>
      embedded
      title="Campuses"
      entityLabel="Campus"
      endpoint="/api/campuses"
      module="settings"
      columns={[
        { accessorKey: 'name', header: 'Campus', cell: ({ row }) => <div><p className="font-medium">{row.original.name} {row.original.isMain && <Badge tone="brand">main</Badge>}</p><p className="font-mono text-xs text-ink-faint">{row.original.code}</p></div> },
        { accessorKey: 'city', header: 'City' },
        { accessorKey: 'phone', header: 'Phone' },
        { id: 'count', header: 'Classes · students · staff', cell: ({ row }) => `${row.original._count.classes} · ${row.original._count.students} · ${row.original._count.employees}` },
        { accessorKey: 'isActive', header: 'Status', cell: ({ getValue }) => (getValue() ? <Badge tone="success">active</Badge> : <Badge>inactive</Badge>) },
      ]}
      fields={[
        { name: 'name', label: 'Name', required: true },
        { name: 'code', label: 'Code', required: true, placeholder: 'e.g. NORTH' },
        { name: 'address', label: 'Address', span: 2 },
        { name: 'city', label: 'City' },
        { name: 'phone', label: 'Phone', type: 'tel' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'isMain', label: 'Main campus', type: 'switch' },
        { name: 'isActive', label: 'Active', type: 'switch' },
      ]}
      defaults={{ isActive: true, isMain: false }}
    />
  );
}

export default function SettingsPage() {
  const { can } = useApp();
  const query = useApiQuery<Payload>('/api/settings');
  const [data, setData] = React.useState<Payload | null>(null);
  const [tab, setTab] = React.useState(() => (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab')) || 'profile');
  React.useEffect(() => {
    if (query.data) setData(query.data);
  }, [query.data]);
  const editable = can('settings', 'edit');
  return (
    <>
      <PageHeader title="School settings" description="Tailor the software to your school: profile, branding, academic rules, fees, gateways and numbering." icon={Settings} />
      {query.error ? (
        <ErrorState message={query.error.message} onRetry={() => query.refetch()} />
      ) : !data ? (
        <LoadingBlock />
      ) : (
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={[
            { value: 'profile', label: 'Profile & branding' },
            { value: 'academic', label: 'Academic' },
            { value: 'fees', label: 'Fees & payments' },
            { value: 'messaging', label: 'SMS, WhatsApp & Email' },
            { value: 'app', label: 'Languages & app' },
            { value: 'integrations', label: 'Integrations & data' },
            { value: 'campuses', label: 'Campuses' },
            { value: 'rules', label: 'Rules' },
            { value: 'advanced', label: 'Numbering & AI' },
          ]}
        >
          <TabPanel value="profile">
            <ProfileTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="academic">
            <AcademicTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="fees">
            <FeesTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="messaging">
            <MessagingTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="app">
            <AppTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="integrations">
            <IntegrationsTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="campuses">
            <Campuses />
          </TabPanel>
          <TabPanel value="rules">
            <RulesTab data={data} setData={setData} editable={editable} />
          </TabPanel>
          <TabPanel value="advanced">
            <AdvancedTab data={data} setData={setData} editable={editable} />
          </TabPanel>
        </Tabs>
      )}
    </>
  );
}
