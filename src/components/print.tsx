'use client';

import * as React from 'react';
import { GraduationCap, Printer } from 'lucide-react';
import { useApiQuery } from '@/lib/api-client';
import { Button } from '@/components/ui/button';

export interface SchoolHeader {
  name: string;
  logoUrl?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  phone?: string | null;
  email?: string | null;
  affiliationNo?: string | null;
  board?: string | null;
}

/** A4 print surface with a toolbar that hides when printing. */
export function PrintPage({ children, title, autoPrint, landscape }: { children: React.ReactNode; title: string; autoPrint?: boolean; landscape?: boolean }) {
  React.useEffect(() => {
    document.title = title;
    if (autoPrint) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [title, autoPrint]);
  return (
    <div className="min-h-dvh bg-slate-100 py-6 print:bg-white print:py-0">
      {landscape && <style>{'@page { size: A4 landscape; }'}</style>}
      <div className="no-print mx-auto mb-4 flex max-w-[210mm] items-center justify-between px-4">
        <p className="text-sm text-slate-600">{title}</p>
        <Button onClick={() => window.print()}>
          <Printer /> Print / Save PDF
        </Button>
      </div>
      <div className={landscape ? 'mx-auto max-w-[297mm] bg-white p-[10mm] text-[13px] text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none' : 'mx-auto max-w-[210mm] bg-white p-[12mm] text-[13px] text-slate-900 shadow-sm print:max-w-none print:p-0 print:shadow-none'}>{children}</div>
    </div>
  );
}

export function Letterhead({ school, subtitle }: { school: SchoolHeader; subtitle?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b-2 border-slate-800 pb-3">
      {school.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={school.logoUrl} alt="" className="size-16 object-contain" />
      ) : (
        <span className="flex size-14 items-center justify-center rounded-full border-2 border-slate-800">
          <GraduationCap className="size-7" />
        </span>
      )}
      <div className="flex-1 text-center">
        <p className="text-xl font-extrabold uppercase tracking-wide">{school.name}</p>
        <p className="text-[11px] text-slate-600">{[school.address, school.city, school.state, school.pincode].filter(Boolean).join(', ')}</p>
        <p className="text-[11px] text-slate-600">
          {[school.phone && `Ph: ${school.phone}`, school.email, school.board && school.affiliationNo && `${school.board} Affiliation No. ${school.affiliationNo}`].filter(Boolean).join(' · ')}
        </p>
        {subtitle && <div className="mt-1.5">{subtitle}</div>}
      </div>
      <span className="size-14" />
    </div>
  );
}

/** Typography for sanitized rich text (certificate bodies) — preflight strips element styles. */
export const RICH_TEXT =
  '[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_u]:underline [&_p]:mb-3 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h4]:font-semibold [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:border-l-4 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_hr]:my-4 [&_small]:text-xs';

export function usePrintData<T>(url: string | null) {
  return useApiQuery<T>(url, undefined, { retry: false });
}

export function PrintState({ loading, error }: { loading: boolean; error?: string | null }) {
  if (loading) return <p className="p-10 text-center text-sm text-slate-500">Preparing document…</p>;
  if (error) return <p className="p-10 text-center text-sm text-rose-600">{error}</p>;
  return null;
}
