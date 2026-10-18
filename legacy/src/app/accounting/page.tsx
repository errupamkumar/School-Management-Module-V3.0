'use client';
import { useState, useEffect } from 'react';
import {
  Calculator, Plus, ArrowUpRight, ArrowDownRight, Wallet, Building2,
  TrendingUp, TrendingDown, DollarSign, Download, Printer, Search,
  Filter, CheckCircle2, Calendar, FileText, X
} from 'lucide-react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useCampus } from '@/components/providers/CampusProvider';

interface Transaction {
  id: string;
  voucherNo: string;
  date: string;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  party: string;
  paymentMode: 'CASH' | 'BANK_TRANSFER' | 'UPI' | 'CHEQUE';
  amount: number;
  status: 'CLEARED' | 'PENDING';
  notes: string;
}

const initialTransactions: Transaction[] = [
  { id: '1', voucherNo: 'INC-2026-081', date: '2026-09-22', type: 'INCOME', category: 'Tuition Fees', party: 'Aarav Sharma (Class 10-A)', paymentMode: 'UPI', amount: 14500, status: 'CLEARED', notes: 'Term 2 Tuition + Lab fee' },
  { id: '2', voucherNo: 'EXP-2026-104', date: '2026-09-21', type: 'EXPENSE', category: 'Electricity & Utilities', party: 'State Electricity Board', paymentMode: 'BANK_TRANSFER', amount: 18450, status: 'CLEARED', notes: 'Campus main meter monthly bill' },
  { id: '3', voucherNo: 'INC-2026-082', date: '2026-09-21', type: 'INCOME', category: 'Admission Fees', party: 'Priya Verma (Class 9-B)', paymentMode: 'CASH', amount: 8000, status: 'CLEARED', notes: 'New admission registration token' },
  { id: '4', voucherNo: 'EXP-2026-105', date: '2026-09-20', type: 'EXPENSE', category: 'Stationery & Printing', party: 'Navneet Paper Mart', paymentMode: 'CHEQUE', amount: 6200, status: 'CLEARED', notes: 'Term exam question papers and answer sheets' },
  { id: '5', voucherNo: 'EXP-2026-106', date: '2026-09-19', type: 'EXPENSE', category: 'Faculty Honorarium', party: 'Guest Lecturer Dr. Sen', paymentMode: 'UPI', amount: 4500, status: 'CLEARED', notes: 'STEM seminar guest lecture' },
  { id: '6', voucherNo: 'INC-2026-083', date: '2026-09-19', type: 'INCOME', category: 'Transport Fees', party: 'Karan Patel (Class 8-A)', paymentMode: 'UPI', amount: 3200, status: 'CLEARED', notes: 'Route 4 quarterly transport fee' },
  { id: '7', voucherNo: 'EXP-2026-107', date: '2026-09-18', type: 'EXPENSE', category: 'Sports Equipment', party: 'Decathlon Institutional', paymentMode: 'BANK_TRANSFER', amount: 12800, status: 'PENDING', notes: 'Basketballs, cricket kits for sports day' },
  { id: '8', voucherNo: 'INC-2026-084', date: '2026-09-18', type: 'INCOME', category: 'Cafeteria Revenue', party: 'Campus Canteen Lease', paymentMode: 'BANK_TRANSFER', amount: 25000, status: 'CLEARED', notes: 'Monthly canteen vendor royalty' },
];

