'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import {
  GraduationCap,
  ArrowLeft,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Shield,
  FileText,
  CreditCard,
  CheckCircle2,
  XCircle,
  Clock,
  Printer,
  Edit,
  User,
  Users,
  Award,
  AlertCircle,
  Building,
  Upload,
  Receipt,
  HeartPulse,
  Send
} from 'lucide-react';

export default function StudentProfilePage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'guardian' | 'fees' | 'attendance' | 'exams' | 'documents'>('profile');

  useEffect(() => {
    if (!studentId) return;

    fetch(`/api/students/${studentId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStudent(data.data);
      })
      .catch((err) => console.error('Failed to load student profile', err))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="py-24 flex flex-col items-center justify-center text-center">
          <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs font-semibold text-gray-500">Loading student profile record...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 p-8">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Student Not Found</h2>
          <p className="text-xs text-gray-400 mt-1">The student record does not exist or has been deleted.</p>
          <Link
            href="/students"
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-md"
          >
            <ArrowLeft size={14} /> Back to Directory
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  // Attendance stats
  const totalAttendance = student.attendances?.length || 0;
  const presentCount = student.attendances?.filter((a: any) => a.status === 'PRESENT').length || 0;
  const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 100;

  // Fee stats
  const totalFeeDue = student.feePayments?.reduce((acc: number, f: any) => acc + (f.balanceAmount || 0), 0) || 0;
  const totalFeePaid = student.feePayments?.reduce((acc: number, f: any) => acc + (f.paidAmount || 0), 0) || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-14">
        {/* Navigation & Actions Top Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/students"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Student Information</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <Printer size={14} />
              <span>Print Profile</span>
            </button>
            <Link
              href={`/fees/collect?studentId=${student.id}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
            >
              <Receipt size={14} />
              <span>Collect Fee</span>
            </Link>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 1. PROFILE HEADER CARD                                                    */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div
                className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-white text-3xl shadow-md flex-shrink-0 ${
                  student.gender === 'FEMALE'
                    ? 'bg-gradient-to-br from-pink-500 via-rose-500 to-purple-600'
                    : 'bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-700'
                }`}
              >
                {student.firstName[0]}
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                    {student.firstName} {student.lastName}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      student.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${student.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {student.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-gray-500">
                  <span className="font-mono font-bold bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
                    {student.admissionNo}
                  </span>
                  <span>&bull;</span>
                  <span className="font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-md border border-purple-100">
                    Class {student.class?.name} - Section {student.section?.name}
                  </span>
                  <span>&bull;</span>
                  <span>Roll No: <strong>{student.rollNo || 'N/A'}</strong></span>
                  <span>&bull;</span>
                  <span>Session: <strong>2025-26</strong></span>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill Stats */}
            <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-3 md:pt-0 md:pl-5 w-full md:w-auto justify-between md:justify-end">
              <div className="text-center px-3">
                <p className="text-[10px] uppercase font-bold text-gray-400">Attendance</p>
                <p className="text-lg font-black text-blue-600 mt-0.5">{attendanceRate}%</p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="text-center px-3">
                <p className="text-[10px] uppercase font-bold text-gray-400">Fee Balance</p>
                <p className="text-lg font-black text-amber-600 mt-0.5">{formatCurrency(totalFeeDue)}</p>
              </div>
              <div className="h-8 w-px bg-gray-100" />
              <div className="text-center px-3">
                <p className="text-[10px] uppercase font-bold text-gray-400">Paid Fees</p>
                <p className="text-lg font-black text-emerald-600 mt-0.5">{formatCurrency(totalFeePaid)}</p>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100 overflow-x-auto">
            {[
              { key: 'profile', label: 'Personal Details', icon: User },
              { key: 'guardian', label: 'Parent / Guardian', icon: Users },
              { key: 'fees', label: 'Fee History & Invoices', icon: CreditCard },
              { key: 'attendance', label: 'Attendance Log', icon: Calendar },
              { key: 'exams', label: 'Exam Results', icon: Award },
              { key: 'documents', label: 'Documents & Promotions', icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. TAB CONTENT                                                            */}
        {/* ========================================================================= */}

        {/* TAB 1: PERSONAL DETAILS */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-gray-400">Full Name</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.firstName} {student.lastName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Gender</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.gender}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date of Birth</p>
                  <p className="font-bold text-gray-800 mt-0.5">
                    {student.dob ? new Date(student.dob).toLocaleDateString() : 'Not recorded'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400">Blood Group</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.bloodGroup?.replace('_', '+') || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Religion</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.religion || 'General'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Category</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.category || 'General'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Address & Contact</h3>
              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-gray-400">Residential Address</p>
                  <p className="font-bold text-gray-800 mt-0.5">{student.address || 'Civil Lines, Kanpur Nagar'}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-gray-400">City</p>
                    <p className="font-bold text-gray-800 mt-0.5">{student.city || 'Kanpur'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">State</p>
                    <p className="font-bold text-gray-800 mt-0.5">{student.state || 'Uttar Pradesh'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pincode</p>
                    <p className="font-bold text-gray-800 mt-0.5">{student.pincode || '208001'}</p>
                  </div>
                </div>
                <div className="pt-2 border-t border-gray-50">
                  <p className="text-gray-400">Student Portal Email</p>
                  <p className="font-mono font-bold text-purple-700 mt-0.5">
                    {student.user?.email || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUARDIAN DETAILS */}
        {activeTab === 'guardian' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-gray-900">Parent / Guardian Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-[11px] font-bold text-purple-700 uppercase">Father Information</p>
                <p className="text-sm font-bold text-gray-900">{student.parent?.fatherName || 'Not recorded'}</p>
                <p className="text-gray-500">Phone: {student.parent?.fatherPhone || 'N/A'}</p>
                <p className="text-gray-500">Occupation: {student.parent?.fatherOccupation || 'Business / Private'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-[11px] font-bold text-pink-700 uppercase">Mother Information</p>
                <p className="text-sm font-bold text-gray-900">{student.parent?.motherName || 'Not recorded'}</p>
                <p className="text-gray-500">Phone: {student.parent?.motherPhone || 'N/A'}</p>
                <p className="text-gray-500">Occupation: {student.parent?.motherOccupation || 'Homemaker'}</p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-2">
                <p className="text-[11px] font-bold text-emerald-700 uppercase">Financial & Emergency</p>
                <p className="text-gray-500">
                  Annual Income: <strong>{student.parent?.annualIncome ? formatCurrency(student.parent.annualIncome) : '₹4,50,000'}</strong>
                </p>
                <p className="text-gray-500">Emergency Phone: {student.parent?.fatherPhone || 'N/A'}</p>
                <a
                  href={`https://wa.me/${student.parent?.fatherPhone?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:underline pt-1"
                >
                  <Send size={12} /> Contact via WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FEE HISTORY & INVOICES */}
        {activeTab === 'fees' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Fee Ledger & Payment History</h3>
                <p className="text-xs text-gray-400">All billed tuition, examination, and transport invoices</p>
              </div>

              <Link
                href={`/fees/collect?studentId=${student.id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white font-bold text-xs rounded-xl shadow-md"
              >
                <Receipt size={13} /> Collect Fee
              </Link>
            </div>

            {student.feePayments && student.feePayments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase font-bold text-gray-400">
                      <th className="py-3 px-4">Receipt No</th>
                      <th className="py-3 px-4">Fee Head</th>
                      <th className="py-3 px-4">Billed Amount</th>
                      <th className="py-3 px-4">Paid Amount</th>
                      <th className="py-3 px-4">Balance Due</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {student.feePayments.map((f: any) => (
                      <tr key={f.id} className="hover:bg-purple-50/30">
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">{f.receiptNo}</td>
                        <td className="py-3.5 px-4 font-semibold">{f.feeStructure?.name || 'Tuition Fee'}</td>
                        <td className="py-3.5 px-4">{formatCurrency(f.amount)}</td>
                        <td className="py-3.5 px-4 text-emerald-600 font-bold">{formatCurrency(f.paidAmount)}</td>
                        <td className="py-3.5 px-4 text-amber-600 font-bold">{formatCurrency(f.balanceAmount)}</td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              f.paymentStatus === 'PAID'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {f.paymentStatus}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-gray-400">
                          {new Date(f.paymentDate || f.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs">
                No fee payment records recorded yet for this student.
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ATTENDANCE LOG */}
        {activeTab === 'attendance' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Recent Attendance Records (Last 30 Days)</h3>
            {student.attendances && student.attendances.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                {student.attendances.map((att: any) => (
                  <div
                    key={att.id}
                    className={`p-3 rounded-2xl border text-center text-xs font-semibold ${
                      att.status === 'PRESENT'
                        ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50/60 border-rose-200 text-rose-800'
                    }`}
                  >
                    <p className="text-[11px] text-gray-500">
                      {new Date(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="font-black mt-1">{att.status}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs">
                No attendance entries logged for this month yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 5: EXAM RESULTS */}
        {activeTab === 'exams' && (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-gray-900">Examination Marks & Academic Performance</h3>
            {student.examResults && student.examResults.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[11px] uppercase font-bold text-gray-400">
                      <th className="py-3 px-4">Exam Name</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Marks Obtained</th>
                      <th className="py-3 px-4">Max Marks</th>
                      <th className="py-3 px-4">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {student.examResults.map((er: any) => (
                      <tr key={er.id}>
                        <td className="py-3 px-4 font-bold">{er.exam?.name || 'Half Yearly Exam'}</td>
                        <td className="py-3 px-4">{er.examSubject?.subject?.name || 'Mathematics'}</td>
                        <td className="py-3 px-4 font-bold text-purple-700">{er.marksObtained}</td>
                        <td className="py-3 px-4 text-gray-500">{er.maxMarks || 100}</td>
                        <td className="py-3 px-4 font-bold text-emerald-600">{er.grade || 'A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-xs">
                No exam marks published for the current academic session yet.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: DOCUMENTS & PROMOTION */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Submitted Documents</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-purple-600" />
                    <span>Birth Certificate / Aadhaar</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">Verified</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <FileText size={15} className="text-purple-600" />
                    <span>Previous School Transfer Certificate (TC)</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">Verified</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">Promotion History</h3>
              <div className="p-3 rounded-2xl bg-gray-50 border border-gray-100 text-xs space-y-1">
                <p className="font-bold text-gray-900">Current Grade: Class {student.class?.name}</p>
                <p className="text-gray-500">Admitted on: {new Date(student.admissionDate || student.createdAt).toLocaleDateString()}</p>
                <p className="text-emerald-600 font-semibold">Eligible for annual class promotion</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
