'use client';

import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Student {
  name: string;
  admissionNo: string;
  admissionDate: string;
  rollNo: string | null;
  classLabel: string;
  dob: string | null;
  gender: string;
  guardian: { fatherName: string | null; motherName: string | null; primaryPhone: string; address: string | null } | null;
  address: string | null;
  transport: { route: { name: string }; stop: { name: string; pickupTime: string | null } } | null;
}

export default function AdmissionLetter() {
  const { id } = useParams<{ id: string }>();
  const s = usePrintData<Student>(`/api/students/${id}`);
  const school = usePrintData<SchoolHeader>('/api/school');
  const d = s.data;
  return (
    <PrintPage title={d ? `Admission letter ${d.admissionNo}` : 'Admission letter'}>
      <PrintState loading={s.isLoading || school.isLoading} error={s.error?.message ?? school.error?.message} />
      {d && school.data && (
        <div className="font-serif text-[14px] leading-7">
          <Letterhead school={school.data} />
          <div className="mt-4 flex justify-between font-sans text-[12px]">
            <p>Ref: ADM/{d.admissionNo}</p>
            <p>Date: {formatDate(d.admissionDate, 'long')}</p>
          </div>
          <p className="mt-6">To,</p>
          <p>
            {d.guardian?.fatherName ?? d.guardian?.motherName ?? 'Parent / Guardian'}
            <br />
            {(d.guardian?.address ?? d.address) || ''}
          </p>
          <p className="mt-6 text-center font-sans text-base font-bold uppercase tracking-wider underline underline-offset-4">Confirmation of admission</p>
          <p className="mt-4">Dear Parent,</p>
          <p className="mt-2 text-justify">
            We are pleased to confirm the admission of your ward <b>{d.name}</b> to <b>{d.classLabel}</b> at {school.data.name}. The admission details are given below for your records. Please quote the admission number in all future
            correspondence and fee payments.
          </p>
          <table className="mx-auto mt-4 w-4/5 border-collapse font-sans text-[13px]">
            <tbody>
              {[
                ['Student name', d.name],
                ['Admission number', d.admissionNo],
                ['Class & section', d.classLabel],
                ['Roll number', d.rollNo ?? '—'],
                ['Date of birth', formatDate(d.dob, 'long')],
                ['Date of admission', formatDate(d.admissionDate, 'long')],
                ["Father's / mother's name", [d.guardian?.fatherName, d.guardian?.motherName].filter(Boolean).join(' / ') || '—'],
                ['Registered mobile', d.guardian?.primaryPhone ?? '—'],
                ...(d.transport ? [['Transport', `${d.transport.route.name} · ${d.transport.stop.name}${d.transport.stop.pickupTime ? ` (pickup ${d.transport.stop.pickupTime})` : ''}`]] : []),
              ].map(([k, v]) => (
                <tr key={k}>
                  <td className="w-2/5 border border-slate-300 bg-slate-50 px-3 py-1.5 font-semibold">{k}</td>
                  <td className="border border-slate-300 px-3 py-1.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-justify">
            Login details for the parent and student app are issued separately. Kindly keep the school informed of any change in address or contact number. We look forward to a fruitful association.
          </p>
          <div className="mt-16 flex justify-between font-sans text-[12px]">
            <p className="border-t border-slate-500 px-6 pt-1">Parent&apos;s acknowledgement</p>
            <p className="border-t border-slate-500 px-6 pt-1">Principal</p>
          </div>
        </div>
      )}
    </PrintPage>
  );
}
