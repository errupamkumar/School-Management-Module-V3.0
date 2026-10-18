'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Award,
  Printer,
  Search,
  School,
  GraduationCap,
  Calendar,
  CheckCircle2,
  FileText
} from 'lucide-react';

interface ReportCardStudent {
  id: string;
  admissionNo: string;
  rollNo: string;
  name: string;
  className: string;
  section: string;
  fatherName: string;
  subjects: { name: string; marks: number; maxMarks: number; grade: string }[];
}

const demoCards: ReportCardStudent[] = [
  {
    id: 'rc-1',
    admissionNo: 'ADM251000',
    rollNo: '1',
    name: 'Aarav Kumar',
    className: 'Class 10',
    section: 'A',
    fatherName: 'Ram Kumar',
    subjects: [
      { name: 'Mathematics', marks: 92, maxMarks: 100, grade: 'A1' },
      { name: 'Science', marks: 88, maxMarks: 100, grade: 'A2' },
      { name: 'English', marks: 85, maxMarks: 100, grade: 'A2' },
      { name: 'Hindi', marks: 90, maxMarks: 100, grade: 'A1' },
      { name: 'Social Science', marks: 87, maxMarks: 100, grade: 'A2' },
      { name: 'Computer Science', marks: 95, maxMarks: 100, grade: 'A1' },
    ],
  },
  {
    id: 'rc-2',
    admissionNo: 'ADM251001',
    rollNo: '2',
    name: 'Vivaan Singh',
    className: 'Class 10',
    section: 'A',
    fatherName: 'Shyam Singh',
    subjects: [
      { name: 'Mathematics', marks: 85, maxMarks: 100, grade: 'A2' },
      { name: 'Science', marks: 78, maxMarks: 100, grade: 'B1' },
      { name: 'English', marks: 82, maxMarks: 100, grade: 'A2' },
      { name: 'Hindi', marks: 80, maxMarks: 100, grade: 'B1' },
      { name: 'Social Science', marks: 75, maxMarks: 100, grade: 'B1' },
      { name: 'Computer Science', marks: 88, maxMarks: 100, grade: 'A2' },
    ],
  },
];

export default function ResultsPage() {
  const [selectedStudent, setSelectedStudent] = useState<ReportCardStudent>(demoCards[0]);
  const [search, setSearch] = useState('');

  const totalScored = selectedStudent.subjects.reduce((acc, s) => acc + s.marks, 0);
  const totalMax = selectedStudent.subjects.reduce((acc, s) => acc + s.maxMarks, 0);
  const percentage = ((totalScored / totalMax) * 100).toFixed(1);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Award size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Academic Report Cards</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Official student progress reports, grading distribution, and printable transcripts
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Printer size={15} />
            <span>Print Report Card</span>
          </button>
        </div>

        {/* Layout: Selector Left & Report Card Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Student Selector */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filter students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1.5 max-h-[420px] overflow-y-auto">
                {demoCards.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setSelectedStudent(st)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left border transition-all ${
                      selectedStudent.id === st.id
                        ? 'bg-purple-50 text-purple-900 border-purple-200 shadow-xs'
                        : 'bg-white hover:bg-gray-50 border-gray-100 text-gray-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-xs">{st.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">
                        {st.admissionNo} &bull; Roll: {st.rollNo}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-purple-700 bg-white px-2 py-0.5 rounded-md border border-purple-100">
                      {st.className}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Printable CBSE Report Card */}
          <div className="lg:col-span-8 bg-white rounded-3xl border border-gray-200 shadow-sm p-8" id="report-card">
            {/* School Header */}
            <div className="text-center border-b-2 border-purple-900/20 pb-5">
              <h2 className="text-2xl font-black text-purple-900 tracking-tight">
                VIDYALAYA PUBLIC SCHOOL
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Affiliated to CBSE, New Delhi &bull; Affiliation No: UP-2024-1234
              </p>
              <p className="text-[11px] text-gray-400">Civil Lines, Kanpur, Uttar Pradesh - 208001</p>
              <div className="mt-3 inline-block px-4 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-extrabold uppercase tracking-widest">
                PROGRESS REPORT CARD — SESSION 2025-26
              </div>
            </div>

            {/* Student Meta */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6 text-xs p-4 rounded-2xl bg-purple-50/50 border border-purple-100/60">
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Student Name</p>
                <p className="font-black text-gray-900 text-sm mt-0.5">{selectedStudent.name}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Admission No</p>
                <p className="font-mono font-bold text-gray-900 mt-0.5">{selectedStudent.admissionNo}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Class & Section</p>
                <p className="font-bold text-purple-700 mt-0.5">{selectedStudent.className} - {selectedStudent.section}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold text-gray-400">Roll No</p>
                <p className="font-mono font-bold text-gray-900 mt-0.5">{selectedStudent.rollNo}</p>
              </div>
            </div>

            {/* Subjects Table */}
            <table className="w-full text-left border-collapse text-xs border border-gray-200">
              <thead>
                <tr className="bg-purple-900 text-white font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Subject Name</th>
                  <th className="py-2.5 px-4 text-center">Max Marks</th>
                  <th className="py-2.5 px-4 text-center">Marks Scored</th>
                  <th className="py-2.5 px-4 text-right">Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {selectedStudent.subjects.map((sub, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-bold text-gray-900">{sub.name}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{sub.maxMarks}</td>
                    <td className="py-3 px-4 text-center font-bold text-purple-900">{sub.marks}</td>
                    <td className="py-3 px-4 text-right font-black text-emerald-600">{sub.grade}</td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-purple-50/60 font-bold">
                  <td className="py-3 px-4">Grand Total</td>
                  <td className="py-3 px-4 text-center text-gray-600">{totalMax}</td>
                  <td className="py-3 px-4 text-center text-purple-900 font-black">{totalScored}</td>
                  <td className="py-3 px-4 text-right font-black text-purple-900">{percentage}%</td>
                </tr>
              </tbody>
            </table>

            {/* Performance Summary Banner */}
            <div className="mt-5 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase font-bold text-emerald-700">Result Status</p>
                <p className="text-base font-black text-emerald-900 mt-0.5">
                  PASSED WITH DISTINCTION ({percentage}%)
                </p>
              </div>
              <div className="text-right">
                <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs">
                  Rank: 1st in Class
                </span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-3 gap-4 pt-12 text-center text-xs text-gray-500 mt-6 border-t border-gray-200">
              <div>
                <div className="h-10" />
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Class Teacher</p>
              </div>
              <div>
                <div className="h-10" />
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Exam Controller</p>
              </div>
              <div>
                <div className="h-10" />
                <p className="font-bold text-gray-800 border-t border-gray-300 pt-1">Principal Seal & Signature</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
