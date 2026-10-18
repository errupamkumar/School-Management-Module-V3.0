'use client';

import { useParams } from 'next/navigation';
import { formatDate, formatINR, periodLabel } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Challan {
  invoiceNo: string;
  period: string;
  title?: string | null;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  lateFee: number;
  previousBalance: number;
  total: number;
  paidAmount: number;
  balance: number;
  status: string;
  studentName: string;
  classLabel: string;
  student: { admissionNo: string; rollNo: string | null; guardian: { fatherName: string | null; primaryPhone: string } | null };
  items: Array<{ id: string; description: string; amount: number; discount: number }>;
  school: SchoolHeader;
  bankAccounts: Array<{ bankName: string; branch?: string; accountName?: string; accountNo: string; ifsc?: string; upiId?: string; instructions?: string }>;
  footer: string;
}

function Copy({ d, label }: { d: Challan; label: string }) {
  const bank = d.bankAccounts[0];
  return (
    <div className="break-inside-avoid">
      <Letterhead school={d.school} subtitle={<span className="rounded border border-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">Fee Challan · {label}</span>} />
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
        <p>
          <b>Invoice:</b> {d.invoiceNo}
        </p>
        <p className="text-right">
          <b>{d.title ? 'For' : 'Month'}:</b> {periodLabel(d.period, d.title)}
        </p>
        <p>
          <b>Student:</b> {d.studentName} ({d.student.admissionNo})
        </p>
        <p className="text-right">
          <b>Class:</b> {d.classLabel}
        </p>
        <p>
          <b>Issued:</b> {formatDate(d.issueDate)}
        </p>
        <p className="text-right font-bold">Due date: {formatDate(d.dueDate)}</p>
      </div>
      <table className="mt-3 w-full border-collapse text-[12px]">
        <tbody>
          {d.items.map((i) => (
            <tr key={i.id}>
              <td className="border border-slate-300 px-2 py-1">{i.description}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{Number(i.amount).toFixed(2)}</td>
            </tr>
          ))}
          {d.discount > 0 && (
            <tr>
              <td className="border border-slate-300 px-2 py-1">Less: discount / concession</td>
              <td className="border border-slate-300 px-2 py-1 text-right">−{Number(d.discount).toFixed(2)}</td>
            </tr>
          )}
          {d.lateFee > 0 && (
            <tr>
              <td className="border border-slate-300 px-2 py-1">Late fee</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.lateFee).toFixed(2)}</td>
            </tr>
          )}
          <tr className="font-bold">
            <td className="border border-slate-300 px-2 py-1">This month</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.total).toFixed(2)}</td>
          </tr>
          {d.paidAmount > 0 && (
            <tr>
              <td className="border border-slate-300 px-2 py-1">Already paid</td>
              <td className="border border-slate-300 px-2 py-1 text-right">−{Number(d.paidAmount).toFixed(2)}</td>
            </tr>
          )}
          {d.previousBalance > 0 && (
            <tr>
              <td className="border border-slate-300 px-2 py-1">Previous dues (separate invoices)</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.previousBalance).toFixed(2)}</td>
            </tr>
          )}
          <tr className="bg-slate-100 font-bold">
            <td className="border border-slate-300 px-2 py-1">Total payable</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{formatINR(d.balance + Number(d.previousBalance))}</td>
          </tr>
        </tbody>
      </table>
      {bank && (
        <p className="mt-2 text-[11px]">
          <b>Pay at bank:</b> {bank.bankName} {bank.branch ? `(${bank.branch})` : ''} · A/c {bank.accountNo} {bank.ifsc ? `· IFSC ${bank.ifsc}` : ''} {bank.upiId ? `· UPI ${bank.upiId}` : ''}
          {bank.instructions ? ` · ${bank.instructions}` : ''}
        </p>
      )}
      <div className="mt-6 flex items-end justify-between text-[11px] text-slate-500">
        <span>{d.footer}</span>
        <span className="border-t border-slate-500 px-6 pt-1 text-slate-700">{label === 'Bank copy' ? 'Bank stamp' : 'Cashier'}</span>
      </div>
    </div>
  );
}

export default function InvoicePrint() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = usePrintData<Challan>(`/api/fees/invoices/${id}`);
  return (
    <PrintPage title={data ? `Challan ${data.invoiceNo}` : 'Challan'}>
      <PrintState loading={isLoading} error={error?.message} />
      {data && (
        <div className="space-y-5">
          <Copy d={data} label="Parent copy" />
          <div className="border-t-2 border-dashed border-slate-400 pt-5">
            <Copy d={data} label="School copy" />
          </div>
          <div className="border-t-2 border-dashed border-slate-400 pt-5">
            <Copy d={data} label="Bank copy" />
          </div>
        </div>
      )}
    </PrintPage>
  );
}
