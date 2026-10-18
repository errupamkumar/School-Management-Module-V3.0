'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import {
  AlertTriangle,
  Search,
  Send,
  Printer,
  Receipt,
  Phone,
  GraduationCap,
  Calendar,
  CheckCircle2,
  X,
  Clock
} from 'lucide-react';

interface DefaulterItem {
  id: string;
  admissionNo: string;
  name: string;
  className: string;
  section: string;
  fatherName: string;
  fatherPhone: string;
  dueAmount: number;
  overdueDays: number;
  lastPaymentDate: string;
}

const initialDefaulters: DefaulterItem[] = [
  { id: 'def-1', admissionNo: 'ADM251004', name: 'Arjun Verma', className: 'Class 10', section: 'A', fatherName: 'Deepak Verma', fatherPhone: '9876543214', dueAmount: 7500, overdueDays: 45, lastPaymentDate: '2026-08-10' },
  { id: 'def-2', admissionNo: 'ADM251008', name: 'Diya Gupta', className: 'Class 10', section: 'B', fatherName: 'Sunita Gupta', fatherPhone: '9876543218', dueAmount: 5000, overdueDays: 30, lastPaymentDate: '2026-08-25' },
  { id: 'def-3', admissionNo: 'ADM251012', name: 'Pihu Tiwari', className: 'Class 9', section: 'A', fatherName: 'Rakesh Tiwari', fatherPhone: '9876543222', dueAmount: 4400, overdueDays: 20, lastPaymentDate: '2026-09-02' },
  { id: 'def-4', admissionNo: 'ADM251016', name: 'Kabir Pandey', className: 'Class 8', section: 'A', fatherName: 'Neha Pandey', fatherPhone: '9876543226', dueAmount: 3800, overdueDays: 15, lastPaymentDate: '2026-09-07' },
  { id: 'def-5', admissionNo: 'ADM251020', name: 'Tanvi Yadav', className: 'Class 7', section: 'A', fatherName: 'Amit Yadav', fatherPhone: '9876543230', dueAmount: 6200, overdueDays: 60, lastPaymentDate: '2026-07-20' },
  { id: 'def-6', admissionNo: 'ADM251024', name: 'Sakshi Mishra', className: 'Class 6', section: 'A', fatherName: 'Kavita Mishra', fatherPhone: '9876543234', dueAmount: 3200, overdueDays: 10, lastPaymentDate: '2026-09-12' },
];

export default function FeeDuesPage() {
  const [defaulters, setDefaulters] = useState<DefaulterItem[]>(initialDefaulters);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [notification, setNotification] = useState<{ type: 'success'; message: string } | null>(null);

  const showNotification = (message: string) => {
    setNotification({ type: 'success', message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSendReminder = (student: DefaulterItem) => {
    showNotification(`Fee reminder SMS dispatched to ${student.fatherName} (${student.fatherPhone})!`);
  };

  const handleBroadcastAll = () => {
    showNotification(`Bulk fee reminder broadcast sent to all ${defaulters.length} parents!`);
  };

  const filteredDefaulters = useMemo(() => {
    return defaulters.filter((d) => {
      const q = search.toLowerCase();
      const matchSearch =
        d.name.toLowerCase().includes(q) ||
        d.admissionNo.toLowerCase().includes(q) ||
        d.fatherPhone.includes(q);
      const matchClass = classFilter === 'ALL' || d.className === classFilter;
      return matchSearch && matchClass;
    });
  }, [defaulters, search, classFilter]);

  const totalOutstanding = defaulters.reduce((acc, d) => acc + d.dueAmount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast */}
        {notification && (
          <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fee Dues & Defaulters</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Track pending student balances and broadcast instant SMS/WhatsApp payment notices
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <Printer size={14} />
              <span>Print Defaulter List</span>
            </button>

            <button
              onClick={handleBroadcastAll}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Send size={15} />
              <span>Broadcast Reminders</span>
            </button>
          </div>
        </div>

        {/* 2. Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Outstanding Due</p>
            <h3 className="text-2xl font-black text-rose-600 mt-1">{formatCurrency(totalOutstanding)}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Across all enrolled grades</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Pending Defaulters</p>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{defaulters.length} Students</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">With pending invoices</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Overdue &gt; 30 Days</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">
              {defaulters.filter((d) => d.overdueDays >= 30).length} Students
            </h3>
            <p className="text-[11px] text-rose-600 font-semibold mt-0.5">Late fine applicable</p>
          </div>
        </div>

        {/* 3. Search Toolbar */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by student name, adm no, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
            >
              <option value="ALL">All Classes</option>
              {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6">Adm No</th>
                  <th className="py-3.5 px-6">Student Name</th>
                  <th className="py-3.5 px-6">Class & Sec</th>
                  <th className="py-3.5 px-6">Guardian Phone</th>
                  <th className="py-3.5 px-6">Overdue Duration</th>
                  <th className="py-3.5 px-6">Due Amount</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredDefaulters.map((d) => (
                  <tr key={d.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-gray-800">{d.admissionNo}</td>
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{d.name}</p>
                      <p className="text-[10px] text-gray-400">Father: {d.fatherName}</p>
                    </td>
                    <td className="py-4 px-6">
                      <span className="font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg text-[11px]">
                        {d.className}-{d.section}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-mono">{d.fatherPhone}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                          d.overdueDays >= 30
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        <Clock size={11} />
                        <span>{d.overdueDays} Days Late</span>
                      </span>
                    </td>
                    <td className="py-4 px-6 font-black text-rose-600 text-sm">
                      {formatCurrency(d.dueAmount)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendReminder(d)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs transition-colors"
                          title="Send SMS"
                        >
                          <Send size={12} />
                          <span>SMS</span>
                        </button>

                        <a
                          href={`https://wa.me/${d.fatherPhone.replace(/\D/g, '')}?text=Dear%20Parent,%20kindly%20clear%20the%20pending%20fee%20balance%20of%20INR%20${d.dueAmount}%20for%20${d.name}.%20-%20Vidyalaya`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                          title="WhatsApp"
                        >
                          <span>WhatsApp</span>
                        </a>

                        <Link
                          href={`/fees/collect`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 font-bold text-xs transition-colors"
                        >
                          <Receipt size={12} />
                          <span>Collect</span>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
