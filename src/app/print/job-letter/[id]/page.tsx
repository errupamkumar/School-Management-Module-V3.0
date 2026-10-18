'use client';

import { useParams } from 'next/navigation';
import { formatDate, formatINR } from '@/lib/utils';
import { Letterhead, PrintPage, PrintState, usePrintData, type SchoolHeader } from '@/components/print';

interface Employee {
  name: string;
  employeeCode: string;
  designation: string;
  department: string | null;
  joiningDate: string;
  address: string | null;
  /** null unless the viewer has payroll access */
  basicSalary: number | null;
  allowances: number | null;
}

export default function JobLetter() {
  const { id } = useParams<{ id: string }>();
  const e = usePrintData<Employee>(`/api/employees/${id}`);
  const school = usePrintData<SchoolHeader>('/api/school');
  const d = e.data;
  const gross = d && d.basicSalary != null ? Number(d.basicSalary) + Number(d.allowances ?? 0) : null;
  return (
    <PrintPage title={d ? `Appointment letter ${d.employeeCode}` : 'Appointment letter'}>
      <PrintState loading={e.isLoading || school.isLoading} error={e.error?.message ?? school.error?.message} />
      {d && school.data && (
        <div className="font-serif text-[14px] leading-7">
          <Letterhead school={school.data} />
          <div className="mt-4 flex justify-between font-sans text-[12px]">
            <p>Ref: HR/{d.employeeCode}</p>
            <p>Date: {formatDate(d.joiningDate, 'long')}</p>
          </div>
          <p className="mt-6">To,</p>
          <p>
            <b>{d.name}</b>
            <br />
            {d.address ?? ''}
          </p>
          <p className="mt-6 text-center font-sans text-base font-bold uppercase tracking-wider underline underline-offset-4">Letter of appointment</p>
          <p className="mt-4">Dear {d.name},</p>
          <p className="mt-2 text-justify">
            With reference to your application and the subsequent interview, we are pleased to appoint you as <b>{d.designation}</b>
            {d.department ? ` in the ${d.department} department` : ''} at {school.data.name}, with effect from <b>{formatDate(d.joiningDate, 'long')}</b>, on the following terms:
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-8 text-justify">
            <li>Your employee code is <b>{d.employeeCode}</b>.</li>
            {gross != null && (
              <li>
                Your monthly gross salary will be <b>{formatINR(gross)}</b> (basic {formatINR(Number(d.basicSalary))}
                {Number(d.allowances ?? 0) > 0 ? ` + allowances ${formatINR(Number(d.allowances))}` : ''}), subject to statutory deductions.
              </li>
            )}
            <li>You will be on probation for six months from the date of joining, which may be extended at the discretion of the management.</li>
            <li>You will abide by the rules, code of conduct and child-protection policy of the school as amended from time to time.</li>
            <li>Either party may terminate this appointment with one month&apos;s notice or salary in lieu thereof.</li>
          </ol>
          <p className="mt-4 text-justify">Please sign and return the duplicate copy of this letter as a token of your acceptance.</p>
          <div className="mt-16 flex justify-between font-sans text-[12px]">
            <p className="border-t border-slate-500 px-6 pt-1">Accepted — {d.name}</p>
            <p className="border-t border-slate-500 px-6 pt-1">Principal / Manager</p>
          </div>
        </div>
      )}
    </PrintPage>
  );
}
