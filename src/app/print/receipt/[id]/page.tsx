'use client';

import { useParams } from 'next/navigation';
import { formatDate, formatDateTime, formatINR } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface ReceiptData {
  receiptNo: string;
  amount: number;
  mode: string;
  status: string;
  referenceNo: string | null;
  chequeNo: string | null;
  bankName: string | null;
  paidAt: string;
  collectedByName: string | null;
  remarks: string | null;
  cancelReason: string | null;
  studentName: string;
  classLabel: string;
  student: { admissionNo: string; rollNo: string | null; guardian: { fatherName: string | null; motherName: string | null; primaryPhone: string } | null };
  amountInWords: string;
  lines: Array<{ period: string; invoiceNo: string; amount: number; items: Array<{ description: string; amount: number; discount: number }> }>;
  balanceAfter: number;
  school: SchoolHeader;
  footer: string;
}

function Copy({ d, label }: { d: ReceiptData; label: string }) {
  return (
    <div className="relative">
      {d.status === 'CANCELLED' && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-6xl font-black uppercase tracking-widest text-rose-500/20 [transform:rotate(-20deg)]">Cancelled</div>}
      <Letterhead school={d.school} subtitle={<span className="rounded border border-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">Fee Receipt · {label}</span>} />
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
        <p>
          <b>Receipt No:</b> {d.receiptNo}
        </p>
        <p className="text-right">
          <b>Date:</b> {formatDateTime(d.paidAt)}
        </p>
        <p>
          <b>Student:</b> {d.studentName}
        </p>
        <p className="text-right">
          <b>Adm. No:</b> {d.student.admissionNo}
        </p>
        <p>
          <b>Class:</b> {d.classLabel}
          {d.student.rollNo ? ` · Roll ${d.student.rollNo}` : ''}
        </p>
        <p className="text-right">
          <b>Parent:</b> {d.student.guardian?.fatherName ?? d.student.guardian?.motherName ?? ''}
        </p>
      </div>
      <table className="mt-3 w-full border-collapse text-[12px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-300 px-2 py-1 text-left">Month / Invoice</th>
            <th className="border border-slate-300 px-2 py-1 text-left">Particulars</th>
            <th className="border border-slate-300 px-2 py-1 text-right">Amount paid (₹)</th>
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l) => (
            <tr key={l.invoiceNo}>
              <td className="border border-slate-300 px-2 py-1 align-top">
                {l.period}
                <br />
                <span className="text-[10px] text-slate-500">{l.invoiceNo}</span>
              </td>
              <td className="border border-slate-300 px-2 py-1 align-top text-[11px]">{l.items.map((i) => `${i.description} ${formatINR(i.amount - i.discount, true)}`).join(', ')}</td>
              <td className="border border-slate-300 px-2 py-1 text-right align-top">{Number(l.amount).toFixed(2)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            <td className="border border-slate-300 px-2 py-1" colSpan={2}>
              Total received
            </td>
            <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.amount).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[12px]">
        <b>In words:</b> {d.amountInWords}
      </p>
      <p className="text-[12px]">
        <b>Mode:</b> {d.mode.replace('_', ' ')} {d.referenceNo ? `· Ref ${d.referenceNo}` : ''} {d.chequeNo ? `· Cheque ${d.chequeNo} ${d.bankName ?? ''}` : ''}
      </p>
      <p className="text-[12px]">
        <b>Balance due after this payment:</b> {formatINR(d.balanceAfter)}
      </p>
      {d.status === 'CANCELLED' && <p className="text-[12px] font-bold text-rose-600">Cancelled: {d.cancelReason}</p>}
      <div className="mt-8 flex items-end justify-between text-[11px]">
        <p className="text-slate-500">
          {d.footer}
          <br />
          Collected by: {d.collectedByName ?? 'Online payment'} · Printed {formatDate(new Date())}
        </p>
        <p className="border-t border-slate-500 px-6 pt-1">Authorised signatory</p>
      </div>
    </div>
  );
}

export default function ReceiptPrint() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePrintData<ReceiptData>(`/api/fees/payments/${id}`);
  return (
    <PrintPage title={data ? `Receipt ${data.receiptNo}` : 'Receipt'}>
      <PrintState loading={isLoading} error={error?.message} />
      {data && (
        <div className="space-y-6">
          <Copy d={data} label="Parent copy" />
          <div className="border-t-2 border-dashed border-slate-400 pt-6">
            <Copy d={data} label="School copy" />
          </div>
        </div>
      )}
    </PrintPage>
  );
}
