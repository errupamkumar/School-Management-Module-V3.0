'use client';
import { useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Wallet, CheckCircle2, Clock, AlertCircle, Printer, Download,
  Search, Filter, Plus, FileText, UserCheck, Calendar, DollarSign,
  ChevronDown, ArrowUpRight, X, Building2
} from 'lucide-react';

interface PayrollRecord {
  id: string;
  empId: string;
  name: string;
  role: 'TEACHER' | 'ADMIN' | 'ACCOUNTANT' | 'LIBRARIAN' | 'DRIVER';
  designation: string;
  department: string;
  basicSalary: number;
  allowance: number; // HRA + DA
  deduction: number; // EPF + TDS
  netSalary: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PROCESSING';
  paymentDate?: string;
  bankAccount: string;
  panNumber: string;
}

const initialPayroll: PayrollRecord[] = [
  { id: '1', empId: 'EMP-T101', name: 'Dr. Rajesh Khanna', role: 'TEACHER', designation: 'Senior PGT Physics', department: 'Science', basicSalary: 45000, allowance: 12000, deduction: 4800, netSalary: 52200, paymentStatus: 'PAID', paymentDate: '2026-09-05', bankAccount: 'HDFC •••• 4912', panNumber: 'ABCPK1290K' },
  { id: '2', empId: 'EMP-T102', name: 'Sunita Sharma', role: 'TEACHER', designation: 'TGT Mathematics', department: 'Mathematics', basicSalary: 38000, allowance: 9500, deduction: 3900, netSalary: 43600, paymentStatus: 'PAID', paymentDate: '2026-09-05', bankAccount: 'SBI •••• 8821', panNumber: 'BLTPS4412M' },
  { id: '3', empId: 'EMP-T103', name: 'Anil Deshmukh', role: 'TEACHER', designation: 'PGT English', department: 'Languages', basicSalary: 40000, allowance: 10000, deduction: 4200, netSalary: 45800, paymentStatus: 'PAID', paymentDate: '2026-09-05', bankAccount: 'ICICI •••• 3190', panNumber: 'CKMPD9902L' },
  { id: '4', empId: 'EMP-A201', name: 'Ramesh Gupta', role: 'ACCOUNTANT', designation: 'Chief Accountant', department: 'Finance', basicSalary: 35000, allowance: 8000, deduction: 3400, netSalary: 39600, paymentStatus: 'PAID', paymentDate: '2026-09-05', bankAccount: 'PNB •••• 1045', panNumber: 'ASDPG8819Q' },
  { id: '5', empId: 'EMP-L301', name: 'Meenakshi Iyer', role: 'LIBRARIAN', designation: 'Head Librarian', department: 'Library', basicSalary: 30000, allowance: 6500, deduction: 2900, netSalary: 33600, paymentStatus: 'PENDING', bankAccount: 'HDFC •••• 5521', panNumber: 'WQXMI7102R' },
  { id: '6', empId: 'EMP-D401', name: 'Mohan Singh', role: 'DRIVER', designation: 'Senior Bus Driver', department: 'Transport', basicSalary: 22000, allowance: 4000, deduction: 1800, netSalary: 24200, paymentStatus: 'PENDING', bankAccount: 'BOI •••• 7741', panNumber: 'ZOPMS2291E' },
  { id: '7', empId: 'EMP-T104', name: 'Pooja Verma', role: 'TEACHER', designation: 'PRT Primary Hindi', department: 'Primary Wing', basicSalary: 28000, allowance: 6000, deduction: 2600, netSalary: 31400, paymentStatus: 'PROCESSING', bankAccount: 'AXIS •••• 9923', panNumber: 'LKIPV6610T' },
];

