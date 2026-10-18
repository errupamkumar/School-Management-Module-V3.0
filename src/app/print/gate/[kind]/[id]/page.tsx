'use client';

import { useParams } from 'next/navigation';
import { formatDateTime } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';
import { QrCode } from '@/components/qr';

interface VisitorData {
  passNo: string;
  name: string;
  phone: string;
  purpose: string;
  whomToMeet: string | null;
  personCount: number;
  vehicleNo: string | null;
  inAt: string;
  outAt: string | null;
  school: SchoolHeader;
}
interface PassData {
  passNo: string;
  studentName: string;
  classLabel: string;
  student: { admissionNo: string };
  reason: string;
  pickedUpBy: string;
  relation: string;
  pickerPhone: string | null;
  status: string;
  issuedByName: string;
  issuedAt: string;
  outAt: string | null;
  school: SchoolHeader;
}

const PURPOSE: Record<string, string> = { PARENT: 'Parent visit', MEETING: 'Meeting staff', ADMISSION: 'Admission enquiry', INTERVIEW: 'Interview', DELIVERY: 'Delivery', VENDOR: 'Vendor', OTHER: 'Other' };

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <p className="flex justify-between gap-4 border-b border-dashed border-slate-300 py-1.5">
      <span className="text-slate-500">{k}</span>
      <b className="text-right">{v || '—'}</b>
    </p>
  );
}

export default function GatePrint() {
  const { kind, id } = useParams<{ kind: string; id: string }>();
  const visitor = kind === 'visitor';
  const { data, isLoading, error } = usePrintData<VisitorData & PassData>(kind === 'visitor' || kind === 'pass' ? `/api/gate/${visitor ? 'visitors' : 'passes'}/${id}` : null);
  if (!data) return <PrintState loading={isLoading} error={error?.message ?? (isLoading ? null : 'Not found')} />;
  return (
    <PrintPage title={`${visitor ? 'Visitor pass' : 'Gate pass'} ${data.passNo}`} autoPrint>
      <div className="mx-auto max-w-[120mm] rounded-xl border-2 border-slate-800 p-5">
        <Letterhead school={data.school} subtitle={<span className="rounded bg-slate-900 px-3 py-0.5 text-xs font-bold uppercase tracking-widest text-white">{visitor ? 'Visitor' : 'Student gate pass'}</span>} />
        <div className="mt-4 flex items-start gap-4">
          <div className="flex-1 text-[13px]">
            <p className="text-2xl font-black tracking-wider">{data.passNo}</p>
            {visitor ? (
              <>
                <Row k="Name" v={`${data.name}${data.personCount > 1 ? ` (+${data.personCount - 1})` : ''}`} />
                <Row k="Mobile" v={data.phone} />
                <Row k="Purpose" v={PURPOSE[data.purpose] ?? data.purpose} />
                <Row k="To meet" v={data.whomToMeet} />
                <Row k="Vehicle" v={data.vehicleNo} />
                <Row k="In" v={formatDateTime(data.inAt)} />
              </>
            ) : (
              <>
                <Row k="Student" v={`${data.studentName} (${data.student.admissionNo})`} />
                <Row k="Class" v={data.classLabel} />
                <Row k="Collected by" v={`${data.pickedUpBy} (${data.relation})`} />
                <Row k="Mobile" v={data.pickerPhone} />
                <Row k="Reason" v={data.reason} />
                <Row k="Issued" v={`${formatDateTime(data.issuedAt)} · ${data.issuedByName}`} />
              </>
            )}
          </div>
          <QrCode value={`${visitor ? 'VISITOR' : 'GATEPASS'}:${data.passNo}`} size={96} />
        </div>
        <p className="mt-4 text-center text-[11px] text-slate-500">{visitor ? 'Please wear this pass on campus and return it at the gate.' : 'Show this pass at the gate. Valid for today only.'}</p>
        {!visitor && (
          <div className="mt-8 grid grid-cols-2 gap-6 text-center text-[11px]">
            <p className="border-t border-slate-400 pt-1">Office signature</p>
            <p className="border-t border-slate-400 pt-1">Guard signature &amp; time out</p>
          </div>
        )}
      </div>
    </PrintPage>
  );
}
