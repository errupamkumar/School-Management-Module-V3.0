'use client';

import { useState } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import {
  BarChart2,
  Printer,
  Download,
  Calendar,
  IndianRupee,
  Receipt,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const monthlyCollectionData = [
  { month: 'Apr', collected: 245000, target: 300000 },
  { month: 'May', collected: 280000, target: 300000 },
  { month: 'Jun', collected: 195000, target: 300000 },
  { month: 'Jul', collected: 310000, target: 300000 },
  { month: 'Aug', collected: 290000, target: 300000 },
  { month: 'Sep', collected: 325000, target: 350000 },
];

const headWiseData = [
  { name: 'Tuition Fee', amount: 1250000, color: '#3b82f6' },
  { name: 'Computer Fee', amount: 250000, color: '#8b5cf6' },
  { name: 'Exam Fee', amount: 320000, color: '#22c55e' },
  { name: 'Annual Charges', amount: 480000, color: '#f59e0b' },
  { name: 'Transport Fee', amount: 190000, color: '#ec4899' },
];

export default function FeeReportPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('2025-26');

  const totalCollected = headWiseData.reduce((acc, h) => acc + h.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BarChart2 size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fee Collection Report</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Revenue collection analytics, head-wise reconciliation, and realization rate
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <Printer size={14} />
              <span>Print Report</span>
            </button>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Realized Revenue</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{formatCurrency(totalCollected)}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Session 2025-26 Year-to-date</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Current Month</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">{formatCurrency(325000)}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">&uarr; 12% vs last month</p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Collection Efficiency</p>
            <h3 className="text-2xl font-black text-blue-600 mt-1">87.4%</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Realized vs billed invoices</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Monthly Trend */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-4">Monthly Collection vs Target</h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyCollectionData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                  <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="target" name="Target" fill="#e5e7eb" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Head-wise Breakdown */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <h3 className="text-base font-bold text-gray-900">Head-wise Realization</h3>
            <div className="relative h-44 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={headWiseData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={4} dataKey="amount">
                    {headWiseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-gray-100 text-xs">
              {headWiseData.map((h) => (
                <div key={h.name} className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-gray-600">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }} />
                    <span>{h.name}</span>
                  </span>
                  <span className="font-bold text-gray-900">{formatCurrency(h.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