export default function SalaryPage() {
  const [payroll, setPayroll] = useState<PayrollRecord[]>(initialPayroll);
  const [selectedMonth, setSelectedMonth] = useState('September 2026');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'ADMIN' | 'SUPPORT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayslip, setSelectedPayslip] = useState<PayrollRecord | null>(null);

  const totalPayroll = payroll.reduce((acc, p) => acc + p.netSalary, 0);
  const paidCount = payroll.filter(p => p.paymentStatus === 'PAID').length;
  const pendingAmount = payroll.filter(p => p.paymentStatus !== 'PAID').reduce((acc, p) => acc + p.netSalary, 0);

  const filteredPayroll = payroll.filter(p => {
    if (roleFilter === 'TEACHER' && p.role !== 'TEACHER') return false;
    if (roleFilter === 'ADMIN' && p.role !== 'ADMIN' && p.role !== 'ACCOUNTANT') return false;
    if (roleFilter === 'SUPPORT' && (p.role === 'TEACHER' || p.role === 'ADMIN' || p.role === 'ACCOUNTANT')) return false;
    if (statusFilter !== 'ALL' && p.paymentStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.empId.toLowerCase().includes(q) ||
        p.designation.toLowerCase().includes(q) ||
        p.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDisburseAll = () => {
    setPayroll(payroll.map(p => ({
      ...p,
      paymentStatus: 'PAID',
      paymentDate: new Date().toISOString().split('T')[0],
    })));
  };

  const handleMarkPaid = (id: string) => {
    setPayroll(payroll.map(p => p.id === id ? {
      ...p,
      paymentStatus: 'PAID',
      paymentDate: new Date().toISOString().split('T')[0],
    } : p));
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
            <Building2 size={14} />
            <span>Overview & Ledger</span>
          </Link>
          <Link
            href="/accounting/expenses"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-2 flex-shrink-0"
          >
            <DollarSign size={14} />
            <span>Expense Manager</span>
          </Link>
          <Link
            href="/salary"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white shadow-sm flex items-center gap-2 flex-shrink-0"
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
              <Wallet size={16} />
              <span>Payroll Management • कर्मचारी वेतन प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Staff Salaries & Payslips
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Monthly payroll computation, HRA/DA allowances, statutory EPF/TDS deductions, direct NEFT dispatches and automated salary slips.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDisburseAll}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <UserCheck size={16} />
              <span>Disburse All Pending</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl text-xs backdrop-blur-sm border border-white/20 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Monthly Payroll</span>
          <p className="text-2xl font-black text-gray-900 mt-2">₹{totalPayroll.toLocaleString('en-IN')}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">For {payroll.length} Employees ({selectedMonth})</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Disbursed Successfully</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{paidCount} / {payroll.length}</p>
          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mt-2">
            <div
              className="bg-emerald-500 h-full rounded-full"
              style={{ width: `${(paidCount / payroll.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Disbursement</span>
          <p className="text-2xl font-black text-amber-600 mt-2">₹{pendingAmount.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">{payroll.length - paidCount} pending approval</p>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Statutory Deductions (EPF)</span>
          <p className="text-2xl font-black text-purple-700 mt-2">
            ₹{payroll.reduce((acc, p) => acc + p.deduction, 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-gray-400 mt-1">EPFO & TDS challan ready</p>
        </div>
      </div>

      {/* Filters & Month Selector */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 w-full sm:w-auto">
          {(['ALL', 'TEACHER', 'ADMIN', 'SUPPORT'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                roleFilter === role
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {role === 'ALL' ? 'All Staff' : role === 'TEACHER' ? 'Faculty & Teachers' : role === 'ADMIN' ? 'Admin & Accounts' : 'Support & Transport'}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-800 outline-none"
          >
            <option value="September 2026">September 2026</option>
            <option value="August 2026">August 2026</option>
            <option value="July 2026">July 2026</option>
          </select>

          <div className="relative flex-1 sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff..."
              className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:bg-white focus:border-purple-400"
            />
          </div>
        </div>
      </div>

      {/* Payroll Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Emp ID & Name</th>
                <th className="px-5 py-3.5">Role / Dept</th>
                <th className="px-5 py-3.5">Basic Pay</th>
                <th className="px-5 py-3.5">Allowances</th>
                <th className="px-5 py-3.5">Deductions</th>
                <th className="px-5 py-3.5 font-bold">Net Salary</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredPayroll.map((p) => (
                <tr key={p.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-[11px] text-gray-400">{p.empId} • {p.bankAccount}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-gray-900">{p.designation}</div>
                    <div className="text-[11px] text-purple-600">{p.department}</div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-800">
                    ₹{p.basicSalary.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-emerald-600 font-semibold">
                    +₹{p.allowance.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-rose-500 font-semibold">
                    -₹{p.deduction.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 font-black text-gray-900 text-sm">
                    ₹{p.netSalary.toLocaleString('en-IN')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {p.paymentStatus === 'PAID' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={11} /> Paid
                      </span>
                    ) : p.paymentStatus === 'PROCESSING' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        <Clock size={11} /> Processing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {p.paymentStatus !== 'PAID' && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors"
                        >
                          Mark Paid
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedPayslip(p)}
                        className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-xl transition-colors inline-flex items-center gap-1 text-xs font-bold"
                      >
                        <FileText size={15} />
                        <span>Payslip</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-200 relative">
            <button
              onClick={() => setSelectedPayslip(null)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            {/* School Header */}
            <div className="text-center pb-4 border-b border-gray-200">
              <h2 className="text-lg font-black text-gray-900 uppercase">VIDYALAYA SENIOR SECONDARY SCHOOL</h2>
              <p className="text-xs text-gray-500">Sector 14, Institutional Area • CBSE Affiliation No: 2130894</p>
              <div className="inline-block mt-2 px-3 py-1 bg-purple-100 text-purple-800 font-extrabold text-xs rounded-full uppercase tracking-wider">
                Salary Slip for {selectedMonth}
              </div>
            </div>

            {/* Employee Details Grid */}
            <div className="grid grid-cols-2 gap-3 py-4 text-xs border-b border-gray-200 bg-gray-50/50 p-3 rounded-2xl my-3">
              <div><span className="text-gray-400">Employee ID:</span> <span className="font-bold text-gray-900">{selectedPayslip.empId}</span></div>
              <div><span className="text-gray-400">Name:</span> <span className="font-bold text-gray-900">{selectedPayslip.name}</span></div>
              <div><span className="text-gray-400">Designation:</span> <span className="font-bold text-gray-900">{selectedPayslip.designation}</span></div>
              <div><span className="text-gray-400">Department:</span> <span className="font-bold text-gray-900">{selectedPayslip.department}</span></div>
              <div><span className="text-gray-400">Bank Account:</span> <span className="font-bold text-gray-900">{selectedPayslip.bankAccount}</span></div>
              <div><span className="text-gray-400">PAN / UAN:</span> <span className="font-bold text-gray-900">{selectedPayslip.panNumber}</span></div>
            </div>

            {/* Earnings & Deductions Breakdown */}
            <div className="grid grid-cols-2 gap-4 py-2 text-xs">
              <div className="border border-gray-200 rounded-2xl p-3">
                <h4 className="font-bold text-emerald-800 uppercase pb-2 border-b border-gray-100">Earnings</h4>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between"><span>Basic Pay</span> <span className="font-bold">₹{selectedPayslip.basicSalary.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>HRA (House Rent)</span> <span className="font-bold">₹{Math.round(selectedPayslip.allowance * 0.6).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Dearness Allowance</span> <span className="font-bold">₹{Math.round(selectedPayslip.allowance * 0.4).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-emerald-700">
                    <span>Gross Earnings</span>
                    <span>₹{(selectedPayslip.basicSalary + selectedPayslip.allowance).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div className="border border-gray-200 rounded-2xl p-3">
                <h4 className="font-bold text-rose-800 uppercase pb-2 border-b border-gray-100">Deductions</h4>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between"><span>Provident Fund (EPF)</span> <span className="font-bold">₹{Math.round(selectedPayslip.deduction * 0.75).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span>Professional Tax / TDS</span> <span className="font-bold">₹{Math.round(selectedPayslip.deduction * 0.25).toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between pt-7 border-t font-bold text-rose-700">
                    <span>Total Deductions</span>
                    <span>₹{selectedPayslip.deduction.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Amount Highlight */}
            <div className="bg-purple-50 border border-purple-100 rounded-2xl p-3.5 my-3 flex justify-between items-center">
              <div>
                <p className="text-[11px] text-purple-700 font-bold uppercase">Net Disbursed Amount</p>
                <p className="text-xs text-purple-600 mt-0.5">Mode: Direct Bank Transfer (NEFT)</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-purple-900">₹{selectedPayslip.netSalary.toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-purple-600 font-semibold">Status: {selectedPayslip.paymentStatus}</p>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-4 border-t border-gray-200 flex justify-between items-end text-[10px] text-gray-400">
              <div>
                <p className="font-bold text-gray-700">Employee Signature</p>
                <p className="mt-6 border-t border-gray-300 pt-1 w-24">Received With Thanks</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-700">Authorized Signatory</p>
                <p className="mt-6 border-t border-gray-300 pt-1 w-28 ml-auto">Finance Officer / Principal</p>
              </div>
            </div>

            <div className="mt-5 flex gap-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={15} /> Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </DashboardLayout>
  );
}
