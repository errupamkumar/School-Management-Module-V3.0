'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { BadgeCheck, GraduationCap, Loader2, ShieldAlert, ShieldX } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Result {
  valid: boolean;
  revoked: boolean;
  serialNo: string;
  certificate: string;
  recipientName: string;
  issuedOn: string;
  school: { name: string; city: string | null; state: string | null; logoUrl: string | null } | null;
}

/** Public page opened by scanning the QR code on a certificate. */
export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const [r, setR] = React.useState<Result | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  React.useEffect(() => {
    document.title = 'Certificate verification';
    fetch(`/api/public/verify/${encodeURIComponent(code)}`)
      .then((res) => res.json())
      .then((j) => (j.success ? setR(j.data) : setErr(j.error ?? 'Not found')))
      .catch(() => setErr('Could not reach the server. Please try again.'));
  }, [code]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-lg">
        {!r && !err && (
          <div className="flex justify-center p-16">
            <Loader2 className="size-6 animate-spin text-brand-600" />
          </div>
        )}
        {err && (
          <div className="p-8 text-center">
            <ShieldX className="mx-auto size-14 text-rose-600" />
            <p className="mt-3 text-lg font-bold">Certificate not found</p>
            <p className="mt-1 text-sm text-ink-soft">No certificate matches this verification code. It may have been mistyped, or the document may not be genuine.</p>
          </div>
        )}
        {r && (
          <>
            <div className={r.valid ? 'bg-emerald-600 p-6 text-center text-white' : 'bg-rose-600 p-6 text-center text-white'}>
              {r.valid ? <BadgeCheck className="mx-auto size-14" /> : <ShieldAlert className="mx-auto size-14" />}
              <p className="mt-2 text-xl font-bold">{r.valid ? 'Genuine certificate' : 'Certificate revoked'}</p>
              <p className="text-sm text-white/85">{r.valid ? 'This certificate was issued by the school below.' : 'The school has withdrawn this certificate. It is no longer valid.'}</p>
            </div>
            <div className="space-y-4 p-6">
              {r.school && (
                <div className="flex items-center gap-3">
                  {r.school.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.school.logoUrl} alt="" className="size-11 rounded-xl object-contain" />
                  ) : (
                    <span className="flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                      <GraduationCap className="size-6" />
                    </span>
                  )}
                  <div>
                    <p className="font-semibold">{r.school.name}</p>
                    <p className="text-xs text-ink-faint">{[r.school.city, r.school.state].filter(Boolean).join(', ')}</p>
                  </div>
                </div>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-xl bg-canvas p-4 text-sm">
                <dt className="text-ink-faint">Certificate</dt>
                <dd className="font-medium">{r.certificate}</dd>
                <dt className="text-ink-faint">Issued to</dt>
                <dd className="font-medium">{r.recipientName}</dd>
                <dt className="text-ink-faint">Serial no.</dt>
                <dd className="font-mono">{r.serialNo}</dd>
                <dt className="text-ink-faint">Issued on</dt>
                <dd>{formatDate(r.issuedOn, 'long')}</dd>
              </dl>
              <p className="text-center text-xs text-ink-faint">Check that these details match the printed document exactly.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
