import { ImageResponse } from 'next/og';
import { FACTS } from '@/website/content/site';
import { OG_SIZE, OgCard } from '@/website/og-card';

export const alt = 'Vidyalaya — school management software and ERP for Indian schools';
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    <OgCard
      eyebrow="CBSE · ICSE · State Boards"
      title="One app to run your entire school."
      subtitle="Admissions, fees with UPI, attendance, exams, transport, hostel, payroll and a parent app."
      chips={[`${FACTS.modules} modules`, `${FACTS.languages} Indian languages`, 'Free trial']}
    />,
    size,
  );
}
