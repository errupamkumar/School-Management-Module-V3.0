import { z } from 'zod';
import { isLang, LANG_CODES } from '@/lib/i18n';
import { PALETTE_NAMES } from '@/lib/theme';
import { badRequest, body, route } from '@/server/api';
import { encryptField } from '@/server/crypto';
import { razorpayCreds, sandboxEnabled } from '@/server/services/razorpay';
import { APP_ROLES, readSettings, settingsSchema, type SchoolSettings } from '@/server/settings';
import { ssoProviderConfigured } from '@/server/sso';

const PROFILE_SELECT = {
  code: true, name: true, shortName: true, tagline: true, email: true, phone: true, website: true, address: true, city: true, district: true, state: true, pincode: true,
  logoUrl: true, board: true, affiliationNo: true, udiseCode: true, establishedYear: true, themeColor: true, defaultLanguage: true, academicYearStartMonth: true,
  status: true, trialEndsAt: true, subscriptionEndsAt: true, plan: { select: { name: true, maxStudents: true, maxCampuses: true } },
} as const;

/** Empty form fields become null. */
const opt = <T extends z.ZodType>(s: T) => z.preprocess((v) => (v === '' ? null : v), s.nullable().optional());

const profileSchema = z
  .object({
    name: z.string().trim().min(3).max(120),
    shortName: opt(z.string().trim().max(30)),
    tagline: opt(z.string().trim().max(160)),
    email: opt(z.string().trim().email().max(120)),
    phone: opt(z.string().trim().regex(/^[0-9+\-\s()]{6,20}$/, 'Enter a valid phone number')),
    website: opt(z.string().trim().url().max(200).refine((u) => /^https?:\/\//i.test(u), 'Must start with http:// or https://')),
    address: opt(z.string().trim().max(300)),
    city: opt(z.string().trim().max(60)),
    district: opt(z.string().trim().max(60)),
    state: opt(z.string().trim().max(60)),
    pincode: opt(z.string().trim().regex(/^[1-9]\d{5}$/, 'PIN code must be 6 digits')),
    board: opt(z.enum(['CBSE', 'ICSE', 'STATE', 'IB', 'CAMBRIDGE', 'NIOS', 'OTHER'])),
    affiliationNo: opt(z.string().trim().max(40)),
    udiseCode: opt(z.string().trim().regex(/^\d{11}$/, 'UDISE+ code is 11 digits')),
    establishedYear: opt(z.coerce.number().int().min(1800).max(new Date().getFullYear())),
    logoUrl: opt(z.string().max(400_000, 'Logo is too large').regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, 'Logo must be a PNG, JPEG or WebP image')),
    themeColor: z.enum(PALETTE_NAMES as [string, ...string[]]),
    defaultLanguage: z.enum(LANG_CODES as [string, ...string[]]),
    academicYearStartMonth: z.coerce.number().int().min(1).max(12),
  })
  .partial();

/**
 * Sections are taken raw and validated after merging with the saved settings:
 * parsing them here would fill omitted fields with schema defaults and
 * overwrite what the school saved.
 */
const section = z.unknown().optional();
const settingsInput = z
  .object({
    numbering: section,
    workingDays: section,
    attendance: section,
    exams: section,
    fees: section,
    behaviourTraits: section,
    skillTraits: section,
    rules: section,
    bankAccounts: section,
    ai: section,
    liveTracking: section,
    maps: z
      .object({
        tileUrl: z.string().trim().regex(/^https:\/\/[^\s]+\{z\}[^\s]*\{x\}[^\s]*\{y\}[^\s]*$/, 'Tile URL must be https and contain {z}, {x} and {y}'),
        attribution: z.string().trim().max(200),
      })
      .partial()
      .strict()
      .optional(),
    languages: section,
    notifications: section,
    tally: section,
    remarkBank: z.array(z.string().trim().min(1).max(300)).max(100).optional(),
    disciplineCategories: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
    gate: section,
    blog: section,
    alumni: section,
    sso: z
      .object({
        google: z.boolean(),
        microsoft: z.boolean(),
        allowedDomains: z.array(z.string().trim().toLowerCase().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Enter domains like school.edu.in')).max(10),
      })
      .partial()
      .strict()
      .optional(),
    apps: z
      .array(
        z.object({
          id: z.string().trim().min(1).max(40),
          title: z.string().trim().min(1).max(40),
          url: z.string().trim().url().max(500).refine((u) => u.startsWith('https://'), 'App links must start with https://'),
          roles: z.array(z.enum(APP_ROLES)).min(1, 'Choose who can open the app'),
          newTab: z.boolean().default(false),
        })
      )
      .max(12)
      .optional(),
    liveClasses: z
      .object({ bbbUrl: z.string().trim().regex(/^(https:\/\/[^\s]+)?$/, 'BigBlueButton server URL must start with https://') })
      .strict()
      .optional(),
    // Encrypted credentials are set through `secrets`, never accepted here.
    messaging: z
      .object({
        smsProvider: z.enum(['NONE', 'MSG91', 'TWILIO']),
        smsSenderId: z.string().trim().regex(/^([A-Z]{6})?$/, 'DLT sender ID is 6 capital letters'),
        whatsappProvider: z.enum(['NONE', 'META_CLOUD', 'GUPSHUP']),
        whatsappPhoneNumberId: z.string().trim().max(40),
        emailProvider: z.enum(['NONE', 'SMTP']),
        smtpHost: z.string().trim().regex(/^([a-zA-Z0-9.-]+)?$/, 'Enter a host name like smtp.gmail.com').max(120),
        smtpPort: z.coerce.number().int().min(1).max(65535),
        smtpSecure: z.boolean(),
        smtpUser: z.string().trim().max(120),
        fromEmail: z.union([z.literal(''), z.string().trim().email().max(120)]),
        fromName: z.string().trim().max(80),
      })
      .partial()
      .strict()
      .optional(),
    payments: z
      .object({ razorpayKeyId: z.string().trim().regex(/^(rzp_(test|live)_[A-Za-z0-9]{8,30})?$/, 'Razorpay key id looks like rzp_live_…') })
      .strict()
      .optional(),
  })
  .strict();

const secret = z.string().trim().min(8).max(200).nullable().optional();
const secretsInput = z.object({ smsApiKey: secret, whatsappToken: secret, razorpayKeySecret: secret, razorpayWebhookSecret: secret, smtpPassword: z.string().min(1).max(200).nullable().optional(), bbbSecret: secret });

/** Settings for the admin screen: credentials are reported as set/not set only. */
function view(s: SchoolSettings) {
  const { smsApiKeyEnc, whatsappTokenEnc, smtpPassEnc, ...messaging } = s.messaging;
  const { razorpayKeySecretEnc, razorpayWebhookSecretEnc, ...payments } = s.payments;
  const { bbbSecretEnc, ...liveClasses } = s.liveClasses;
  return {
    ...s,
    messaging: { ...messaging, smsApiKeySet: !!smsApiKeyEnc, whatsappTokenSet: !!whatsappTokenEnc, smtpPasswordSet: !!smtpPassEnc },
    liveClasses: { ...liveClasses, bbbSecretSet: !!bbbSecretEnc },
    sso: { ...s.sso, googleAvailable: ssoProviderConfigured('google'), microsoftAvailable: ssoProviderConfigured('microsoft') },
    payments: { ...payments, razorpayKeySecretSet: !!razorpayKeySecretEnc, razorpayWebhookSecretSet: !!razorpayWebhookSecretEnc, sandbox: sandboxEnabled() },
  };
}

export const GET = route({ module: 'settings' }, async (ctx) => {
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { ...PROFILE_SELECT, settings: true } });
  const { settings, ...profile } = school;
  return { profile, settings: view(readSettings(settings)) };
});

