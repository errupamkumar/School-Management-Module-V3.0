'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { PALETTES, type PaletteName } from '@/lib/theme';
import { PrintPage, PrintState, usePrintData } from '@/components/print';
import { QrCode } from '@/components/qr';

interface CardData {
  id: string;
  name: string;
  code: string;
  line1: string;
  dob: string | null;
  bloodGroup: string | null;
  photoUrl: string | null;
  guardian: string | null;
  phone: string | null;
  address: string | null;
  transport: string | null;
}
interface Payload {
  school: { name: string; logoUrl: string | null; address: string | null; city: string | null; phone: string | null; themeColor: string };
  academicYear: string;
  type: 'STUDENT' | 'EMPLOYEE';
  cards: CardData[];
}

function Sheet() {
  const params = useSearchParams();
  const { data: d, isLoading, error } = usePrintData<Payload>(`/api/id-cards?${params.toString()}`);
  const p = PALETTES[(d && d.school.themeColor in PALETTES ? d.school.themeColor : 'indigo') as PaletteName];
  return (
    <PrintPage title={d ? `ID cards (${d.cards.length})` : 'ID cards'}>
      <PrintState loading={isLoading} error={error?.message} />
      {d && !d.cards.length && <p className="p-10 text-center text-sm text-slate-500">No active records to print.</p>}
      {d && (
        <div className="grid grid-cols-3 justify-items-center gap-[4mm] [print-color-adjust:exact] [-webkit-print-color-adjust:exact]">
          {d.cards.map((c) => (
            <div key={c.id} className="flex h-[86mm] w-[54mm] break-inside-avoid flex-col overflow-hidden rounded-[3mm] border border-slate-300 bg-white text-[8px] leading-tight">
              <div className="flex items-center gap-1.5 px-2 py-1.5 text-white" style={{ background: `rgb(${p[700]})` }}>
                {d.school.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.school.logoUrl} alt="" className="size-6 rounded-full bg-white object-contain p-0.5" />
                ) : (
                  <GraduationCap className="size-5 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-bold uppercase">{d.school.name}</p>
                  <p className="truncate text-[7px] opacity-90">{[d.school.city, d.school.phone].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <p className="py-0.5 text-center text-[7px] font-semibold uppercase tracking-wider" style={{ background: `rgb(${p[100]})`, color: `rgb(${p[800]})` }}>
                {d.type === 'STUDENT' ? `Student identity card · ${d.academicYear}` : 'Staff identity card'}
              </p>
              <div className="flex flex-1 flex-col items-center px-2 pt-2">
                {c.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.photoUrl} alt="" className="h-[24mm] w-[19mm] rounded border-2 object-cover" style={{ borderColor: `rgb(${p[600]})` }} />
                ) : (
                  <span className="flex h-[24mm] w-[19mm] items-center justify-center rounded border-2 border-dashed border-slate-300 text-[7px] text-slate-400">Photo</span>
                )}
                <p className="mt-1.5 text-center text-[11px] font-bold">{c.name}</p>
                <p className="text-center text-[8px] font-medium" style={{ color: `rgb(${p[700]})` }}>
                  {c.line1}
                </p>
                <table className="mt-1.5 w-full">
                  <tbody>
                    {[
                      [d.type === 'STUDENT' ? 'Adm. no.' : 'Emp. code', c.code],
                      ['DOB', c.dob ? formatDate(c.dob) : null],
                      ['Blood', c.bloodGroup],
                      [d.type === 'STUDENT' ? 'Father' : null, c.guardian],
                      ['Phone', c.phone],
                      [c.transport ? 'Bus' : null, c.transport],
                    ]
                      .filter(([k, v]) => k && v)
                      .map(([k, v]) => (
                        <tr key={k}>
                          <td className="w-[13mm] py-[1px] align-top text-slate-500">{k}</td>
                          <td className="py-[1px] font-medium">{v}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-end justify-between px-2 pb-1.5">
                <QrCode value={c.code} size={44} />
                <p className="border-t border-slate-400 px-1 pt-0.5 text-[7px] text-slate-500">Principal</p>
              </div>
              <div className="h-1.5" style={{ background: `rgb(${p[700]})` }} />
            </div>
          ))}
        </div>
      )}
    </PrintPage>
  );
}

export default function IdCardsPrint() {
  return (
    <Suspense>
      <Sheet />
    </Suspense>
  );
}
