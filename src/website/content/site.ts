/**
 * Marketing website configuration: navigation, categories, colour accents and
 * product facts. Product facts are computed from the real catalog
 * (src/lib/modules.ts, src/lib/i18n.ts) so the website never drifts from the app.
 * Placeholder business data (customers, testimonials, contact) lives in ./placeholder.ts.
 */
import { MODULES, ROLES } from '@/lib/modules';
import { LANGS } from '@/lib/i18n';

export const SITE = {
  name: 'Vidyalaya',
  product: 'Vidyalaya School ERP',
  tagline: 'School ERP for India',
  description:
    'Cloud school management software for Indian schools — admissions, fees, attendance, exams, transport, hostel, payroll and a parent app in 12 Indian languages.',
  loginHref: '/login',
  signupHref: '/get-started',
} as const;

/** Real numbers taken from the product itself. */
export const FACTS = {
  modules: MODULES.length,
  roles: ROLES.length,
  languages: LANGS.length,
  languageNames: LANGS.map((l) => l.native),
} as const;

export const CATEGORIES = [
  { key: 'admin', label: 'Administration', blurb: 'Admissions, records, staff and the front gate.' },
  { key: 'academics', label: 'Academics', blurb: 'Timetables, attendance, homework and exams.' },
  { key: 'finance', label: 'Finance', blurb: 'Fees, online payments, accounts and payroll.' },
  { key: 'communication', label: 'Communication', blurb: 'Every message, app and community channel.' },
  { key: 'operations', label: 'Operations', blurb: 'Buses, hostels, library, store and assets.' },
  { key: 'platform', label: 'Platform', blurb: 'Reports, AI, security, languages and integrations.' },
] as const;

export type CategoryKey = (typeof CATEGORIES)[number]['key'];

/**
 * Colour accents. Class names are written out in full so Tailwind keeps them.
 * `soft` = tinted surface, `chip` = label pill, `icon` = gradient tile, `text` = accent text,
 * `glow` = blurred background blob, `ring` = focus/active ring.
 */
