'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { formatDate } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, RICH_TEXT, usePrintData, type SchoolHeader } from '@/components/print';
import { QrCode } from '@/components/qr';

interface Issued {
  serialNo: string;
  recipientType: 'STUDENT' | 'EMPLOYEE';
  recipientName: string;
  content: string;
  verifyCode: string;
  issuedOn: string;
  revokedAt: string | null;
  photoUrl: string | null;
  template: { name: string; kind: string };
  school: SchoolHeader;
}

export default function CertificatePrint() {
  const { id } = useParams<{ id: string }>();
  const { data: c, isLoading, error } = usePrintData<Issued>(`/api/certificates/issued/${id}`);
  const [origin, setOrigin] = React.useState('');
  React.useEffect(() => setOrigin(window.location.origin), []);
  const merit = c?.template.kind === 'MERIT';
  return (
    <PrintPage title={c ? `${c.template.name} ${c.serialNo}` : 'Certificate'} landscape={merit}>
      <PrintState loading={isLoading} error={error?.message} />
      {c && (
        <div className={`relative border-[6px] border-double border-slate-700 p-6 ${merit ? 'min-h-[180mm]' : 'min-h-[265mm]'} flex flex-col`}>
          {c.revokedAt && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <span className="-rotate-[25deg] rounded-lg border-8 border-rose-600/60 px-10 py-4 text-7xl font-black tracking-widest text-rose-600/60">REVOKED</span>
            </div>
          )}
          <Letterhead school={c.school} />
          <div className="mt-3 flex items-start justify-between text-[12px]">
            <p>
              Serial no. <b>{c.serialNo}</b>
            </p>
            <p>
              Date: <b>{formatDate(c.issuedOn, 'long')}</b>
            </p>
          </div>
          <div className="mt-6 flex items-start gap-6">
            <h1 className="flex-1 text-center font-serif text-3xl font-bold uppercase tracking-[0.2em] text-slate-800 underline decoration-2 underline-offset-8">{c.template.name}</h1>
            {c.photoUrl && !merit && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.photoUrl} alt="" className="h-[35mm] w-[28mm] border border-slate-400 object-cover" />
            )}
          </div>
          {/* Rendered on the server from a sanitized template with HTML-escaped values. */}
          <div className={`mt-8 flex-1 text-justify font-serif text-[15px] leading-8 ${merit ? 'text-center text-lg' : ''} ${RICH_TEXT}`} dangerouslySetInnerHTML={{ __html: c.content }} />
          <div className="mt-10 flex items-end justify-between gap-6 text-[11px]">
            <div className="flex items-end gap-3">
              {origin && <QrCode value={`${origin}/verify/${c.verifyCode}`} size={84} />}
              <div className="text-slate-600">
                <p className="font-semibold text-slate-800">Scan to verify</p>
                <p>{origin.replace(/^https?:\/\//, '')}/verify</p>
                <p className="font-mono">{c.verifyCode}</p>
              </div>
            </div>
            <div className="flex gap-6 whitespace-nowrap">
              {c.recipientType === 'STUDENT' && !merit && <p className="border-t border-slate-500 px-4 pt-1">Class teacher</p>}
              {!merit && <p className="border-t border-slate-500 px-4 pt-1">Checked by</p>}
              <p className="border-t border-slate-500 px-4 pt-1">Principal (seal &amp; signature)</p>
            </div>
          </div>
        </div>
      )}
    </PrintPage>
  );
}
