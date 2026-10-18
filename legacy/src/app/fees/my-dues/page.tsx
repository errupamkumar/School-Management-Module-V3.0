'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  IndianRupee,
  Receipt,
  CreditCard,
  QrCode,
  Shield,
  CheckCircle2,
  AlertTriangle,
  Download,
  Calendar,
  User,
  GraduationCap,
  Users,
  X,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function MyDuesFeePage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || 'STUDENT';
  const userName = session?.user?.name || (userRole === 'PARENT' ? 'Rajesh Sharma' : 'Aarav Sharma');

  // Student Profile (Locked to the authenticated user/ward - NO student search allowed)
  const studentInfo = {
    id: 'student-1',
    name: 'Aarav Sharma',
    class: 'Class 10-A',
    rollNo: '1',
    admissionNo: 'ADM2026100',
    house: 'Tagore House',
    parentName: 'Rajesh Sharma',
  };

  const [feeStatus, setFeeStatus] = useState<{
    isPaid: boolean;
    paidBy?: 'STUDENT' | 'PARENT' | 'ADMIN';
    paidByName?: string;
    paidDate?: string;
    receiptNo?: string;
    paymentMode?: string;
    amount: number;
    transactionId?: string;
  }>({
    isPaid: false,
    amount: 3000,
  });

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<any>(null);

  // Fetch real fee status from backend
  const fetchFeeStatus = async () => {
    try {
      const res = await fetch('/api/fees?studentId=student-1');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const term2 = data.data.find((p: any) => p.month === 'October' && p.paymentStatus === 'PAID');
        if (term2) {
          setFeeStatus({
            isPaid: true,
            paidBy: term2.payerType,
            paidByName: term2.payerName,
            paidDate: term2.paymentDate,
            receiptNo: term2.receiptNo,
            paymentMode: term2.paymentMode,
            amount: term2.paidAmount,
            transactionId: term2.transactionId,
          });
        }
      }
    } catch (e) {
      console.error('Error fetching student fee status:', e);
    }
  };

  useEffect(() => {
    fetchFeeStatus();
  }, []);

  // Handle Online Fee Payment
  const handlePayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const payerType = userRole === 'PARENT' ? 'PARENT' : 'STUDENT';
    const payerName = userRole === 'PARENT' ? `${userName} (Parent)` : `${userName} (Student)`;

    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: studentInfo.id,
          studentName: studentInfo.name,
          studentClass: studentInfo.class,
          admissionNo: studentInfo.admissionNo,
          amount: 3000,
          paidAmount: 3000,
          payerType,
          payerName,
          paymentMode,
          month: 'October',
          remarks: `Direct fee settlement by ${payerType} (${payerName}) via ${paymentMode}`,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 Fee Paid Successfully! Official Receipt #${data.data.receiptNo} generated.`);
        setFeeStatus({
          isPaid: true,
          paidBy: payerType,
          paidByName: payerName,
          paidDate: data.data.paymentDate,
          receiptNo: data.data.receiptNo,
          paymentMode,
          amount: 3000,
          transactionId: data.data.transactionId,
        });
        setIsPaymentModalOpen(false);
        setActiveReceiptModal(data.data);
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch {
      toast.error('Network error during fee payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-16">
        {/* ========================================================================= */}
        {/* 1. PERSONAL FEE PORTAL HERO BANNER (NO SEARCH BAR - LOCKED TO USER)       */}
        {/* ========================================================================= */}
        <div className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
          feeStatus.isPaid
            ? 'bg-gradient-to-r from-emerald-700 via-teal-700 to-cyan-800'
            : 'bg-gradient-to-r from-purple-800 via-indigo-800 to-blue-900'
        }`}>
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur text-xs font-bold text-white border border-white/10">
                <Shield size={14} className="text-emerald-300" />
                <span>
                  {userRole === 'PARENT' ? 'Parent Fee Desk • Child Account' : 'Student Personal Fee Desk'}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                {feeStatus.isPaid ? 'Term 2 School Fees Cleared ✓' : 'Term 2 Fee Request: ₹3,000.00'}
              </h1>
              <p className="text-xs sm:text-sm text-white/90 max-w-xl">
                {feeStatus.isPaid
                  ? `Payment confirmed. Receipt #${feeStatus.receiptNo || 'REC-2026-1004'} issued. Paid by ${feeStatus.paidByName || 'Student'}. Zero dues outstanding.`
                  : 'Invoice issued by Vidyalaya Accounts Bureau. Due Date: October 10, 2026. Settle securely via UPI, Card, or Net Banking.'}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {feeStatus.isPaid ? (
                <button
                  onClick={() => setActiveReceiptModal({
                    receiptNo: feeStatus.receiptNo || 'REC-2026-1004',
                    studentName: studentInfo.name,
                    studentClass: studentInfo.class,
                    admissionNo: studentInfo.admissionNo,
                    amount: feeStatus.amount || 3000,
                    paidAmount: feeStatus.amount || 3000,
                    paymentMode: feeStatus.paymentMode || 'UPI',
                    paymentDate: feeStatus.paidDate || 'Today',
                    payerType: feeStatus.paidBy || 'STUDENT',
                    payerName: feeStatus.paidByName || (userRole === 'PARENT' ? `${userName} (Parent)` : `${userName} (Student)`),
                    transactionId: feeStatus.transactionId || 'TXN-UPI-992381',
                    month: 'October',
                    academicYear: '2026-2027',
                    breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                  })}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-2xl shadow-lg transition active:scale-95"
                >
                  <Receipt size={16} />
                  <span>Download Official Receipt</span>
                </button>
              ) : (
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:scale-95"
                >
                  <CreditCard size={16} />
                  <span>Pay ₹3,000 Online Now</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STUDENT IDENTITY SUMMARY CARD (LOCKED - NO STUDENT SEARCH BAR)         */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-lg">
              {userRole === 'PARENT' ? <Users size={22} /> : <GraduationCap size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-gray-900">{studentInfo.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                  {studentInfo.class}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Admission No: <strong className="text-gray-700 font-mono">{studentInfo.admissionNo}</strong> &bull; Roll: 1 &bull; {studentInfo.house} &bull; Guardian: {studentInfo.parentName}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100">
            <p className="text-[10px] uppercase font-bold text-gray-400">Current Outstanding Dues</p>
            <p className={`text-xl font-black mt-0.5 ${feeStatus.isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
              {feeStatus.isPaid ? '₹0.00 (Zero Dues)' : '₹3,000.00 Due'}
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. ITEMIZED TERM 2 FEE SCHEDULE & BREAKDOWN                               */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Fee Breakdown Table */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <IndianRupee size={18} className="text-purple-600" />
                  <span>Official Term 2 Fee Demand & Itemized Particulars</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Academic Session 2026-2027 &bull; Second Quarter</p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                feeStatus.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {feeStatus.isPaid ? 'Status: Cleared' : 'Status: Payment Pending'}
              </span>
            </div>

            <div className="divide-y divide-gray-100 text-xs">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">Tuition & Faculty Instruction (Term 2)</p>
                  <p className="text-[11px] text-gray-500">Curriculum teaching, classroom materials & academic tests</p>
                </div>
                <span className="font-mono font-bold text-gray-800">₹2,000.00</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">Science & Computer Lab Maintenance</p>
                  <p className="text-[11px] text-gray-500">Physics, Chemistry, and Python Computer Lab consumables</p>
                </div>
                <span className="font-mono font-bold text-gray-800">₹500.00</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">Digital Smart Class & Interactive LMS Portal</p>
                  <p className="text-[11px] text-gray-500">Cloud assessments, question bank & exam prep booster</p>
                </div>
                <span className="font-mono font-bold text-gray-800">₹300.00</span>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-900">Sports & Annual Co-Curricular Fund</p>
                  <p className="text-[11px] text-gray-500">Equipment, health assessments & inter-house sports trials</p>
                </div>
                <span className="font-mono font-bold text-gray-800">₹200.00</span>
              </div>
              <div className="py-4 flex items-center justify-between bg-purple-50/60 px-4 rounded-2xl mt-2 font-black text-sm text-purple-950">
                <span>Total Term Net Amount</span>
                <span className="text-purple-700 font-mono text-base">₹3,000.00</span>
              </div>
            </div>

            {feeStatus.isPaid ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    Payment Registered in School ERP
                  </p>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    {feeStatus.paidBy === 'STUDENT'
                      ? 'Settled directly by Student via Student UPI QR. Synchronized with Parent Portal and Admin Accounts Desk.'
                      : 'Settled by Parent via Parent Portal. Synchronized with Student Portal and School Accounts.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-amber-950">School Fee Request Pending</p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Pay online to avoid any late fine. Official receipt is generated immediately.
                  </p>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(true)}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition self-start sm:self-auto"
                >
                  Pay ₹3,000 Online
                </button>
              </div>
            )}
          </div>

          {/* Right Col: Receipts & Compliance */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Receipt size={18} className="text-purple-600" />
                <span>My Official Receipts</span>
              </h3>

              <div className="space-y-3 text-xs">
                {/* Term 1 Receipt */}
                <div className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">Term 1 (Jul - Sep)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">PAID</span>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5">REC-2026-1001 &bull; ₹3,000</p>
                    <p className="text-[10px] text-purple-700 font-bold">Paid by Parent (Rajesh Sharma)</p>
                  </div>
                  <button
                    onClick={() => setActiveReceiptModal({
                      receiptNo: 'REC-2026-1001',
                      studentName: studentInfo.name,
                      studentClass: studentInfo.class,
                      admissionNo: studentInfo.admissionNo,
                      amount: 3000,
                      paidAmount: 3000,
                      paymentMode: 'UPI',
                      paymentDate: 'Sep 10, 2026, 11:30 AM',
                      payerType: 'PARENT',
                      payerName: 'Rajesh Sharma (Parent)',
                      transactionId: 'UPI-2026-987412',
                      month: 'September',
                      academicYear: '2026-2027',
                      breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                    })}
                    className="p-2 text-purple-600 hover:bg-purple-50 rounded-xl transition"
                    title="View Receipt"
                  >
                    <FileDown size={18} />
                  </button>
                </div>

                {/* Term 2 Receipt if paid */}
                {feeStatus.isPaid && (
                  <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">Term 2 (Oct - Dec)</span>
                        <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded">PAID</span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5">{feeStatus.receiptNo || 'REC-2026-1004'} &bull; ₹3,000</p>
                      <p className="text-[10px] text-emerald-800 font-bold">Paid by {feeStatus.paidByName || 'Student'}</p>
                    </div>
                    <button
                      onClick={() => setActiveReceiptModal({
                        receiptNo: feeStatus.receiptNo || 'REC-2026-1004',
                        studentName: studentInfo.name,
                        studentClass: studentInfo.class,
                        admissionNo: studentInfo.admissionNo,
                        amount: feeStatus.amount || 3000,
                        paidAmount: feeStatus.amount || 3000,
                        paymentMode: feeStatus.paymentMode || 'UPI',
                        paymentDate: feeStatus.paidDate || 'Today',
                        payerType: feeStatus.paidBy || 'STUDENT',
                        payerName: feeStatus.paidByName || (userRole === 'PARENT' ? `${userName} (Parent)` : `${userName} (Student)`),
                        transactionId: feeStatus.transactionId || 'TXN-UPI-992381',
                        month: 'October',
                        academicYear: '2026-2027',
                        breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                      })}
                      className="p-2 text-emerald-700 hover:bg-emerald-100 rounded-xl transition"
                      title="View Receipt"
                    >
                      <FileDown size={18} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-3xl p-5 border border-gray-100 space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2 text-gray-900 font-bold">
                <Shield size={16} className="text-emerald-600" />
                <span>Verified School Ledger</span>
              </div>
              <p className="text-[11px]">
                Receipts generated here are digitally certified by Vidyalaya Senior Secondary School. Valid for CBSE audits and income tax rebate under Section 80C.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MODAL: DIRECT ONLINE FEE PAYMENT GATEWAY                                  */}
        {/* ========================================================================= */}
        {isPaymentModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">
                      {userRole === 'PARENT' ? 'Parent Fee Payment Gateway' : 'Student Online Fee Checkout'}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {studentInfo.name} &bull; {studentInfo.class} &bull; {studentInfo.admissionNo}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Order Amount Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Net Payable Amount</span>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">₹3,000.00</p>
                  <p className="text-[11px] text-gray-500">
                    Payer: {userRole === 'PARENT' ? `${userName} (Parent)` : `${userName} (Student)`}
                  </p>
                </div>
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-sm">
                  Term 2 Fee
                </span>
              </div>

              {/* Mode Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Choose Instant Payment Method:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI QR / Apps', icon: QrCode },
                    { id: 'CARD', label: 'Debit / ATM Card', icon: CreditCard },
                    { id: 'NETBANKING', label: 'Net Banking', icon: Shield },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMode(m.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                          paymentMode === m.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        <Icon size={18} />
                        <span className="text-[11px] text-center leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPI Tab */}
              {paymentMode === 'UPI' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
                  <p className="text-xs font-bold text-gray-800">Scan QR Code using any UPI App</p>

                  <div className="mx-auto w-40 h-40 bg-white p-3 rounded-2xl border border-gray-300 shadow-inner flex flex-col items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-gray-900 fill-current">
                      <rect x="5" y="5" width="25" height="25" fill="#1e1b4b" />
                      <rect x="10" y="10" width="15" height="15" fill="#fff" />
                      <rect x="13" y="13" width="9" height="9" fill="#1e1b4b" />
                      <rect x="70" y="5" width="25" height="25" fill="#1e1b4b" />
                      <rect x="75" y="10" width="15" height="15" fill="#fff" />
                      <rect x="78" y="13" width="9" height="9" fill="#1e1b4b" />
                      <rect x="5" y="70" width="25" height="25" fill="#1e1b4b" />
                      <rect x="10" y="75" width="15" height="15" fill="#fff" />
                      <rect x="13" y="78" width="9" height="9" fill="#1e1b4b" />
                      <rect x="35" y="35" width="30" height="30" fill="#7c3aed" rx="4" />
                      <text x="50" y="54" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">₹</text>
                      <rect x="70" y="70" width="20" height="20" fill="#1e1b4b" />
                    </svg>
                  </div>

                  <p className="font-mono text-xs font-bold text-gray-700">UPI ID: vidyalayaschool@icici</p>
                  <p className="text-[11px] text-gray-500">Google Pay &bull; PhonePe &bull; Paytm &bull; BHIM</p>
                </div>
              )}

              {/* Card Form */}
              {paymentMode === 'CARD' && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8921"
                      defaultValue="4532 9821 3412 8921"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="08/29"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        defaultValue="782"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Name on Card</label>
                    <input
                      type="text"
                      defaultValue={userName}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Net Banking */}
              {paymentMode === 'NETBANKING' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <label className="block text-xs font-bold text-gray-700">Select Bank:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank'].map(bank => (
                      <div key={bank} className="p-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 flex items-center gap-2 cursor-pointer hover:border-purple-400">
                        <input type="radio" name="nb_bank" defaultChecked={bank === 'State Bank of India'} />
                        <span className="truncate">{bank}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center gap-2 text-xs text-purple-900">
                <Shield size={16} className="text-purple-600 flex-shrink-0" />
                <span>
                  Immediate sync: Payment will be registered as <strong>Paid by {userRole === 'PARENT' ? 'Parent' : 'Student'} ({userName})</strong> and reflect directly on the school accounts and parent dashboard.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePayFee}
                  disabled={isProcessing}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Gateway...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Confirm & Pay ₹3,000</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: OFFICIAL CBSE SCHOOL FEE RECEIPT                                    */}
        {/* ========================================================================= */}
        {activeReceiptModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    🏫
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900">Vidyalaya Senior Secondary School</h3>
                    <p className="text-xs text-gray-500">Affiliation No: CBSE/AFF/2130098 &bull; New Delhi</p>
                    <p className="text-[10px] text-purple-700 font-bold uppercase tracking-wider mt-0.5">Official E-Fee Receipt</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveReceiptModal(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Receipt No</span>
                  <p className="font-mono font-black text-purple-700">{activeReceiptModal.receiptNo}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Payment Date</span>
                  <p className="font-bold text-gray-800">{activeReceiptModal.paymentDate}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Academic Year</span>
                  <p className="font-bold text-gray-800">{activeReceiptModal.academicYear || '2026-2027'}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Student Name</span>
                  <p className="font-bold text-gray-900">{activeReceiptModal.studentName}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Class & Roll</span>
                  <p className="font-bold text-gray-800">{activeReceiptModal.studentClass} &bull; Roll 1</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Admission No</span>
                  <p className="font-mono font-bold text-gray-800">{activeReceiptModal.admissionNo}</p>
                </div>
              </div>

              <div className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                activeReceiptModal.payerType === 'STUDENT'
                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div className="flex items-center gap-2">
                  <span className="font-bold">Remitted By:</span>
                  <span className="font-black px-2 py-0.5 rounded-lg bg-white shadow-xs">
                    {activeReceiptModal.payerType === 'STUDENT' ? '👤 Paid by Student' : '👨‍👩‍👦 Paid by Parent'}
                  </span>
                  <span className="font-medium text-gray-700">({activeReceiptModal.payerName})</span>
                </div>
                <span className="font-mono font-bold text-[11px] bg-white px-2 py-0.5 rounded border border-gray-200">
                  Mode: {activeReceiptModal.paymentMode}
                </span>
              </div>

              <div className="border border-gray-200 rounded-2xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                    <tr>
                      <th className="p-3">Fee Particulars</th>
                      <th className="p-3 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr>
                      <td className="p-3 font-medium text-gray-800">Term 2 Tuition & Faculty Instruction</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">₹2,000.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-gray-800">Science & Computer Lab Practical Fund</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">₹500.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-gray-800">Digital Smart Class & LMS Portal License</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">₹300.00</td>
                    </tr>
                    <tr>
                      <td className="p-3 font-medium text-gray-800">Sports & Annual Co-Curricular Assessment</td>
                      <td className="p-3 text-right font-mono font-bold text-gray-900">₹200.00</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200 font-black">
                    <tr>
                      <td className="p-3 text-gray-900">Total Net Amount Paid</td>
                      <td className="p-3 text-right text-purple-700 font-mono text-sm">₹3,000.00</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="pt-2 flex items-center justify-between text-xs text-gray-500 border-t">
                <div className="space-y-0.5">
                  <p className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Digitally Verified Payment
                  </p>
                  <p className="text-[10px]">Txn ID: {activeReceiptModal.transactionId || 'UPI-9823101'}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif italic font-bold text-gray-800">Accounts Officer</p>
                  <p className="text-[10px]">Vidyalaya School Accounts Bureau</p>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveReceiptModal(null)}
                  className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    toast.success('Official Fee Receipt sent to printer / PDF download');
                    window.print();
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition flex items-center gap-2"
                >
                  <Download size={14} />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
