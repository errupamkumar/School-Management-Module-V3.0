import type { Metadata } from 'next';
import { TERMS } from '@/website/content/legal';
import { LegalPage } from '@/website/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Use',
  description: 'Terms that govern the use of the Vidyalaya School ERP website, free trials and demo requests.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return <LegalPage title="Terms of Use" intro="Plain-language terms for using this website and requesting a free trial or demo." sections={TERMS} />;
}