export default function AccountingPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<Transaction | null>(null);

  // Form state for new income voucher
  const [formData, setFormData] = useState({
    category: 'Tuition Fees',
    party: '',
    paymentMode: 'UPI' as Transaction['paymentMode'],
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  const totalIncome = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
  const netBalance = totalIncome - totalExpense;
  const cashInBank = Math.round(netBalance * 0.78);
  const cashInHand = Math.round(netBalance * 0.22);

  const filteredTransactions = transactions.filter(t => {
    if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        t.voucherNo.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.party.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.party || !formData.amount) return;

    const newTx: Transaction = {
      id: String(Date.now()),
      voucherNo: `INC-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      date: formData.date,
      type: 'INCOME',
      category: formData.category,
      party: formData.party,
      paymentMode: formData.paymentMode,
      amount: parseFloat(formData.amount),
      status: 'CLEARED',
      notes: formData.notes || 'Direct income deposit',
    };

    setTransactions([newTx, ...transactions]);
    setShowIncomeModal(false);
    setFormData({
      category: 'Tuition Fees',
      party: '',
      paymentMode: 'UPI',
      amount: '',
      notes: '',
      date: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Sub-Navigation for Accounting Module (SA-01) */}
        <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 overflow-x-auto">
          <Link
            href="/accounting"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
          >
            <Calculator size={14} />
            <span>Overview & Ledger</span>
          </Link>
          <Link
            href="/accounting/expenses"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <TrendingDown size={14} />
            <span>Expense Manager</span>
          </Link>
          <Link
            href="/salary"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <Wallet size={14} />
            <span>Staff Salary</span>
          </Link>
        </div>

        {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Calculator size={16} />
              <span>Financial Ledger & Cash Book • वित्तीय लेखांकन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              School Accounting & Audit
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Track double-entry cash flows, fee collections, operational expenses, bank transfers, and balance sheets in real-time.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowIncomeModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Record Income</span>
            </button>
            <Link
              href="/accounting/expenses"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs sm:text-sm backdrop-blur-sm border border-white/20 transition-all"
            >
              <TrendingDown size={16} />
              <span>Manage Expenses</span>
            </Link>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl text-xs backdrop-blur-sm border border-white/20 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Ledger</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Inflow</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ArrowUpRight size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{totalIncome.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-emerald-600">
            <TrendingUp size={14} />
            <span>+14.8% vs last month</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Outflow</span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{totalExpense.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-rose-500">
            <TrendingDown size={14} />
            <span>Operational & maintenance</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Operating Surplus</span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
              <Wallet size={20} />
            </div>
          </div>
          <p className="text-2xl font-black text-purple-900 mt-2">₹{netBalance.toLocaleString('en-IN')}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-purple-700">
            <CheckCircle2 size={14} />
            <span>Positive Cash Reserves</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bank vs Cash Ratio</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Building2 size={20} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <div className="flex justify-between text-xs font-bold text-gray-700">
              <span>HDFC A/c: ₹{cashInBank.toLocaleString('en-IN')}</span>
              <span>78%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden flex">
              <div className="bg-blue-600 h-full" style={{ width: '78%' }} />
              <div className="bg-emerald-500 h-full" style={{ width: '22%' }} />
            </div>
            <p className="text-[11px] text-gray-400">Cash in Locker: ₹{cashInHand.toLocaleString('en-IN')} (22%)</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setTypeFilter('ALL')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${typeFilter === 'ALL' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            All Ledger ({transactions.length})
          </button>
          <button
            onClick={() => setTypeFilter('INCOME')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${typeFilter === 'INCOME' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Inflow Only
          </button>
          <button
            onClick={() => setTypeFilter('EXPENSE')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${typeFilter === 'EXPENSE' ? 'bg-rose-500 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Outflow Only
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search voucher, party, category..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-900">General Cash Book & Audit Trail</h3>
            <p className="text-xs text-gray-500 mt-0.5">Real-time ledger of all approved credits and debits</p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-full">
            Showing {filteredTransactions.length} entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Voucher & Date</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Party / Ledger Head</th>
                <th className="px-5 py-3.5">Mode</th>
                <th className="px-5 py-3.5 text-right">Amount</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-purple-50/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{tx.voucherNo}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{tx.date}</div>
                  </td>
                  <td className="px-5 py-4">
                    {tx.type === 'INCOME' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <ArrowUpRight size={12} /> Inflow
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-100">
                        <ArrowDownRight size={12} /> Outflow
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-900">{tx.category}</td>
                  <td className="px-5 py-4">
                    <div className="text-gray-900">{tx.party}</div>
                    <div className="text-[11px] text-gray-400 italic truncate max-w-xs">{tx.notes}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-semibold">
                      {tx.paymentMode.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-sm">
                    {tx.type === 'INCOME' ? (
                      <span className="text-emerald-600">+₹{tx.amount.toLocaleString('en-IN')}</span>
                    ) : (
                      <span className="text-rose-600">-₹{tx.amount.toLocaleString('en-IN')}</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={11} /> {tx.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setSelectedVoucher(tx)}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      <FileText size={14} />
                      <span>Voucher</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Income Modal */}
      {showIncomeModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <ArrowUpRight size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Record Direct Cash / Bank Inflow</h3>
                  <p className="text-xs text-gray-400">Generate an authenticated credit voucher</p>
                </div>
              </div>
              <button
                onClick={() => setShowIncomeModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncome} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Income Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                >
                  <option value="Tuition Fees">Tuition Fees</option>
                  <option value="Admission Fees">Admission Fees</option>
                  <option value="Transport Fees">Transport Fees</option>
                  <option value="Cafeteria Revenue">Cafeteria / Canteen Lease</option>
                  <option value="Bookstore Sale">Bookstore & Uniform Sales</option>
                  <option value="Government Grant">Govt Grant / Scholarship</option>
                  <option value="Donation & CSR">Donation / Trust Grant</option>
                  <option value="Miscellaneous">Miscellaneous Receipts</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g. 15000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Payment Mode *</label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="UPI">UPI / QR Code</option>
                    <option value="CASH">Cash in Hand</option>
                    <option value="BANK_TRANSFER">NEFT / RTGS</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Received From (Student / Entity) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rohan Mehra or EduTrust Sponsor"
                  value={formData.party}
                  onChange={(e) => setFormData({ ...formData, party: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description / Narration</label>
                <textarea
                  rows={2}
                  placeholder="Additional audit notes or receipt cross-reference..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowIncomeModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
                >
                  Save Credit Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Voucher Print Modal */}
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
              <p className="text-[11px] text-gray-500">Affiliated to CBSE • Reg No: CBSE/2026/89201</p>
              <div className="inline-block mt-2 px-3 py-0.5 bg-purple-100 text-purple-800 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                Official {selectedVoucher.type === 'INCOME' ? 'Credit' : 'Debit'} Voucher
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
                <span className="text-gray-500">Category:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.category}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Party / Name:</span>
                <span className="font-bold text-gray-900">{selectedVoucher.party}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment Mode:</span>
                <span className="font-bold text-purple-700">{selectedVoucher.paymentMode}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-dashed border-gray-200">
                <span className="text-gray-700 font-bold">Total Amount:</span>
                <span className="text-base font-black text-gray-900">₹{selectedVoucher.amount.toLocaleString('en-IN')}</span>
              </div>
              <div className="pt-2 text-[11px] text-gray-500 italic bg-gray-50 p-2 rounded-xl">
                Narration: {selectedVoucher.notes}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 flex justify-between items-end text-[10px] text-gray-400">
              <div>
                <p className="font-bold text-gray-700">Accountant Sign</p>
                <p className="mt-6 border-t border-gray-300 pt-1 w-24">Authorized</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700">Principal Seal</p>
                <p className="mt-6 border-t border-gray-300 pt-1 w-24 ml-auto">Verified</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={15} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
