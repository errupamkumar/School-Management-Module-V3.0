'use client';
import { useState, useEffect } from 'react';
import {
  TrendingDown, Plus, Search, Filter, Printer, Download,
  CheckCircle2, Clock, AlertCircle, Trash2, Calendar, FileText,
  DollarSign, X, Check, ArrowLeft, Tag
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';

interface ExpenseItem {
  id: string;
  voucherNo: string;
  title: string;
  category: string;
  amount: number;
  date: string;
  paidTo: string;
  paymentMode: string;
  approvedBy?: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  description?: string;
}

const initialExpenses: ExpenseItem[] = [
  { id: '1', voucherNo: 'VCH-9801', title: 'Monthly Electric Sub-Station Bill', category: 'Utilities', amount: 32450, date: '2026-09-20', paidTo: 'State Electricity Board', paymentMode: 'BANK_TRANSFER', approvedBy: 'Admin Principal', status: 'APPROVED', description: 'Main academic block and hostel line' },
  { id: '2', voucherNo: 'VCH-9802', title: 'High-speed Fiber Lease Line (Quarterly)', category: 'Utilities', amount: 14999, date: '2026-09-19', paidTo: 'Airtel Broadband Ltd', paymentMode: 'BANK_TRANSFER', approvedBy: 'Admin Principal', status: 'APPROVED', description: '500Mbps symmetrical school broadband' },
  { id: '3', voucherNo: 'VCH-9803', title: 'Annual Science Fair Robotics Kits', category: 'Laboratory', amount: 28500, date: '2026-09-18', paidTo: 'RoboTech Labs Delhi', paymentMode: 'CHEQUE', approvedBy: 'Finance Officer', status: 'APPROVED', description: 'Arduino kits, sensors and breadboards' },
  { id: '4', voucherNo: 'VCH-9804', title: 'Campus Water Filter RO Maintenance', category: 'Maintenance', amount: 6800, date: '2026-09-17', paidTo: 'Kent Commercial Service', paymentMode: 'UPI', status: 'PENDING', description: 'Quarterly candle replacement and sanitizer' },
  { id: '5', voucherNo: 'VCH-9805', title: 'Answer Sheet Bundles & CBSE Registers', category: 'Stationery', amount: 12400, date: '2026-09-15', paidTo: 'Modern Stationers', paymentMode: 'CASH', approvedBy: 'Vice Principal', status: 'APPROVED', description: 'Half yearly examination stationery stock' },
  { id: '6', voucherNo: 'VCH-9806', title: 'School Bus #04 Tyre Replacement', category: 'Transport', amount: 22000, date: '2026-09-14', paidTo: 'Apollo Tyres Service Hub', paymentMode: 'BANK_TRANSFER', status: 'PENDING', description: 'Front dual radial tyres for Bus UP16-AT-9021' },
  { id: '7', voucherNo: 'VCH-9807', title: 'Annual Sports Day Medals & Trophies', category: 'Events', amount: 18500, date: '2026-09-12', paidTo: 'Champion Sports Awards', paymentMode: 'UPI', approvedBy: 'Sports Director', status: 'APPROVED', description: 'Gold, Silver, Bronze medals and Best Athlete cup' },
];

const categories = ['All', 'Utilities', 'Maintenance', 'Laboratory', 'Stationery', 'Transport', 'Events', 'Salaries'];

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>(initialExpenses);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<ExpenseItem | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    category: 'Utilities',
    amount: '',
    paidTo: '',
    paymentMode: 'BANK_TRANSFER',
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  // Calculate KPIs
  const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
  const pendingAmount = expenses.filter(e => e.status === 'PENDING').reduce((sum, item) => sum + item.amount, 0);
  const approvedCount = expenses.filter(e => e.status === 'APPROVED').length;

  const filteredExpenses = expenses.filter(item => {
    if (selectedCategory !== 'All' && item.category !== selectedCategory) return false;
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.voucherNo.toLowerCase().includes(q) ||
        item.paidTo.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.amount || !formData.paidTo) return;

    const newExpense: ExpenseItem = {
      id: String(Date.now()),
      voucherNo: `VCH-${Math.floor(9800 + Math.random() * 200)}`,
      title: formData.title,
      category: formData.category,
      amount: parseFloat(formData.amount),
      date: formData.date,
      paidTo: formData.paidTo,
      paymentMode: formData.paymentMode,
      status: 'PENDING',
      description: formData.description,
    };

    setExpenses([newExpense, ...expenses]);
    setShowAddModal(false);
    setFormData({
      title: '',
      category: 'Utilities',
      amount: '',
      paidTo: '',
      paymentMode: 'BANK_TRANSFER',
      date: new Date().toISOString().split('T')[0],
      description: '',
    });
  };

  const handleApprove = (id: string) => {
    setExpenses(expenses.map(e => e.id === id ? { ...e, status: 'APPROVED', approvedBy: 'Super Admin' } : e));
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sub-Navigation for Accounting Module (SA-01) */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 overflow-x-auto">
          <Link
            href="/accounting"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <Tag size={14} />
            <span>Overview & Ledger</span>
          </Link>
          <Link
            href="/accounting/expenses"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
          >
            <TrendingDown size={14} />
            <span>Expense Manager</span>
          </Link>
          <Link
            href="/salary"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <DollarSign size={14} />
            <span>Staff Salary</span>
          </Link>
        </div>

        {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Link href="/accounting" className="hover:underline inline-flex items-center gap-1">
                <ArrowLeft size={14} /> Back to Accounting
              </Link>
              <span>• व्यय प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              School Expense Management
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Track vendor disbursements, departmental budget utilization, utility bills, and petty cash vouchers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Add Expense Voucher</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl text-xs backdrop-blur-sm border border-white/20 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Disbursed</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <TrendingDown size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{totalExpense.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">{approvedCount} approved vouchers cleared</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Approvals</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-600 mt-2">₹{pendingAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-500 mt-1">
            {expenses.filter(e => e.status === 'PENDING').length} vouchers awaiting principal sign
          </p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Budget Health</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">Within Limit</p>
          <p className="text-xs text-gray-500 mt-1">68% of monthly allocated budget spent</p>
        </div>
      </div>

      {/* Category Pills & Search */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-100 text-amber-800 border-amber-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Show Pending Only
            </button>
          </div>
        </div>

        <div className="relative w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description, vendor, voucher number..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Expense Vouchers Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Voucher & Date</th>
                <th className="px-5 py-3.5">Expense Details</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Paid To (Vendor)</th>
                <th className="px-5 py-3.5">Payment Mode</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredExpenses.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{item.voucherNo}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{item.date}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{item.title}</div>
                    <div className="text-[11px] text-gray-400 italic truncate max-w-xs">{item.description}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 text-xs font-bold">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{item.paidTo}</td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium">
                      {item.paymentMode.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-rose-600">
                    ₹{item.amount.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {item.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={12} /> Approved
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                        <Clock size={12} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {item.status === 'PENDING' && (
                        <button
                          onClick={() => handleApprove(item.id)}
                          title="Approve Voucher"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedVoucher(item)}
                        title="View & Print Voucher"
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors"
                      >
                        <FileText size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <TrendingDown size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Create Expense Voucher</h3>
                  <p className="text-xs text-gray-400">Record school expenditure with audit documentation</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Expense Title / Item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Science Lab Reagents & Test Tubes"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="Utilities">Utilities & Power</option>
                    <option value="Maintenance">Campus Maintenance</option>
                    <option value="Laboratory">Science & IT Lab</option>
                    <option value="Stationery">Stationery & Print</option>
                    <option value="Transport">Bus & Transport</option>
                    <option value="Events">Annual Events & Sports</option>
                    <option value="Salaries">Staff Salary Honorarium</option>
                    <option value="Other">Other Expenses</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 5400"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Paid To (Vendor/Person) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Scientific Supplies"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                    <option value="UPI">UPI / QR Payment</option>
                    <option value="CHEQUE">Cheque</option>
                    <option value="CASH">Cash (Petty Cash)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Expense Justification / Narration</label>
                <textarea
                  rows={2}
                  placeholder="Purpose, invoice number or approval notes..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Modal */}
      {selectedVoucher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-200 relative">
            <button
              onClick={() => setSelectedVoucher(null)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            <div className="text-center pb-4 border-b border-dashed border-gray-200">
              <div className="w-10 h-10 mx-auto rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-lg mb-2">
                V
              </div>
              <h3 className="font-extrabold text-gray-900 text-base">VIDYALAYA PUBLIC SCHOOL</h3>
              <p className="text-[11px] text-gray-500">Official Payment Debit Voucher</p>
              <div className="inline-block mt-2 px-3 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-extrabold uppercase">
                {selectedVoucher.status}
              </div>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Voucher No:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.voucherNo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Expense Title:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid To:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.paidTo}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Category:</span>
                <span className="font-bold text-purple-700">{selectedVoucher.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Mode:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.paymentMode}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-700 font-bold">Total Disbursed:</span>
                <span className="text-base font-black text-rose-600">₹{selectedVoucher.amount.toLocaleString('en-IN')}</span>
              </div>
              {selectedVoucher.description && (
                <div className="pt-2 text-[11px] text-gray-500 italic bg-gray-50 p-2 rounded-xl">
                  {selectedVoucher.description}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-200 flex justify-between items-end text-[10px] text-gray-400">
              <div>
                <p className="font-bold text-gray-700">Accountant</p>
                <p className="mt-5 border-t border-gray-300 pt-1 w-20">Prepared By</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700">Authorized Signatory</p>
                <p className="mt-5 border-t border-gray-300 pt-1 w-24 ml-auto">Approved</p>
              </div>
            </div>

            <div className="mt-5">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={15} /> Print Debit Voucher
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
