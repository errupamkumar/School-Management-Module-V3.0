import type { Metadata } from 'next';
import { PRIVACY } from '@/website/content/legal';
import { LegalPage } from '@/website/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Vidyalaya School ERP collects, uses and protects personal data on its website and in the service.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" intro="Your privacy, and the privacy of every child whose school uses Vidyalaya, matters to us. Here is exactly what we collect, why, and the choices you have." sections={PRIVACY} />;
}
