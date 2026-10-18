/**
 * Typed per-school settings stored in School.settings (JSON). Everything a
 * customer may want to tailor without code changes lives here.
 */
import { z } from 'zod';

export const settingsSchema = z.object({
  numbering: z
    .object({
      admissionPrefix: z.string().max(12).default('ADM'),
      receiptPrefix: z.string().max(12).default('RCPT'),
      invoicePrefix: z.string().max(12).default('INV'),
      employeePrefix: z.string().max(12).default('EMP'),
      salarySlipPrefix: z.string().max(12).default('SAL'),
      certificatePrefix: z.string().max(12).default('CERT'),
      orderPrefix: z.string().max(12).default('POS'),
      applicationPrefix: z.string().max(12).default('APP'),
    })
    .default({
      admissionPrefix: 'ADM',
      receiptPrefix: 'RCPT',
      invoicePrefix: 'INV',
      employeePrefix: 'EMP',
      salarySlipPrefix: 'SAL',
      certificatePrefix: 'CERT',
      orderPrefix: 'POS',
      applicationPrefix: 'APP',
    }),
  workingDays: z.array(z.number().int().min(1).max(7)).default([1, 2, 3, 4, 5, 6]),
  attendance: z
    .object({
      notifyParentsOnAbsence: z.boolean().default(true),
      allowEditAfterDays: z.number().int().min(0).max(30).default(2),
    })
    .default({ notifyParentsOnAbsence: true, allowEditAfterDays: 2 }),
  exams: z
    .object({
      overallPassPercent: z.number().min(0).max(100).default(33),
      subjectPassPercent: z.number().min(0).max(100).default(33),
      maxFailedSubjects: z.number().int().min(0).max(20).default(0),
      showRank: z.boolean().default(true),
    })
    .default({ overallPassPercent: 33, subjectPassPercent: 33, maxFailedSubjects: 0, showRank: true }),
  fees: z
    .object({
      allowPartialPayment: z.boolean().default(true),
      carryForwardDues: z.boolean().default(true),
      onlinePaymentEnabled: z.boolean().default(false),
      /** Money collected beyond the dues is kept as advance and used on the next invoices. */
      allowAdvance: z.boolean().default(true),
      receiptFooter: z.string().max(500).default('This is a computer-generated receipt.'),
    })
    .default({ allowPartialPayment: true, carryForwardDues: true, onlinePaymentEnabled: false, allowAdvance: true, receiptFooter: 'This is a computer-generated receipt.' }),
  behaviourTraits: z
    .array(z.string().max(40))
    .default(['Punctuality', 'Discipline', 'Neatness', 'Cooperation', 'Leadership', 'Honesty']),
  skillTraits: z
    .array(z.string().max(40))
    .default(['Handwriting', 'Communication', 'Sports', 'Art & Craft', 'Music', 'Computer Skills']),
  rules: z
    .object({ students: z.string().max(20000).default(''), employees: z.string().max(20000).default('') })
    .default({ students: '', employees: '' }),
  bankAccounts: z
    .array(
      z.object({
        bankName: z.string().max(80),
        branch: z.string().max(120).optional(),
        accountName: z.string().max(120).optional(),
        accountNo: z.string().max(30),
        ifsc: z.string().max(11).optional(),
        upiId: z.string().max(80).optional(),
        instructions: z.string().max(500).optional(),
      })
    )
    .default([]),
  messaging: z
    .object({
      smsProvider: z.enum(['NONE', 'MSG91', 'TWILIO']).default('NONE'),
      smsSenderId: z.string().max(11).default(''),
      whatsappProvider: z.enum(['NONE', 'META_CLOUD', 'GUPSHUP']).default('NONE'),
      // Credentials are stored encrypted (see crypto.encryptField); never echoed to clients.
      smsApiKeyEnc: z.string().optional(),
      whatsappTokenEnc: z.string().optional(),
      whatsappPhoneNumberId: z.string().max(40).optional(),
      emailProvider: z.enum(['NONE', 'SMTP']).default('NONE'),
      smtpHost: z.string().max(120).default(''),
      smtpPort: z.number().int().min(1).max(65535).default(587),
      /** true = TLS from the start (port 465); false = STARTTLS. */
      smtpSecure: z.boolean().default(false),
      smtpUser: z.string().max(120).default(''),
      smtpPassEnc: z.string().optional(),
      fromEmail: z.string().max(120).default(''),
      fromName: z.string().max(80).default(''),
    })
    .default({ smsProvider: 'NONE', smsSenderId: '', whatsappProvider: 'NONE', emailProvider: 'NONE', smtpHost: '', smtpPort: 587, smtpSecure: false, smtpUser: '', fromEmail: '', fromName: '' }),
  payments: z
    .object({
      razorpayKeyId: z.string().max(60).default(''),
      // Encrypted with crypto.encryptField; never sent to clients.
      razorpayKeySecretEnc: z.string().optional(),
      razorpayWebhookSecretEnc: z.string().optional(),
    })
    .default({ razorpayKeyId: '' }),
  ai: z.object({ dailyTokenLimitPerUser: z.number().int().min(0).max(2_000_000).default(50_000) }).default({ dailyTokenLimitPerUser: 50_000 }),
  liveTracking: z
    .object({
      enabled: z.boolean().default(false),
      shareWithParents: z.boolean().default(true),
      /** How often Driver mode sends a position. */
      pingIntervalSec: z.number().int().min(5).max(120).default(15),
      /** Parents get "bus approaching" when it comes this close to their stop. 0 turns alerts off. */
      approachAlertMeters: z.number().int().min(0).max(5000).default(800),
      /** Positions older than this are deleted. */
      retainDays: z.number().int().min(1).max(365).default(30),
    })
    .default({ enabled: false, shareWithParents: true, pingIntervalSec: 15, approachAlertMeters: 800, retainDays: 30 }),
  maps: z
    .object({
      tileUrl: z.string().max(300).default('https://tile.openstreetmap.org/{z}/{x}/{y}.png'),
      attribution: z.string().max(200).default('© OpenStreetMap contributors'),
    })
    .default({ tileUrl: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors' }),
  languages: z
    .object({
      enabled: z.array(z.string().max(5)).min(1).default(['en', 'hi']),
      default: z.string().max(5).default('en'),
    })
    .default({ enabled: ['en', 'hi'], default: 'en' }),
  notifications: z.object({ pushEnabled: z.boolean().default(true) }).default({ pushEnabled: true }),
  tally: z
    .object({
      companyName: z.string().max(120).default(''),
      cashLedger: z.string().max(80).default('Cash'),
      bankLedger: z.string().max(80).default('Bank Account'),
      /** Account head name -> Tally ledger name; unmapped heads export under their own name. */
      ledgerMap: z.record(z.string().max(80), z.string().max(80)).default({}),
    })
    .default({ companyName: '', cashLedger: 'Cash', bankLedger: 'Bank Account', ledgerMap: {} }),
  /** Ready-made report-card / general remarks teachers pick from. */
  remarkBank: z
    .array(z.string().max(300))
    .max(100)
    .default([
      'Excellent progress this term. Keep it up!',
      'Works hard and participates actively in class.',
      'Good effort; needs more practice in written work.',
      'Capable of better results with regular revision.',
      'Needs to improve punctuality and complete homework on time.',
      'A pleasure to have in class — helpful and well-behaved.',
    ]),
  disciplineCategories: z
    .array(z.string().max(40))
    .max(30)
    .default(['Late coming', 'Uniform', 'Homework not done', 'Misbehaviour', 'Bullying', 'Mobile phone', 'Damage to property', 'Absent without leave', 'Other']),
  gate: z
    .object({
      /** Tell the parent when a gate pass is issued and when the child leaves. */
      notifyParents: z.boolean().default(true),
    })
    .default({ notifyParents: true }),
  sso: z
    .object({
      google: z.boolean().default(false),
      microsoft: z.boolean().default(false),
      /** Only these email domains may sign in with SSO (empty = any verified email that matches a user). */
      allowedDomains: z.array(z.string().max(80)).max(10).default([]),
    })
    .default({ google: false, microsoft: false, allowedDomains: [] }),
  /** App Frame: other web tools shown inside the app. */
  apps: z
    .array(
      z.object({
        id: z.string().max(40),
        title: z.string().max(40),
        url: z.string().max(500),
        roles: z.array(z.enum(['ADMIN', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'STORE_MANAGER', 'STAFF', 'PARENT', 'STUDENT'])).default([]),
        newTab: z.boolean().default(false),
      })
    )
    .max(12)
    .default([]),
  liveClasses: z
    .object({
      bbbUrl: z.string().max(200).default(''),
      // Encrypted with crypto.encryptField; never sent to clients.
      bbbSecretEnc: z.string().optional(),
    })
    .default({ bbbUrl: '' }),
  blog: z.object({ publicPage: z.boolean().default(false) }).default({ publicPage: false }),
  alumni: z.object({ selfRegistration: z.boolean().default(false) }).default({ selfRegistration: false }),
});

export type SchoolSettings = z.infer<typeof settingsSchema>;

export const APP_ROLES = ['ADMIN', 'TEACHER', 'ACCOUNTANT', 'RECEPTIONIST', 'LIBRARIAN', 'TRANSPORT_MANAGER', 'STORE_MANAGER', 'STAFF', 'PARENT', 'STUDENT'] as const;

export function readSettings(raw: unknown): SchoolSettings {
  const parsed = settingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : settingsSchema.parse({});
}

/** Settings safe to send to any signed-in user of the school. */
export function publicSettings(s: SchoolSettings) {
  return {
    workingDays: s.workingDays,
    exams: s.exams,
    fees: { allowPartialPayment: s.fees.allowPartialPayment, onlinePaymentEnabled: s.fees.onlinePaymentEnabled, allowAdvance: s.fees.allowAdvance },
    behaviourTraits: s.behaviourTraits,
    skillTraits: s.skillTraits,
    liveTracking: { enabled: s.liveTracking.enabled, shareWithParents: s.liveTracking.shareWithParents, pingIntervalSec: s.liveTracking.pingIntervalSec },
    maps: s.maps,
    languages: s.languages,
    notifications: s.notifications,
    remarkBank: s.remarkBank,
    disciplineCategories: s.disciplineCategories,
    liveClasses: { bbb: !!(s.liveClasses.bbbUrl && s.liveClasses.bbbSecretEnc) },
  };
}
