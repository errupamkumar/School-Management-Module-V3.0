/**
 * PLACEHOLDER CONTENT — replace before the website goes live.
 *
 * Customer counts, school names and testimonials below are dummy values
 * written for the design. The schools and people are fictional. Swap them for
 * real, consented customer data before publishing. (Real contact details are
 * in ./company.ts.)
 *
 * Hidden unless NEXT_PUBLIC_SHOW_SAMPLE_CONTENT=1: fictional testimonials and
 * customer numbers must not reach real visitors (and break Google Ads'
 * misrepresentation policy). Without it the website shows only product facts.
 */

export const SHOW_SAMPLE_CONTENT = process.env.NEXT_PUBLIC_SHOW_SAMPLE_CONTENT === '1';

/** Commercial promises shown next to the sign-up buttons. */
export const OFFER = ['Free set-up and data import', 'No credit card needed', 'Cancel any time'] as const;

export const ADOPTION = {
  schools: 1200,
  users: 450000,
  states: 22,
  rating: 4.8,
} as const;

/** Fictional schools for the logo wall. `mark` is the monogram shown in the badge. */
export const CLIENT_SCHOOLS = [
  { name: 'Shanti Niketan Public School', city: 'Ranchi', mark: 'SN' },
  { name: 'Green Valley Convent', city: 'Dehradun', mark: 'GV' },
  { name: 'Saraswati Vidya Mandir', city: 'Varanasi', mark: 'SV' },
  { name: 'Lotus International School', city: 'Pune', mark: 'LI' },
  { name: 'Sunrise Academy', city: 'Jaipur', mark: 'SA' },
  { name: 'Kaveri Model School', city: 'Mysuru', mark: 'KM' },
  { name: 'Brahmaputra Valley School', city: 'Guwahati', mark: 'BV' },
  { name: 'Narmada Senior Secondary', city: 'Indore', mark: 'NS' },
  { name: 'Coastal Heritage School', city: 'Kochi', mark: 'CH' },
  { name: 'Himalayan Pine School', city: 'Shimla', mark: 'HP' },
] as const;

export const TESTIMONIALS = [
  {
    quote: 'Fee collection used to take our office the whole first week of every month. Now parents pay by UPI from the app and the receipts and day-book are ready on their own.',
    name: 'Meera Krishnan',
    role: 'Principal',
    school: 'Kaveri Model School, Mysuru',
    metric: '3 days saved every month',
  },
  {
    quote: 'Attendance is done in under a minute per class, and parents get an alert the moment a child is marked absent. Calls to the front office dropped sharply.',
    name: 'Rajesh Verma',
    role: 'Director',
    school: 'Shanti Niketan Public School, Ranchi',
    metric: 'Attendance in < 1 minute',
  },
  {
    quote: 'Our teachers enter marks once and the report cards, ranks and remarks come out ready to print. Result day is calm for the first time in years.',
    name: 'Fatima Sheikh',
    role: 'Exam Coordinator',
    school: 'Lotus International School, Pune',
    metric: 'Report cards in one click',
  },
  {
    quote: 'Parents watch the bus on the map and know exactly when to come to the stop. Our transport complaints have almost disappeared.',
    name: 'Arvind Choudhary',
    role: 'Transport In-charge',
    school: 'Sunrise Academy, Jaipur',
    metric: 'Live bus ETA for parents',
  },
  {
    quote: 'Having the app in Bengali and Hindi made the difference for our parents. They actually read the notices now.',
    name: 'Sutapa Banerjee',
    role: 'Administrator',
    school: 'Brahmaputra Valley School, Guwahati',
    metric: '12 Indian languages',
  },
] as const;
