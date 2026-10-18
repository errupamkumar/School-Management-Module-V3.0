'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  UserPlus,
  Upload,
  ClipboardList,
  HelpCircle,
  Printer,
  GraduationCap,
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

export default function AdmissionHubPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <UserPlus size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admission Management</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              New admissions, bulk import, online applications, leads CRM, and printable forms
            </p>
          </div>

          <Link
            href="/admission/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <UserPlus size={15} />
            <span>New Admission Entry</span>
          </Link>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Enrolled</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">1,100</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">+18 this month</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pending Requests</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">14</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Online applications</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Open Inquiries</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">32</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Parent inquiries in pipeline</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Conversion Rate</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">68.5%</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Inquiry to admission</p>
          </div>
        </div>

        {/* Navigation Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <Link
            href="/admission/new"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <UserPlus size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Single Student Admission
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Complete multi-tab admission form: Student details, guardian info, previous academic history, and fee group.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Open Form</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admission/bulk"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:bg-purple-600 group-hover:text-white transition-all">
                <Upload size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Bulk Student Import
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Upload hundreds of student and parent records at once via Excel or CSV with automatic validation and roll number assignment.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Import Excel</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admission/requests"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Online Admission Requests
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Review, approve, or reject digital applications submitted by parents through the public school portal.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>View Requests (14)</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admission/crm"
            className="group bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 rounded-3xl border-2 border-indigo-200 shadow-md hover:shadow-xl transition-all p-6 flex flex-col justify-between relative overflow-hidden"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider">
              Lead CRM
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mb-4 shadow-md shadow-indigo-200">
                <ClipboardList size={22} />
              </div>
              <h3 className="text-lg font-black text-gray-900 group-hover:text-indigo-600 transition-colors">
                Admission CRM Pipeline
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                6-stage lead Kanban board, atomic class seat counter, instant duplicate identity check, and 1-click SIS enrollment.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-indigo-100 flex items-center justify-between text-xs font-bold text-indigo-700">
              <span>Open Pipeline Board</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/apply"
            target="_blank"
            className="group bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50 rounded-3xl border border-emerald-200 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              Public Link
            </div>
            <div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <GraduationCap size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">
                Public Self-Application Portal
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Share public 5-step registration wizard with parents (/apply): local draft auto-save and instant PDF token download.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-emerald-700">
              <span>Launch /apply</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admission/inquiries"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4 group-hover:bg-amber-600 group-hover:text-white transition-all">
                <HelpCircle size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Inquiries & CRM
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Track parent inquiries, walk-ins, phone follow-ups, and scheduled campus tours with status tracking.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Manage Pipeline</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            href="/admission/print"
            className="group bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
          >
            <div>
              <div className="w-12 h-12 rounded-2xl bg-pink-50 text-pink-600 flex items-center justify-center mb-4 group-hover:bg-pink-600 group-hover:text-white transition-all">
                <Printer size={22} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                Print Admission Forms
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Generate official blank CBSE admission application forms for offline walk-in applicants with school seal.
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-purple-700">
              <span>Print Template</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
