'use client';

import { useParams } from 'next/navigation';
import { formatDate, formatINR } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Slip {
  slipNo: string;
  monthLabel: string;
  basic: number;
  allowances: number;
  bonus: number;
  deductions: number;
  net: number;
  gross: number;
  mode: string;
  referenceNo: string | null;
  paidAt: string;
  netInWords: string;
  employeeName: string;
  employee: { employeeCode: string; designation: string; department: string | null; joiningDate: string; panNo: string | null; uan: string | null; bankName: string | null; bankAccount: string | null; ifsc: string | null };
  attendance: { present: number; leave: number; absent: number };
  school: SchoolHeader;
}

export default function PayslipPrint() {
  const { id } = useParams<{ id: string }>();
  const { data: d, isLoading, error } = usePrintData<Slip>(`/api/payroll/slips/${id}`);
  return (
    <PrintPage title={d ? `Payslip ${d.slipNo}` : 'Payslip'}>
      <PrintState loading={isLoading} error={error?.message} />
      {d && (
        <div>
          <Letterhead school={d.school} subtitle={<span className="rounded border border-slate-800 px-3 py-0.5 text-xs font-bold uppercase tracking-wider">Salary slip · {d.monthLabel}</span>} />
          <table className="mt-4 w-full border-collapse text-[12px]">
            <tbody>
              {[
                ['Employee', d.employeeName, 'Employee code', d.employee.employeeCode],
                ['Designation', d.employee.designation, 'Department', d.employee.department ?? '—'],
                ['Date of joining', formatDate(d.employee.joiningDate), 'PAN', d.employee.panNo ?? '—'],
                ['Bank', `${d.employee.bankName ?? ''} ${d.employee.bankAccount ?? ''}`.trim() || '—', 'EPF UAN', d.employee.uan ?? '—'],
                ['Days present', String(d.attendance.present), 'Leave / absent', `${d.attendance.leave} / ${d.attendance.absent}`],
              ].map((r) => (
                <tr key={r[0]}>
                  <td className="w-1/6 border border-slate-300 bg-slate-50 px-2 py-1 font-semibold">{r[0]}</td>
                  <td className="w-1/3 border border-slate-300 px-2 py-1">{r[1]}</td>
                  <td className="w-1/6 border border-slate-300 bg-slate-50 px-2 py-1 font-semibold">{r[2]}</td>
                  <td className="w-1/3 border border-slate-300 px-2 py-1">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 grid grid-cols-2 gap-4 text-[12px]">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1 text-left">Earnings</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">₹</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1">Basic</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.basic).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1">Allowances (HRA/DA)</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.allowances).toFixed(2)}</td>
                </tr>
                <tr>
                  <td className="border border-slate-300 px-2 py-1">Bonus</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.bonus).toFixed(2)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-slate-300 px-2 py-1">Gross</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.gross).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-300 px-2 py-1 text-left">Deductions</th>
                  <th className="border border-slate-300 px-2 py-1 text-right">₹</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-300 px-2 py-1">PF / ESI / TDS / other</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.deductions).toFixed(2)}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-slate-300 px-2 py-1">Total deductions</td>
                  <td className="border border-slate-300 px-2 py-1 text-right">{Number(d.deductions).toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-4 rounded border-2 border-slate-800 px-4 py-3 text-[13px]">
            <p className="text-lg font-extrabold">Net pay: {formatINR(d.net)}</p>
            <p>{d.netInWords}</p>
            <p className="mt-1 text-[11px] text-slate-600">
              Paid by {d.mode.replace('_', ' ')} on {formatDate(d.paidAt)} {d.referenceNo ? `· Ref ${d.referenceNo}` : ''} · Slip {d.slipNo}
            </p>
          </div>
          <div className="mt-12 flex justify-between text-[11px]">
            <p className="border-t border-slate-500 px-6 pt-1">Employee signature</p>
            <p className="border-t border-slate-500 px-6 pt-1">Authorised signatory</p>
          </div>
          <p className="mt-6 text-center text-[10px] text-slate-500">This is a computer-generated payslip.</p>
        </div>
      )}
    </PrintPage>
  );
}