export const ACCENTS = {
  indigo: { soft: 'bg-indigo-50 dark:bg-indigo-500/10', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/15 dark:bg-indigo-500/10 dark:text-indigo-300 dark:ring-indigo-400/20', icon: 'from-indigo-500 to-violet-500', text: 'text-indigo-600 dark:text-indigo-400', glow: 'bg-indigo-400/30', ring: 'ring-indigo-500' },
  violet: { soft: 'bg-violet-50 dark:bg-violet-500/10', chip: 'bg-violet-50 text-violet-700 ring-violet-600/15 dark:bg-violet-500/10 dark:text-violet-300 dark:ring-violet-400/20', icon: 'from-violet-500 to-fuchsia-500', text: 'text-violet-600 dark:text-violet-400', glow: 'bg-violet-400/30', ring: 'ring-violet-500' },
  emerald: { soft: 'bg-emerald-50 dark:bg-emerald-500/10', chip: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-400/20', icon: 'from-emerald-500 to-teal-500', text: 'text-emerald-600 dark:text-emerald-400', glow: 'bg-emerald-400/30', ring: 'ring-emerald-500' },
  amber: { soft: 'bg-amber-50 dark:bg-amber-500/10', chip: 'bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-400/20', icon: 'from-amber-400 to-orange-500', text: 'text-amber-600 dark:text-amber-400', glow: 'bg-amber-300/40', ring: 'ring-amber-500' },
  rose: { soft: 'bg-rose-50 dark:bg-rose-500/10', chip: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-400/20', icon: 'from-rose-500 to-pink-500', text: 'text-rose-600 dark:text-rose-400', glow: 'bg-rose-400/30', ring: 'ring-rose-500' },
  sky: { soft: 'bg-sky-50 dark:bg-sky-500/10', chip: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/10 dark:text-sky-300 dark:ring-sky-400/20', icon: 'from-sky-500 to-blue-600', text: 'text-sky-600 dark:text-sky-400', glow: 'bg-sky-400/30', ring: 'ring-sky-500' },
  teal: { soft: 'bg-teal-50 dark:bg-teal-500/10', chip: 'bg-teal-50 text-teal-700 ring-teal-600/15 dark:bg-teal-500/10 dark:text-teal-300 dark:ring-teal-400/20', icon: 'from-teal-500 to-cyan-500', text: 'text-teal-600 dark:text-teal-400', glow: 'bg-teal-400/30', ring: 'ring-teal-500' },
  fuchsia: { soft: 'bg-fuchsia-50 dark:bg-fuchsia-500/10', chip: 'bg-fuchsia-50 text-fuchsia-700 ring-fuchsia-600/15 dark:bg-fuchsia-500/10 dark:text-fuchsia-300 dark:ring-fuchsia-400/20', icon: 'from-fuchsia-500 to-pink-500', text: 'text-fuchsia-600 dark:text-fuchsia-400', glow: 'bg-fuchsia-400/30', ring: 'ring-fuchsia-500' },
  orange: { soft: 'bg-orange-50 dark:bg-orange-500/10', chip: 'bg-orange-50 text-orange-700 ring-orange-600/15 dark:bg-orange-500/10 dark:text-orange-300 dark:ring-orange-400/20', icon: 'from-orange-500 to-red-500', text: 'text-orange-600 dark:text-orange-400', glow: 'bg-orange-400/30', ring: 'ring-orange-500' },
  blue: { soft: 'bg-blue-50 dark:bg-blue-500/10', chip: 'bg-blue-50 text-blue-700 ring-blue-600/15 dark:bg-blue-500/10 dark:text-blue-300 dark:ring-blue-400/20', icon: 'from-blue-500 to-indigo-600', text: 'text-blue-600 dark:text-blue-400', glow: 'bg-blue-400/30', ring: 'ring-blue-500' },
} as const;

export type AccentKey = keyof typeof ACCENTS;

export const NAV = [
  { label: 'Features', href: '/features', mega: true },
  { label: 'Parent app', href: '/features/parent-app' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/#faq' },
] as const;

export const HOW_IT_WORKS = [
  { title: 'Tell us about your school', text: 'Fill the short form. We call within one working day to understand how your school works today.' },
  { title: 'We set up your school', text: 'Your school code, classes, fee structure and staff logins are created for you. Students come in from your Excel sheet.' },
  { title: 'Train your team', text: 'A guided session for the office, accountant and teachers. Every screen also works in 12 Indian languages.' },
  { title: 'Go live with families', text: 'Parents install the app, see attendance and homework, and pay fees by UPI from day one.' },
] as const;

export const FAQS = [
  {
    q: 'Which boards does Vidyalaya support?',
    a: 'CBSE, ICSE, State Boards, IB, Cambridge and NIOS. Grading, pass criteria, report-card layouts and remarks are set per school, so the same product fits a play school or a senior secondary school.',
  },
  {
    q: 'Do parents and students need a separate app?',
    a: 'No. The same Vidyalaya login works for staff, parents and students. Families can install it on Android, iPhone or desktop straight from the browser, get phone alerts, and switch between siblings with one tap.',
  },
  {
    q: 'Can we collect fees online?',
    a: 'Yes. Parents pay by UPI, cards or net banking through Razorpay, and the receipt is issued instantly. The counter still accepts cash, cheque, card and bank transfer, and every payment lands in the same ledger.',
  },
  {
    q: 'How do we move our existing data?',
    a: 'Students, staff, library books, opening fee dues and past receipts can be imported from Excel or CSV. Every row is checked before it is saved, and errors are shown line by line.',
  },
  {
    q: 'Is our school data safe?',
    a: `Every school's data is kept separate. Access is role-based across ${FACTS.roles} school roles, sensitive fields such as Aadhaar are encrypted, every change is written to an audit log, and data is hosted in India in line with the DPDP Act 2023.`,
  },
  {
    q: 'Can we switch off modules we do not need?',
    a: `Yes. Each of the ${FACTS.modules} modules can be turned on or off for your school, and rights can be set per role — view, create, edit and delete — without any code changes.`,
  },
  {
    q: 'Which languages are available?',
    a: `${FACTS.languages} languages: ${LANGS.map((l) => l.name).join(', ')}. Your school chooses which ones to offer, and each user picks their own.`,
  },
] as const;

export const FOOTER = [
  {
    title: 'Product',
    links: [
      { label: 'All features', href: '/features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Parent & student app', href: '/features/parent-app' },
      { label: 'Integrations', href: '/features/integrations' },
    ],
  },
  {
    title: 'Popular modules',
    links: [
      { label: 'Fees & online payments', href: '/features/fees' },
      { label: 'Attendance', href: '/features/attendance' },
      { label: 'Exams & report cards', href: '/features/exams' },
      { label: 'Transport & GPS', href: '/features/transport' },
    ],
  },
  {
    title: 'Get started',
    links: [
      { label: 'Start free trial', href: '/get-started' },
      { label: 'Book a demo', href: '/get-started?interest=demo' },
      { label: 'Log in', href: '/login' },
      { label: 'QR-verified certificates', href: '/features/certificates' },
    ],
  },
] as const;