export const PUT = route({ module: 'settings', action: 'edit' }, async (ctx, req) => {
  const input = await body(req, z.object({ profile: profileSchema.optional(), settings: settingsInput.optional(), secrets: secretsInput.optional() }));
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { settings: true } });
  const current = readSettings(school.settings);
  const changed: string[] = [];

  let next: SchoolSettings = current;
  if (input.settings) {
    const merged: Record<string, unknown> = { ...current };
    for (const [k, v] of Object.entries(input.settings)) {
      if (v === undefined) continue;
      const cur = (current as Record<string, unknown>)[k];
      // Objects merge (keeps encrypted keys and unspecified fields); arrays and scalars replace.
      merged[k] = v && typeof v === 'object' && !Array.isArray(v) && cur && typeof cur === 'object' ? { ...cur, ...v } : v;
      changed.push(k);
    }
    next = settingsSchema.parse(merged);
  }
  if (input.secrets) {
    const m = { ...next.messaging };
    const p = { ...next.payments };
    const lc = { ...next.liveClasses };
    const apply = (val: string | null | undefined, set: (enc: string | undefined) => void, label: string) => {
      if (val === undefined) return;
      set(val === null ? undefined : encryptField(val));
      changed.push(`${label} ${val === null ? 'removed' : 'updated'}`);
    };
    apply(input.secrets.smsApiKey, (e) => (m.smsApiKeyEnc = e), 'SMS API key');
    apply(input.secrets.whatsappToken, (e) => (m.whatsappTokenEnc = e), 'WhatsApp token');
    apply(input.secrets.razorpayKeySecret, (e) => (p.razorpayKeySecretEnc = e), 'Razorpay key secret');
    apply(input.secrets.razorpayWebhookSecret, (e) => (p.razorpayWebhookSecretEnc = e), 'Razorpay webhook secret');
    apply(input.secrets.smtpPassword, (e) => (m.smtpPassEnc = e), 'SMTP password');
    apply(input.secrets.bbbSecret, (e) => (lc.bbbSecretEnc = e), 'BigBlueButton secret');
    next = { ...next, messaging: m, payments: p, liveClasses: lc };
  }
  if (next.languages.enabled.some((l) => !isLang(l))) throw badRequest('Unknown language in the enabled list.');
  if (!next.languages.enabled.includes(next.languages.default)) throw badRequest('The default language must be one of the enabled languages.');
  if (next.fees.onlinePaymentEnabled && !current.fees.onlinePaymentEnabled && !razorpayCreds(next) && !sandboxEnabled()) {
    throw badRequest('Add your Razorpay key id and key secret before enabling online fee payment.');
  }
  if ((next.sso.google && !current.sso.google && !ssoProviderConfigured('google')) || (next.sso.microsoft && !current.sso.microsoft && !ssoProviderConfigured('microsoft'))) {
    throw badRequest('This sign-in provider is not set up on the server yet. Ask your platform operator to add its client id and secret.');
  }
  if (new Set(next.apps.map((a) => a.id)).size !== next.apps.length) throw badRequest('Each app needs a unique id.');
  if (next.messaging.emailProvider === 'SMTP' && (!next.messaging.smtpHost || !next.messaging.fromEmail)) throw badRequest('Enter the SMTP host and the From email address.');
  if (next.payments.razorpayKeyId && !next.payments.razorpayKeySecretEnc && input.settings?.payments) {
    throw badRequest('Enter the Razorpay key secret together with the key id.');
  }

  const profile = input.profile ?? {};
  if (Object.keys(profile).length) changed.push(`profile (${Object.keys(profile).join(', ')})`);
  if (!changed.length) throw badRequest('Nothing to save.');
  await ctx.db.school.update({ where: { id: ctx.user.schoolId }, data: { ...profile, ...(input.settings?.languages ? { defaultLanguage: next.languages.default } : {}), ...(input.settings || input.secrets ? { settings: next } : {}) } });
  await ctx.audit('UPDATE', 'Settings', ctx.user.schoolId, changed.join('; '));
  const saved = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { ...PROFILE_SELECT, settings: true } });
  const { settings, ...rest } = saved;
  return { profile: rest, settings: view(readSettings(settings)) };
});
