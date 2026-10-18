'use client';

import * as React from 'react';

interface Payload {
  school: string;
  code: string;
  credentials: Array<{ name: string; role: string; username: string; password: string }>;
}

/** Printable login slips. Data comes from sessionStorage and never leaves the browser. */
export default function CredentialSlips() {
  const [data, setData] = React.useState<Payload | null>(null);
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('vidyalaya-print-credentials');
      if (raw) {
        setData(JSON.parse(raw));
        sessionStorage.removeItem('vidyalaya-print-credentials');
        setTimeout(() => window.print(), 400);
      }
    } catch {
      // storage unavailable
    }
  }, []);
  if (!data) return <p className="p-10 text-center text-sm">Nothing to print. Open this from the credentials dialog.</p>;
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-2 gap-4 bg-white p-6 text-black">
      {data.credentials.map((c) => (
        <div key={c.username} className="break-inside-avoid rounded-lg border-2 border-dashed border-slate-400 p-4 text-sm">
          <p className="font-bold">{data.school}</p>
          <p className="mb-3 text-xs text-slate-600">Login slip · keep this private</p>
          <p>
            <span className="text-slate-500">Name:</span> <b>{c.name}</b> ({c.role.toLowerCase()})
          </p>
          <p>
            <span className="text-slate-500">School code:</span> <b className="font-mono">{data.code}</b>
          </p>
          <p>
            <span className="text-slate-500">Username:</span> <b className="font-mono">{c.username}</b>
          </p>
          <p>
            <span className="text-slate-500">Temporary password:</span> <b className="font-mono">{c.password}</b>
          </p>
          <p className="mt-3 text-[11px] text-slate-600">Sign in at {typeof window !== 'undefined' ? window.location.origin : ''}/login. You will be asked to set a new password.</p>
        </div>
      ))}
    </div>
  );
}
