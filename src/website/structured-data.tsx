/**
 * schema.org JSON-LD for search engines. Only facts the product can back up:
 * no ratings or review counts (the website's adoption figures are placeholders).
 */
import { COMPANY } from './content/company';
import { FAQS, FACTS, SITE } from './content/site';
import type { Feature } from './content/features';
import type { PublicPlan } from './server/plans';
import { absoluteUrl, siteUrl } from './site-url';

export function JsonLd({ data }: { data: object | object[] }) {
  // `<` is escaped so the JSON can never close the script element.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export function organizationLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${siteUrl()}/#organization`,
    name: COMPANY.legalName,
    alternateName: COMPANY.name,
    url: COMPANY.url,
    logo: absoluteUrl(COMPANY.logo.src),
    email: COMPANY.email,
    address: { '@type': 'PostalAddress', streetAddress: 'A-21, Ground Floor, Pandav Nagar', addressLocality: 'Delhi', postalCode: '110092', addressCountry: 'IN' },
    contactPoint: COMPANY.phones.map((p) => ({ '@type': 'ContactPoint', telephone: p.replace(/[^\d+]/g, ''), contactType: 'sales', areaServed: 'IN', availableLanguage: ['en', 'hi'] })),
  };
}

export function websiteLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${siteUrl()}/#website`, url: siteUrl(), name: SITE.product, publisher: { '@id': `${siteUrl()}/#organization` }, inLanguage: 'en-IN' };
}

export function softwareLd(plans: PublicPlan[] | null) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.product,
    url: siteUrl(),
    description: SITE.description,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'School management software',
    operatingSystem: 'Web, Android, iOS',
    inLanguage: 'en-IN',
    featureList: `${FACTS.modules} modules: admissions, students, attendance, timetable, homework, exams and report cards, fees and online payments, accounts, payroll, transport with live GPS, hostel, library, communication, parent app, ${FACTS.languages} Indian languages`,
    screenshot: absoluteUrl('/website/screens/03-dashboard-admin.webp'),
    provider: { '@id': `${siteUrl()}/#organization` },
    offers: plans?.length
      ? plans.map((p) => ({
          '@type': 'Offer',
          name: `${p.name} plan`,
          priceCurrency: 'INR',
          price: p.priceMonthly > 0 ? p.priceMonthly : p.pricePerStudent,
          priceSpecification: { '@type': 'UnitPriceSpecification', priceCurrency: 'INR', price: p.priceMonthly > 0 ? p.priceMonthly : p.pricePerStudent, unitText: p.priceMonthly > 0 ? 'MONTH' : 'student per month' },
          url: absoluteUrl('/pricing'),
        }))
      : undefined,
  };
}

export function faqLd(items: readonly { q: string; a: string }[] = FAQS) {
  return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
}

export function breadcrumbLd(trail: { name: string; path: string }[]) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: trail.map((t, i) => ({ '@type': 'ListItem', position: i + 1, name: t.name, item: absoluteUrl(t.path) })) };
}

export function featureLd(f: Feature) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: f.seo?.title ?? f.title,
    description: f.seo?.description ?? f.summary,
    url: absoluteUrl(`/features/${f.slug}`),
    isPartOf: { '@id': `${siteUrl()}/#website` },
    about: { '@type': 'SoftwareApplication', name: `${SITE.product} — ${f.title}`, applicationCategory: 'BusinessApplication', operatingSystem: 'Web, Android, iOS', featureList: f.capabilities.map((c) => c.title).join(', ') },
  };
}
