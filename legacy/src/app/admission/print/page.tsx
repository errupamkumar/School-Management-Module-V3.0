'use client';

import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Printer,
  ArrowLeft,
  School,
  FileText
} from 'lucide-react';

export default function PrintAdmissionFormPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header (Hidden when printing) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <div>
            <Link
              href="/admission"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Admission Hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Printer size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Print Admission Form</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official school admission application form for offline walk-in applicants
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Printer size={15} />
            <span>Print Official Form</span>
          </button>
        </div>

        {/* Printable Form Sheet */}
        <div className="bg-white rounded-3xl border border-gray-300 p-8 sm:p-12 max-w-4xl mx-auto shadow-sm" id="printable-form">
          {/* Header */}
          <div className="text-center border-b-2 border-purple-900/40 pb-5">
            <h2 className="text-2xl font-black text-purple-900 tracking-tight uppercase">
              VIDYALAYA PUBLIC SCHOOL
            </h2>
            <p className="text-xs font-medium text-gray-600 mt-0.5">
              Affiliated to CBSE, New Delhi &bull; Affiliation No: UP-2024-1234
            </p>
            <p className="text-[11px] text-gray-500">123 Education Lane, Civil Lines, Kanpur, Uttar Pradesh - 208001</p>
            <div className="mt-3 inline-block px-5 py-1 rounded-full bg-purple-100 text-purple-950 text-xs font-black uppercase tracking-widest border border-purple-200">
              STUDENT ADMISSION APPLICATION FORM — SESSION 2025-26
            </div>
          </div>

          {/* Top Form Meta & Photo Box */}
          <div className="flex items-start justify-between gap-6 my-6 text-xs">
            <div className="space-y-2 flex-1">
              <p>Form Serial No: <strong className="font-mono underline">VPS/25/ADM-__________</strong></p>
              <p>Class Seeking Admission To: <strong className="border-b border-gray-400 px-8 py-0.5 font-bold">____________________</strong></p>
              <p>Academic Session: <strong>2025-26</strong></p>
            </div>

            {/* Photo Box */}
            <div className="w-28 h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-center p-2 text-[10px] text-gray-400">
              <span>Affix Recent Passport Size Photograph</span>
            </div>
          </div>

          {/* Section A: Student Details */}
          <div className="space-y-4 text-xs">
            <h3 className="font-black text-purple-900 uppercase border-b border-gray-200 pb-1 text-sm">
              1. Student Personal Information
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">First Name (in Block Letters):</p>
                <div className="h-7 border-b border-gray-400 font-bold" />
              </div>
              <div>
                <p className="text-gray-500">Last Name / Surname:</p>
                <div className="h-7 border-b border-gray-400 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500">Date of Birth (DD/MM/YYYY):</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Gender:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Blood Group:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500">Religion:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Category (Gen / OBC / SC / ST):</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Aadhaar Card Number:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
            </div>
          </div>

          {/* Section B: Parent / Guardian Details */}
          <div className="space-y-4 text-xs mt-6">
            <h3 className="font-black text-purple-900 uppercase border-b border-gray-200 pb-1 text-sm">
              2. Parent / Guardian Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500">Father&apos;s Full Name:</p>
                <div className="h-7 border-b border-gray-400 font-bold" />
              </div>
              <div>
                <p className="text-gray-500">Mother&apos;s Full Name:</p>
                <div className="h-7 border-b border-gray-400 font-bold" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-gray-500">Father&apos;s Occupation:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Contact Mobile Number:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
              <div>
                <p className="text-gray-500">Annual Family Income:</p>
                <div className="h-7 border-b border-gray-400" />
              </div>
            </div>

            <div>
              <p className="text-gray-500">Permanent Residential Address:</p>
              <div className="h-7 border-b border-gray-400" />
            </div>
          </div>

          {/* Section C: Declaration */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-[11px] text-gray-600 space-y-2">
            <p className="font-bold text-gray-800">Parent / Guardian Declaration:</p>
            <p className="leading-relaxed">
              I hereby declare that all the information furnished above is true and correct to the best of my knowledge.
              I agree to abide by the rules, code of conduct, and fee regulations of Vidyalaya Public School.
            </p>

            <div className="grid grid-cols-2 gap-8 pt-10 text-center">
              <div>
                <div className="h-8 border-b border-gray-400" />
                <p className="mt-1 font-bold text-gray-700">Date & Place</p>
              </div>
              <div>
                <div className="h-8 border-b border-gray-400" />
                <p className="mt-1 font-bold text-gray-700">Signature of Parent / Guardian</p>
              </div>
            </div>
          </div>

          {/* Office Use Section */}
          <div className="mt-8 p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs">
            <p className="font-bold text-gray-900 uppercase tracking-wider text-[11px] mb-2">
              For Administrative & Office Use Only:
            </p>
            <div className="grid grid-cols-3 gap-4">
              <p>Admission No Granted: <strong className="font-mono">_________________</strong></p>
              <p>Section Assigned: <strong>_________________</strong></p>
              <p>Principal Signature: <strong>_________________</strong></p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
