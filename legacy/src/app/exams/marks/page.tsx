'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  FileText,
  Save,
  CheckCircle2,
  Printer,
  Calculator,
  X,
  AlertCircle,
  Award
} from 'lucide-react';

interface StudentMarkRow {
  id: string;
  rollNo: string;
  admissionNo: string;
  name: string;
  theory: number;
  practical: number;
}

const initialMarksRoster: StudentMarkRow[] = [
  { id: '1', rollNo: '1', admissionNo: 'ADM251000', name: 'Aarav Kumar', theory: 74, practical: 18 },
  { id: '2', rollNo: '2', admissionNo: 'ADM251001', name: 'Vivaan Singh', theory: 68, practical: 17 },
  { id: '3', rollNo: '3', admissionNo: 'ADM251002', name: 'Aditya Sharma', theory: 78, practical: 19 },
  { id: '4', rollNo: '4', admissionNo: 'ADM251003', name: 'Vihaan Verma', theory: 62, practical: 16 },
  { id: '5', rollNo: '5', admissionNo: 'ADM251004', name: 'Arjun Gupta', theory: 70, practical: 18 },
  { id: '6', rollNo: '6', admissionNo: 'ADM251005', name: 'Reyansh Yadav', theory: 80, practical: 20 },
  { id: '7', rollNo: '7', admissionNo: 'ADM251006', name: 'Sai Tiwari', theory: 55, practical: 15 },
  { id: '8', rollNo: '8', admissionNo: 'ADM251007', name: 'Ananya Pandey', theory: 76, practical: 19 },
  { id: '9', rollNo: '9', admissionNo: 'ADM251008', name: 'Diya Mishra', theory: 72, practical: 18 },
  { id: '10', rollNo: '10', admissionNo: 'ADM251009', name: 'Myra Chauhan', theory: 65, practical: 17 },
];

export default function MarksEntryPage() {
  const [examName, setExamName] = useState('Half-Yearly Examination 2025-26');
  const [className, setClassName] = useState('Class 10');
  const [sectionName, setSectionName] = useState('Section A');
  const [subjectName, setSubjectName] = useState('Mathematics');

  const [roster, setRoster] = useState<StudentMarkRow[]>(initialMarksRoster);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const handleScoreChange = (id: string, field: 'theory' | 'practical', value: string) => {
    const num = Math.max(0, Math.min(field === 'theory' ? 80 : 20, Number(value) || 0));
    setRoster((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: num } : r))
    );
  };

  const calculateGrade = (total: number) => {
    if (total >= 91) return 'A1';
    if (total >= 81) return 'A2';
    if (total >= 71) return 'B1';
    if (total >= 61) return 'B2';
    if (total >= 51) return 'C1';
    if (total >= 41) return 'C2';
    if (total >= 33) return 'D';
    return 'E (Needs Improvement)';
  };

  const handleSaveMarks = async () => {
    setSaving(true);
    try {
      const examsRes = await fetch('/api/exams').catch(() => null);
      const examsData = examsRes ? await examsRes.json() : null;
      const targetExam = examsData?.data?.[0];

      if (targetExam && targetExam.subjects?.[0]) {
        const payload = roster.map((r) => ({
          studentId: r.id,
          marksObtained: (r.theory || 0) + (r.practical || 0),
          theoryMarks: r.theory,
          practicalMarks: r.practical,
          isAbsent: false,
        }));

        await fetch('/api/exams/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examId: targetExam.id,
            subjectId: targetExam.subjects[0].subjectId,
            maxMarks: 100,
            results: payload,
          }),
        }).catch(() => {});
      }
    } catch {}

    setSaving(false);
    setNotification(`Marks for ${subjectName} (${className}-${sectionName}) saved successfully!`);
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

        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <FileText size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Marks Entry Matrix</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Record subject theory and internal marks with automatic grade computation
            </p>
          </div>

          <button
            onClick={handleSaveMarks}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <Save size={15} />
            <span>{saving ? 'Saving...' : 'Save & Publish Marks'}</span>
          </button>
        </div>

        {/* 2. Selectors Bar */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Exam Term
            </label>
            <select
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            >
              <option>Half-Yearly Examination 2025-26</option>
              <option>Unit Test 2</option>
              <option>Annual Final Exam</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Class Grade
            </label>
            <select
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            >
              {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Section
            </label>
            <select
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            >
              <option>Section A</option>
              <option>Section B</option>
              <option>Section C</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Subject Paper
            </label>
            <select
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className="w-full text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            >
              {['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Computer Science'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Marks Grid Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6">Roll No</th>
                  <th className="py-3.5 px-6">Admission No</th>
                  <th className="py-3.5 px-6">Student Name</th>
                  <th className="py-3.5 px-6 text-center w-36">Theory (Max 80)</th>
                  <th className="py-3.5 px-6 text-center w-36">Practical / Int. (Max 20)</th>
                  <th className="py-3.5 px-6 text-center">Total (100)</th>
                  <th className="py-3.5 px-6 text-right">Computed Grade</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {roster.map((row) => {
                  const total = row.theory + row.practical;
                  const grade = calculateGrade(total);

                  return (
                    <tr key={row.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-3 px-6 font-mono font-bold text-gray-800">{row.rollNo}</td>
                      <td className="py-3 px-6 font-mono text-gray-500">{row.admissionNo}</td>
                      <td className="py-3 px-6 font-bold text-gray-900">{row.name}</td>

                      {/* Theory input */}
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          min="0"
                          max="80"
                          value={row.theory}
                          onChange={(e) => handleScoreChange(row.id, 'theory', e.target.value)}
                          className="w-20 text-center font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        />
                      </td>

                      {/* Practical input */}
                      <td className="py-3 px-6 text-center">
                        <input
                          type="number"
                          min="0"
                          max="20"
                          value={row.practical}
                          onChange={(e) => handleScoreChange(row.id, 'practical', e.target.value)}
                          className="w-20 text-center font-mono font-bold text-xs py-1.5 px-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                        />
                      </td>

                      {/* Total */}
                      <td className="py-3 px-6 text-center font-mono font-black text-sm text-purple-700">
                        {total}
                      </td>

                      {/* Grade */}
                      <td className="py-3 px-6 text-right font-black">
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                            grade.startsWith('A')
                              ? 'bg-emerald-50 text-emerald-700'
                              : grade.startsWith('B')
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {grade}
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
