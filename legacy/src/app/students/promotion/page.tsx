'use client';

import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ArrowUpCircle,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  GraduationCap,
  ArrowLeft,
  X
} from 'lucide-react';

interface PromotionCandidate {
  id: string;
  admissionNo: string;
  rollNo: string;
  name: string;
  attendanceRate: number;
  examScore: number;
  isEligible: boolean;
}

const initialCandidates: PromotionCandidate[] = [
  { id: 'p-1', admissionNo: 'ADM251000', rollNo: '1', name: 'Aarav Kumar', attendanceRate: 94, examScore: 88, isEligible: true },
  { id: 'p-2', admissionNo: 'ADM251001', rollNo: '2', name: 'Vivaan Singh', attendanceRate: 91, examScore: 82, isEligible: true },
  { id: 'p-3', admissionNo: 'ADM251002', rollNo: '3', name: 'Aditya Sharma', attendanceRate: 96, examScore: 90, isEligible: true },
  { id: 'p-4', admissionNo: 'ADM251003', rollNo: '4', name: 'Vihaan Verma', attendanceRate: 85, examScore: 75, isEligible: true },
  { id: 'p-5', admissionNo: 'ADM251004', rollNo: '5', name: 'Arjun Gupta', attendanceRate: 88, examScore: 78, isEligible: true },
  { id: 'p-6', admissionNo: 'ADM251005', rollNo: '6', name: 'Reyansh Yadav', attendanceRate: 92, examScore: 84, isEligible: true },
  { id: 'p-7', admissionNo: 'ADM251006', rollNo: '7', name: 'Sai Tiwari', attendanceRate: 68, examScore: 32, isEligible: false },
];

export default function StudentPromotionPage() {
  const [fromClass, setFromClass] = useState('Class 9');
  const [toClass, setToClass] = useState('Class 10');
  const [candidates, setCandidates] = useState<PromotionCandidate[]>(initialCandidates);
  const [selectedIds, setSelectedIds] = useState<string[]>(
    initialCandidates.filter((c) => c.isEligible).map((c) => c.id)
  );
  const [notification, setNotification] = useState<string | null>(null);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePromote = () => {
    setNotification(
      `Successfully promoted ${selectedIds.length} students from ${fromClass} to ${toClass} for Session 2026-27!`
    );
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast */}
        {notification && (
          <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                <ArrowUpCircle size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Student Promotion</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Annual grade progression, eligibility validation, and bulk class advancement
            </p>
          </div>

          <button
            onClick={handlePromote}
            disabled={selectedIds.length === 0}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <ArrowUpCircle size={15} />
            <span>Promote Selected Students ({selectedIds.length})</span>
          </button>
        </div>

        {/* Progression Selectors */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Current Class
              </label>
              <select
                value={fromClass}
                onChange={(e) => setFromClass(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              >
                {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 text-purple-600">
              <ArrowRight size={18} />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Promote To Class
              </label>
              <select
                value={toClass}
                onChange={(e) => setToClass(e.target.value)}
                className="text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              >
                {['Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Pass Threshold: <strong>33% Marks & 75% Attendance</strong></span>
          </div>
        </div>

        {/* Promotion Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6 w-12 text-center">Select</th>
                  <th className="py-3.5 px-6">Roll No</th>
                  <th className="py-3.5 px-6">Admission No</th>
                  <th className="py-3.5 px-6">Student Name</th>
                  <th className="py-3.5 px-6 text-center">Attendance %</th>
                  <th className="py-3.5 px-6 text-center">Exam Final %</th>
                  <th className="py-3.5 px-6 text-right">Promotion Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {candidates.map((cand) => {
                  const isChecked = selectedIds.includes(cand.id);

                  return (
                    <tr key={cand.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(cand.id)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>

                      <td className="py-4 px-6 font-mono font-bold">{cand.rollNo}</td>
                      <td className="py-4 px-6 font-mono text-gray-500">{cand.admissionNo}</td>
                      <td className="py-4 px-6 font-bold text-gray-900">{cand.name}</td>

                      <td className="py-4 px-6 text-center font-bold">
                        <span className={cand.attendanceRate >= 75 ? 'text-emerald-600' : 'text-rose-600'}>
                          {cand.attendanceRate}%
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center font-bold">
                        <span className={cand.examScore >= 33 ? 'text-emerald-600' : 'text-rose-600'}>
                          {cand.examScore}%
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            cand.isEligible
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {cand.isEligible ? 'Passed & Eligible' : 'Detained / Repeater'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
