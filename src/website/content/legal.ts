/**
 * Privacy Policy and Terms of Use for the public website and the sign-up form.
 * Written to match what the code does (form fields, attribution, consent-based
 * Google tags, data handling in the app). Have it reviewed by your legal advisor
 * before relying on it; update LEGAL_UPDATED when the text changes.
 */
import { COMPANY } from './company';
import { SITE } from './site';

export const LEGAL_UPDATED = '8 November 2026';

export interface LegalSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

const contact = `${COMPANY.legalName}, ${COMPANY.address.join(', ')}. Email ${COMPANY.email}; phone ${COMPANY.phones.join(' or ')}.`;

export const PRIVACY: LegalSection[] = [
  {
    heading: 'Who we are',
    paragraphs: [
      `${SITE.product} ("Vidyalaya", "we", "us") is school management software operated by ${COMPANY.legalName}. This policy explains how we handle personal data collected through this website, including the "Start free trial / Book a demo" form, and summarises how school data is handled inside the Vidyalaya service.`,
      `Contact and grievance officer: ${contact}`,
    ],
  },
  {
    heading: 'What we collect on this website',
    bullets: [
      'Details you type into the sign-up form: school name, your name and role, email, mobile number, city, state, board, number of students, the features you are interested in and your message.',
      'Your IP address when you submit the form, used to prevent spam and abuse.',
      'How you found us: the page you first landed on, the referring website, and campaign tags in the link you followed (such as utm_source, utm_campaign or a Google Ads click ID). This is kept in your browser and sent with the form so we know which advertisement or page led to your request.',
      'Your light/dark theme choice and your cookie choice, stored only in your browser.',
      'If you allow it in the cookie banner: Google Analytics and Google Ads cookies that measure visits and the performance of our advertisements.',
    ],
  },
  {
    heading: 'Why we use it',
    bullets: [
      'To reply to your request, arrange a demo, and set up a trial for your school.',
      'To understand which pages and advertisements are useful, and to improve the website.',
      'To keep the website and form secure and free from abuse.',
    ],
    paragraphs: ['We do not sell personal data, and we do not use form details for any purpose other than those above.'],
  },
  {
    heading: 'Consent',
    paragraphs: [
      'We process the details you submit on the basis of your consent, which you give by ticking the consent box on the form, in line with the Digital Personal Data Protection Act, 2023. Analytics and advertising cookies are used only after you choose "Accept" in the cookie banner. You can withdraw consent at any time by writing to us, and change your cookie choice from "Cookie settings" at the bottom of every page.',
    ],
  },
  {
    heading: 'Who we share it with',
    bullets: [
      'Service providers that host the website and its database, under contracts that require them to protect the data.',
      'Google (Google Analytics and Google Ads), only when you have accepted analytics and advertising cookies.',
      'Authorities, when the law requires it.',
    ],
  },
  {
    heading: 'How long we keep it',
    paragraphs: ['We keep sign-up requests for as long as we need them to respond and follow up, and delete them when you ask us to or when they are no longer needed.'],
  },
  {
    heading: 'Your rights',
    paragraphs: [
      'You can ask us for a summary of the personal data we hold about you, have it corrected or completed, have it erased, withdraw your consent, and nominate another person to exercise these rights on your behalf. Write to our grievance officer using the details above; we respond within the time required by law. If you are not satisfied, you may approach the Data Protection Board of India.',
    ],
  },
  {
    heading: 'School and student data in the Vidyalaya service',
    paragraphs: [
      'Inside Vidyalaya, each school decides what student, parent and staff data is recorded and is responsible for obtaining the consent it needs, including verifiable consent of parents for children. We process that data only on the school’s instructions to provide the service. It is kept separate for each school, protected by role-based access, encryption of sensitive fields such as Aadhaar numbers, and an audit log of every change.',
      'Analytics and advertising tags are never loaded inside the school app, and children’s data is never used for tracking or advertising.',
    ],
  },
  {
    heading: 'Security',
    paragraphs: ['The website and service are served only over HTTPS. Access to data is limited to people who need it, and every change in the service is recorded in an audit log.'],
  },
  {
    heading: 'Changes to this policy',
    paragraphs: ['We will update this page when our practices change and show the date of the latest update at the top.'],
  },
];

export const TERMS: LegalSection[] = [
  {
    heading: 'About these terms',
    paragraphs: [
      `These terms govern your use of the ${SITE.product} website. The website is operated by ${COMPANY.legalName}. Subscriptions to the Vidyalaya service are governed by the order or agreement a school signs with us.`,
    ],
  },
  {
    heading: 'Free trials and demos',
    paragraphs: [
      'Requesting a free trial or a demo does not create any obligation to buy. We may decline or end a trial at our discretion, for example to prevent misuse.',
    ],
  },
  {
    heading: 'Plans and prices',
    paragraphs: [
      'Plans and prices shown on the website are for information and may change. The price, taxes, term and modules that apply to a school are those in its order or invoice.',
    ],
  },
  {
    heading: 'Acceptable use',
    bullets: [
      'Do not submit false information or details of another person without their permission.',
      'Do not attempt to disrupt, overload, probe or gain unauthorised access to the website or the service.',
      'Do not copy, scrape or reuse the website’s content, screenshots or design without our written permission.',
    ],
  },
  {
    heading: 'Intellectual property',
    paragraphs: [`The website, the Vidyalaya name and logo, its software and content belong to ${COMPANY.legalName} or its licensors.`],
  },
  {
    heading: 'Screenshots and figures',
    paragraphs: ['Screens on this website show the Vidyalaya product with demonstration data. Charts marked as illustrative do not describe any particular school.'],
  },
  {
    heading: 'Disclaimer and liability',
    paragraphs: [
      'The website is provided “as is”. To the extent permitted by law, we are not liable for indirect or consequential loss arising from your use of the website. Nothing in these terms limits liability that cannot be limited by law.',
    ],
  },
  {
    heading: 'Governing law',
    paragraphs: ['These terms are governed by the laws of India, and the courts at Delhi have jurisdiction.'],
  },
  {
    heading: 'Contact',
    paragraphs: [contact],
  },
];
