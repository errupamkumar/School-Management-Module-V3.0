'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  PieChart,
  FileSpreadsheet,
  FileText,
  Printer,
  Download,
  Calendar,
  Users,
  CreditCard,
  GraduationCap,
  Briefcase,
  Award,
  ArrowUpRight,
  Building2,
  CheckCircle2
} from 'lucide-react';

interface ReportCardItem {
  id: string;
  category: 'STUDENT' | 'FINANCE' | 'STAFF' | 'EXAM';
  title: string;
  description: string;
  lastGenerated: string;
}

const reportsCatalog: ReportCardItem[] = [
  { id: 'r-1', category: 'STUDENT', title: 'Student Enrollment & Strength Register', description: 'Comprehensive student count by class, section, gender ratio, and caste categories.', lastGenerated: 'Today, 10:30 AM' },
  { id: 'r-2', category: 'STUDENT', title: 'Monthly Student Attendance Summary', description: 'Class-wise attendance percentages, chronic absenteeism list, and leave records.', lastGenerated: 'Yesterday' },
  { id: 'r-3', category: 'FINANCE', title: 'Fee Collection & Daily Cash Ledger', description: 'Mode-wise fee collection (Cash, UPI, Cheque), receipts log, and bank deposits.', lastGenerated: 'Today, 02:15 PM' },
  { id: 'r-4', category: 'FINANCE', title: 'Outstanding Fee Dues & Defaulters Audit', description: 'Student-wise pending fee heads, late fines, and age-wise due categorization.', lastGenerated: 'Today, 09:00 AM' },
  { id: 'r-5', category: 'FINANCE', title: 'Income vs Expense Financial Audit Sheet', description: 'Operating costs, maintenance, vendor bills, and monthly net profit/loss summary.', lastGenerated: 'Sep 20, 2026' },
  { id: 'r-6', category: 'STAFF', title: 'Faculty Attendance & Biometric Log', description: 'Teacher daily punches, late arrivals, approved leaves, and substitute duty sheet.', lastGenerated: 'Today, 08:30 AM' },
  { id: 'r-7', category: 'STAFF', title: 'Monthly Salary Disbursement Payroll', description: 'Basic pay, HRA, allowances, deductions (PF/ESI), and net salary bank transfer list.', lastGenerated: 'Sep 01, 2026' },
  { id: 'r-8', category: 'EXAM', title: 'Class-wise Examination Performance Analysis', description: 'Subject pass rates, top rankers, grade distribution, and failure analysis.', lastGenerated: 'Sep 18, 2026' },
];

export default function ReportsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const filteredReports = selectedCategory === 'ALL'
    ? reportsCatalog
    : reportsCatalog.filter((r) => r.category === selectedCategory);

  const handleExport = (title: string, format: 'PDF' | 'EXCEL') => {
    alert(`Generating ${format} report for: "${title}". Download starting...`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <PieChart size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Reports & Analytics Center</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Download and generate official academic, financial, attendance, and HR registers
            </p>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { key: 'ALL', label: 'All Reports (8)' },
            { key: 'STUDENT', label: 'Students & Enrollment' },
            { key: 'FINANCE', label: 'Fees & Accounting' },
            { key: 'STAFF', label: 'Staff & Payroll' },
            { key: 'EXAM', label: 'Exams & Results' },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setSelectedCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === cat.key
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-white hover:bg-gray-50 text-gray-600 border border-gray-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Reports Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredReports.map((rep) => (
            <div
              key={rep.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                    {rep.category}
                  </span>
                  <span className="text-[11px] text-gray-400">Generated: {rep.lastGenerated}</span>
                </div>

                <h3 className="text-base font-bold text-gray-900 leading-snug">{rep.title}</h3>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{rep.description}</p>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Ready for Export
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExport(rep.title, 'EXCEL')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                  >
                    <FileSpreadsheet size={13} />
                    <span>Excel</span>
                  </button>

                  <button
                    onClick={() => handleExport(rep.title, 'PDF')}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                  >
                    <FileText size={13} />
                    <span>PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
