'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ArrowRightLeft,
  Search,
  Printer,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  FileText
} from 'lucide-react';

export default function StudentTransferPage() {
  const [admissionNo, setAdmissionNo] = useState('ADM251004');
  const [reason, setReason] = useState('Parent job transfer to Lucknow');
  const [conduct, setConduct] = useState('Good & Exemplary');
  const [generated, setGenerated] = useState(false);

  const handleGenerateTC = (e: React.FormEvent) => {
    e.preventDefault();
    setGenerated(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <Link
              href="/students"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Students</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <ArrowRightLeft size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Student Transfer Certificate (TC)</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Issue official school leaving and migration certificates with clearance verification
            </p>
          </div>

          {generated && (
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-xs rounded-xl shadow-md"
            >
              <Printer size={15} />
              <span>Print Official TC</span>
            </button>
          )}
        </div>

        {/* Form Card (Hidden when printing) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm no-print space-y-4">
          <h3 className="text-base font-bold text-gray-900">Generate School Leaving Certificate</h3>

          <form onSubmit={handleGenerateTC} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Student Admission No *
              </label>
              <input
                type="text"
                required
                value={admissionNo}
                onChange={(e) => setAdmissionNo(e.target.value)}
                className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none uppercase"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                Reason for Leaving *
              </label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                General Conduct & Character
              </label>
              <input
                type="text"
                value={conduct}
                onChange={(e) => setConduct(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
              >
                Generate Certificate Preview
              </button>
            </div>
          </form>
        </div>

        {/* Printable Transfer Certificate Preview */}
        {generated && (
          <div className="bg-white rounded-3xl border border-gray-300 p-8 sm:p-12 max-w-4xl mx-auto shadow-sm">
            <div className="text-center border-b-2 border-purple-900/40 pb-5">
              <h2 className="text-2xl font-black text-purple-900 tracking-tight uppercase">
                VIDYALAYA PUBLIC SCHOOL
              </h2>
              <p className="text-xs font-medium text-gray-600 mt-0.5">
                Affiliated to CBSE, New Delhi &bull; Affiliation No: UP-2024-1234
              </p>
              <p className="text-[11px] text-gray-500">123 Education Lane, Civil Lines, Kanpur, Uttar Pradesh - 208001</p>
              <div className="mt-3 inline-block px-5 py-1 rounded-full bg-purple-100 text-purple-950 text-xs font-black uppercase tracking-widest border border-purple-200">
                TRANSFER / SCHOOL LEAVING CERTIFICATE
              </div>
            </div>

            <div className="my-6 space-y-3 text-xs leading-relaxed text-gray-800">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span>TC Certificate Serial No: <strong className="font-mono">VPS/TC/2026/089</strong></span>
                <span>Date of Issue: <strong>22-Sep-2026</strong></span>
              </div>

              <p>1. Name of Pupil: <strong>ARJUN VERMA</strong></p>
              <p>2. Father&apos;s / Guardian&apos;s Name: <strong>MR. DEEPAK VERMA</strong></p>
              <p>3. Mother&apos;s Name: <strong>MRS. SUNITA VERMA</strong></p>
              <p>4. Nationality: <strong>INDIAN</strong></p>
              <p>5. Date of Birth (in figures): <strong>14-05-2011</strong> (Fourteenth May Two Thousand Eleven)</p>
              <p>6. Class in which pupil last studied: <strong>CLASS 10 (Tenth)</strong></p>
              <p>7. School / Board Annual Examination last taken: <strong>PASSED WITH DISTINCTION</strong></p>
              <p>8. Whether qualified for promotion to higher class: <strong>YES, PROMOTED TO CLASS 11</strong></p>
              <p>9. Month up to which school dues paid: <strong>SEPTEMBER 2026 (NIL DUES)</strong></p>
              <p>10. Total No. of working school days: <strong>210 Days</strong> &bull; Present: <strong>194 Days</strong></p>
              <p>11. Reason for leaving the institution: <strong>{reason}</strong></p>
              <p>12. General Conduct: <strong>{conduct}</strong></p>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-12 text-center text-xs text-gray-600 mt-8 border-t border-gray-200">
              <div>
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Prepared By (Clerk)</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Verified By (Admin)</p>
              </div>
              <div>
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Principal Seal & Signature</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
