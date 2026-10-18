'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  Users,
  GraduationCap,
  CalendarCheck,
  Receipt,
  UserPlus,
  MessageSquare,
  Megaphone,
  BookOpen,
  Send,
  CloudRain,
  ShieldCheck,
  Calendar,
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  Building2,
  LayoutGrid,
  Cake,
  Download,
  Laptop,
  CheckCircle2,
  X,
  Clock,
  ArrowUpRight,
  Radio,
  Smile,
  AlertCircle
} from 'lucide-react';
import {
  AreaChart,
  Area,
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

// Data for Income vs Expense (Matches Reference Image months Apr - Sep)
const financialTrendData = [
  { month: 'Apr 2025', income: 245000, expense: 120000 },
  { month: 'May 2025', income: 280000, expense: 145000 },
  { month: 'Jun 2025', income: 195000, expense: 110000 },
  { month: 'Jul 2025', income: 310000, expense: 160000 },
  { month: 'Aug 2025', income: 290000, expense: 140000 },
  { month: 'Sep 2025', income: 325000, expense: 180000 },
];

// Data for Class-wise Strength
const classStrengthData = [
  { name: 'Nursery', students: 45 },
  { name: 'LKG', students: 52 },
  { name: 'UKG', students: 60 },
  { name: 'Class 1', students: 78 },
  { name: 'Class 2', students: 82 },
  { name: 'Class 3', students: 75 },
  { name: 'Class 4', students: 80 },
  { name: 'Class 5', students: 88 },
  { name: 'Class 6', students: 95 },
  { name: 'Class 7', students: 90 },
  { name: 'Class 8', students: 85 },
  { name: 'Class 9', students: 76 },
  { name: 'Class 10', students: 72 },
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStudents: 1100,
    totalBoys: 620,
    totalGirls: 480,
    totalTeachers: 52,
    totalStaff: 68,
    presentStudentsToday: 1024,
    presentStaffToday: 64,
    absentStudentsToday: 0,
    totalDues: 485000,
    incomeThisMonth: 325000,
    incomeToday: 28500,
    incomeThisYear: 2150000,
    expenseThisMonth: 180000,
    expenseToday: 12000,
    expenseThisYear: 1450000,
    profitThisMonth: 145000,
    newAdmissionsThisMonth: 18,
    feeCollectionRate: 82, // percent
  });

  const { lang, t } = useLanguage();
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Good afternoon,');
  const [viewMode, setViewMode] = useState<'modern' | 'classic'>('modern');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('vidyalaya_admin_view_mode') as 'modern' | 'classic';
      if (saved && (saved === 'modern' || saved === 'classic')) {
        setViewMode(saved);
      }
    }
  }, []);

  const handleToggleViewMode = () => {
    const next = viewMode === 'modern' ? 'classic' : 'modern';
    setViewMode(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('vidyalaya_admin_view_mode', next);
    }
  };

  // Quick SMS Modal State
  const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
  const [smsAudience, setSmsAudience] = useState('ALL_PARENTS');
  const [smsMessage, setSmsMessage] = useState('');
  const [smsStatus, setSmsStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  // Live Fee Collection & Payer Attribution State (Student vs Parent)
  const [feeTransactions, setFeeTransactions] = useState<any[]>([
    {
      id: 'fee-seed-1',
      receiptNo: 'REC-2026-1001',
      studentName: 'Aarav Sharma',
      studentClass: 'Class 10-A',
      admissionNo: 'ADM2026100',
      paidAmount: 3000,
      paymentMode: 'UPI',
      payerType: 'PARENT',
      payerName: 'Rajesh Sharma (Parent)',
      paymentDate: 'Sep 10, 2026, 11:30 AM',
    },
    {
      id: 'fee-seed-2',
      receiptNo: 'REC-2026-1002',
      studentName: 'Rohan Gupta',
      studentClass: 'Class 10-A',
      admissionNo: 'ADM2026102',
      paidAmount: 3000,
      paymentMode: 'ONLINE',
      payerType: 'STUDENT',
      payerName: 'Rohan Gupta (Student)',
      paymentDate: 'Sep 12, 2026, 03:15 PM',
    },
    {
      id: 'fee-seed-3',
      receiptNo: 'REC-2026-1003',
      studentName: 'Ananya Verma',
      studentClass: 'Class 10-B',
      admissionNo: 'ADM2026105',
      paidAmount: 3000,
      paymentMode: 'CASH',
      payerType: 'ADMIN',
      payerName: 'School Accounts Desk',
      paymentDate: 'Sep 15, 2026, 10:00 AM',
    },
  ]);
  const [feeSummary, setFeeSummary] = useState({
    totalCollected: 9000,
    studentPaidTotal: 3000,
    parentPaidTotal: 3000,
    adminPaidTotal: 3000,
    totalTransactions: 3,
    studentTransactionsCount: 1,
    parentTransactionsCount: 1,
  });
  const [feePayerFilter, setFeePayerFilter] = useState<'ALL' | 'STUDENT' | 'PARENT' | 'ADMIN'>('ALL');
  const [isRefreshingFees, setIsRefreshingFees] = useState(false);

  const fetchFeeTransactions = async () => {
    setIsRefreshingFees(true);
    try {
      const res = await fetch('/api/fees');
      const data = await res.json();
      if (data.success) {
        if (Array.isArray(data.data) && data.data.length > 0) {
          setFeeTransactions(data.data);
        }
        if (data.summary) {
          setFeeSummary(data.summary);
        }
      }
    } catch (e) {
      console.log('Error fetching fee transactions for admin:', e);
    } finally {
      setIsRefreshingFees(false);
    }
  };

  // Load Real Data from API & setup time
  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      if (hours < 12) setGreeting(t('goodMorning', 'Good morning,'));
      else if (hours < 17) setGreeting(t('goodAfternoon', 'Good afternoon,'));
      else setGreeting(t('goodEvening', 'Good evening,'));

      setCurrentTime(
        now.toLocaleTimeString(lang === 'hi' ? 'hi-IN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );

      setCurrentDate(
        now.toLocaleDateString(lang === 'hi' ? 'hi-IN' : 'en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);

    // Fetch dashboard stats from backend
    fetch('/api/dashboard/stats')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setStats((prev) => ({
            ...prev,
            totalStudents: data.data.totalStudents || prev.totalStudents,
            totalBoys: data.data.totalBoys || prev.totalBoys,
            totalGirls: data.data.totalGirls || prev.totalGirls,
            totalTeachers: data.data.totalTeachers || prev.totalTeachers,
            incomeThisMonth: data.data.incomeThisMonth || prev.incomeThisMonth,
            expenseThisMonth: data.data.expenseThisMonth || prev.expenseThisMonth,
            profitThisMonth: data.data.profitThisMonth || prev.profitThisMonth,
            totalDues: data.data.totalDues || prev.totalDues,
            presentStudentsToday: data.data.presentToday || prev.presentStudentsToday,
          }));
        }
      })
      .catch((err) => console.log('Dashboard API fallback to demo metrics:', err));

    fetchFeeTransactions();

    return () => clearInterval(timer);
  }, []);

  const handleSendSms = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smsMessage.trim()) return;
    setSmsStatus('sending');
    setTimeout(() => {
      setSmsStatus('success');
      setTimeout(() => {
        setIsSmsModalOpen(false);
        setSmsStatus('idle');
        setSmsMessage('');
      }, 1500);
    }, 800);
  };

  // Fee collection Donut percentages
  const feeDonutData = useMemo(() => {
    const collected = stats.incomeThisMonth;
    const remaining = stats.totalDues;
    return [
      { name: 'Collected', value: collected, color: '#22c55e' },
      { name: 'Remaining', value: remaining, color: '#f59e0b' },
    ];
  }, [stats.incomeThisMonth, stats.totalDues]);

  const studentAttendanceRate = Math.round(
    (stats.presentStudentsToday / (stats.totalStudents || 1)) * 100
  );
  const staffAttendanceRate = Math.round(
    (stats.presentStaffToday / (stats.totalStaff || 1)) * 100
  );

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-10">
        {viewMode === 'classic' ? (
          <div className="space-y-5 animate-in fade-in duration-200">
            {/* Classic Top Header Bar */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                    <Building2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">
                      {lang === 'hi' ? 'क्लासिक संस्थान डैशबोर्ड' : 'Classic Institutional ERP Console'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {lang === 'hi'
                        ? 'सत्र 2025-26 • उच्च-घनत्व प्रशासनिक लेजर एवं प्रत्यक्ष मॉड्यूल पहुंच'
                        : 'Session 2025-26 • High-density administrative ledger & direct module matrix'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('modern')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all transform active:scale-95"
                >
                  <Sparkles size={14} />
                  <span>{lang === 'hi' ? 'आधुनिक दृश्य (Modern View)' : 'Modern View'}</span>
                </button>
              </div>
            </div>

            {/* Classic 4 Key Ledger Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* 1. Students Ledger */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {lang === 'hi' ? 'कुल छात्र संख्या' : 'Total Students'}
                  </span>
                  <GraduationCap size={18} className="text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.totalStudents.toLocaleString('en-IN')}
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'hi' ? 'छात्र:' : 'Boys:'} <strong>{stats.totalBoys}</strong></span>
                  <span>{lang === 'hi' ? 'छात्राएं:' : 'Girls:'} <strong>{stats.totalGirls}</strong></span>
                </div>
              </div>

              {/* 2. Staff Strength */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    {lang === 'hi' ? 'कुल स्टाफ' : 'Total Staff'}
                  </span>
                  <Users size={18} className="text-orange-600 dark:text-orange-400" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                  {stats.totalStaff.toLocaleString('en-IN')}
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'hi' ? 'शिक्षक:' : 'Teachers:'} <strong>{stats.totalTeachers}</strong></span>
                  <span>{lang === 'hi' ? 'अन्य:' : 'Other:'} <strong>{stats.totalStaff - stats.totalTeachers}</strong></span>
                </div>
              </div>

              {/* 3. Daily Attendance Rate */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    {lang === 'hi' ? 'आज की उपस्थिति' : "Today's Attendance"}
                  </span>
                  <CalendarCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                  {studentAttendanceRate}%
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'hi' ? 'उपस्थित:' : 'Present:'} <strong>{stats.presentStudentsToday}</strong></span>
                  <span>{lang === 'hi' ? 'स्टाफ:' : 'Staff:'} <strong>{staffAttendanceRate}%</strong></span>
                </div>
              </div>

              {/* 4. Monthly Fee Collection */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    {lang === 'hi' ? 'मासिक शुल्क संग्रह' : 'Fee Collection'}
                  </span>
                  <Receipt size={18} className="text-purple-600 dark:text-purple-400" />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mt-2">
                  {formatCurrency(stats.incomeThisMonth)}
                </p>
                <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-slate-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>{lang === 'hi' ? 'दर:' : 'Rate:'} <strong>{stats.feeCollectionRate}%</strong></span>
                  <span className="text-rose-600 dark:text-rose-400 font-semibold">{lang === 'hi' ? 'बकाया:' : 'Dues:'} {formatCurrency(stats.totalDues)}</span>
                </div>
              </div>
            </div>

            {/* Classic 4-Column Administrative Navigation Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Category 1: Student & Admission */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <UserPlus size={14} className="text-blue-600" />
                  <span>{lang === 'hi' ? 'प्रवेश एवं छात्र' : 'Admission & Students'}</span>
                </h4>
                <div className="mt-3 space-y-1">
                  <Link href="/admission/new" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'नया छात्र प्रवेश' : 'New Admission'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/students" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'छात्र सूचना सूची' : 'Student Information'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/students/promotion" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'कक्षा प्रोन्नति' : 'Student Promotion'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/admission/inquiries" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'प्रवेश पूछताछ' : 'Admission Inquiries'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                </div>
              </div>

              {/* Category 2: Fees & Finance */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <Receipt size={14} className="text-amber-600" />
                  <span>{lang === 'hi' ? 'शुल्क एवं लेखा' : 'Fees & Accounts'}</span>
                </h4>
                <div className="mt-3 space-y-1">
                  <Link href="/fees/collect" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'शुल्क संग्रह काउंटर' : 'Collect Fee Counter'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/fees/dues" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'बकाया शुल्क सूची' : 'Pending Dues List'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/fees/structure" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'शुल्क संरचना' : 'Fee Structure'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/accounting/expenses" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'स्कूल व्यय प्रबंधन' : 'Expense Management'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                </div>
              </div>

              {/* Category 3: Academics & Staff */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <CalendarCheck size={14} className="text-emerald-600" />
                  <span>{lang === 'hi' ? 'अकादमिक एवं उपस्थिति' : 'Academics & Attendance'}</span>
                </h4>
                <div className="mt-3 space-y-1">
                  <Link href="/attendance" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'दैनिक उपस्थिति दर्ज करें' : 'Mark Daily Attendance'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/timetable" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'कक्षा समय सारणी' : 'Class Timetable'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/staff/teachers" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'शिक्षक डायरेक्टरी' : 'Teachers Directory'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/classes" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'कक्षाएं एवं अनुभाग' : 'Classes & Sections'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                </div>
              </div>

              {/* Category 4: Exam & Communications */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200 dark:border-slate-800 shadow-sm">
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 pb-2 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
                  <BookOpen size={14} className="text-purple-600" />
                  <span>{lang === 'hi' ? 'परीक्षा एवं संचार' : 'Exams & Communication'}</span>
                </h4>
                <div className="mt-3 space-y-1">
                  <Link href="/exams" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'परीक्षाएं एवं अंक' : 'Exams & Marks'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/notices" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'स्कूल नोटिस बोर्ड' : 'School Notice Board'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <Link href="/chat" className="flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'अभिभावक-शिक्षक चैट' : 'Parent-Teacher Chat'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </Link>
                  <button onClick={() => setIsSmsModalOpen(true)} className="w-full flex items-center justify-between py-1.5 px-2 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700">
                    <span>{lang === 'hi' ? 'त्वरित एसएमएस ब्रॉडकास्ट' : 'Quick SMS Broadcast'}</span>
                    <ChevronRight size={13} className="text-gray-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Classic High-Density Ledger Table */}
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>{lang === 'hi' ? 'कक्षावार छात्र वितरण एवं शुल्क स्थिति' : 'Class-wise Student Distribution & Fee Status Ledger'}</span>
                </h3>
                <span className="text-xs text-gray-500">{lang === 'hi' ? 'कुल 13 कक्षाएं' : '13 Standards Active'}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">{lang === 'hi' ? 'कक्षा' : 'Class'}</th>
                      <th className="p-3">{lang === 'hi' ? 'छात्र संख्या' : 'Total Students'}</th>
                      <th className="p-3">{lang === 'hi' ? 'छात्र' : 'Boys'}</th>
                      <th className="p-3">{lang === 'hi' ? 'छात्राएं' : 'Girls'}</th>
                      <th className="p-3">{lang === 'hi' ? 'मासिक शुल्क' : 'Monthly Fee'}</th>
                      <th className="p-3">{lang === 'hi' ? 'स्थिति' : 'Collection Status'}</th>
                      <th className="p-3 text-right">{lang === 'hi' ? 'कार्रवाई' : 'Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                    {classStrengthData.map((cls, idx) => (
                      <tr key={cls.name} className="hover:bg-gray-50/60 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-gray-900 dark:text-gray-100">{cls.name}</td>
                        <td className="p-3 font-semibold">{cls.students}</td>
                        <td className="p-3 text-gray-500">{Math.round(cls.students * 0.55)}</td>
                        <td className="p-3 text-gray-500">{cls.students - Math.round(cls.students * 0.55)}</td>
                        <td className="p-3 font-medium text-emerald-600 dark:text-emerald-400">₹{(cls.students * 1800).toLocaleString('en-IN')}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            {80 + (idx % 15)}% Paid
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <Link href={`/classes`} className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline">
                            {lang === 'hi' ? 'विवरण' : 'Details'}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <>
        {/* ========================================================================= */}
        {/* 1. TOP PURPLE HERO BANNER (eSkooly Signature Card)                        */}
        {/* ========================================================================= */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#491bb4] via-[#5c23cf] to-[#7928ca] text-white p-6 sm:p-7 shadow-lg shadow-purple-900/10">
          {/* Subtle background ambient light curves */}
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 rounded-full bg-white/5 blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-80 h-80 rounded-full bg-purple-400/10 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col gap-6">
            {/* Top row: Greeting & Status left, Weather & Date right */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  {greeting}
                </h1>
                <p className="text-purple-100/90 text-xs sm:text-sm mt-1">
                  Here is what&apos;s happening at your institute today.
                </p>

                {/* Institute verified badge */}
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[11px] font-medium text-white shadow-sm">
                  <ShieldCheck size={13} className="text-emerald-300" />
                  <span>Institute verified &bull; Active</span>
                </div>
              </div>

              {/* Right side: Weather + Date & View Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                {/* Weather widget */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-white shadow-sm">
                  <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
                    <CloudRain size={16} className="text-cyan-200" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      <span>23°C</span>
                      <span className="text-white/60 font-normal">&bull; Patna, India</span>
                    </div>
                    <p className="text-[10px] text-purple-200">
                      Rain &bull; {currentTime || '10:14 AM'}
                    </p>
                  </div>
                </div>

                {/* Date & Switch View */}
                <div className="flex items-center gap-2">
                  <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
                    <Calendar size={13} className="text-purple-200" />
                    <span>{currentDate || 'Tuesday, September 22, 2026'}</span>
                  </div>

                  <button
                    onClick={handleToggleViewMode}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white text-[#5c23cf] hover:bg-purple-50 text-xs font-bold shadow-md transition-all transform active:scale-95"
                  >
                    <Sparkles size={13} className="text-[#5c23cf]" />
                    <span>{viewMode === 'modern' ? (lang === 'hi' ? 'क्लासिक दृश्य' : 'Classic View') : (lang === 'hi' ? 'आधुनिक दृश्य' : 'Modern View')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom row inside Purple Banner: 4 Translucent Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {/* Pill 1 */}
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/15 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-400/20 flex items-center justify-center text-blue-200">
                    <GraduationCap size={16} />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {stats.presentStudentsToday}/{stats.totalStudents}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-purple-200/80 font-medium">
                      Students Present
                    </p>
                  </div>
                </div>
              </div>

              {/* Pill 2 */}
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/15 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-400/20 flex items-center justify-center text-orange-200">
                    <Users size={16} />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {stats.presentStaffToday}/{stats.totalStaff}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-purple-200/80 font-medium">
                      Staff Present
                    </p>
                  </div>
                </div>
              </div>

              {/* Pill 3 */}
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/15 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-400/20 flex items-center justify-center text-emerald-200">
                    <Receipt size={16} />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                      {stats.feeCollectionRate}%
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-purple-200/80 font-medium">
                      This Month&apos;s Fee
                    </p>
                  </div>
                </div>
              </div>

              {/* Pill 4 */}
              <div className="bg-white/10 hover:bg-white/15 backdrop-blur-md rounded-2xl p-3 border border-white/15 transition-all">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-pink-400/20 flex items-center justify-center text-pink-200">
                    <Sparkles size={16} />
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-white tracking-wide">
                      +{stats.newAdmissionsThisMonth}
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-purple-200/80 font-medium">
                      New In September
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. SIX QUICK ACTIONS HORIZONTAL BAR                                       */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Action 1: Add Student */}
          <Link
            href="/admission/new"
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
              <UserPlus size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-blue-600 transition-colors">
              Add Student
            </span>
          </Link>

          {/* Action 2: Collect Fee */}
          <Link
            href="/fees/collect"
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-amber-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-sm">
              <Receipt size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-amber-600 transition-colors">
              Collect Fee
            </span>
          </Link>

          {/* Action 3: Mark Attendance */}
          <Link
            href="/attendance"
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
              <CalendarCheck size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-emerald-600 transition-colors">
              Mark Attendance
            </span>
          </Link>

          {/* Action 4: Send SMS */}
          <button
            onClick={() => setIsSmsModalOpen(true)}
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-orange-600 group-hover:text-white transition-all shadow-sm">
              <MessageSquare size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-orange-600 transition-colors">
              Send SMS
            </span>
          </button>

          {/* Action 5: Notices */}
          <Link
            href="/notices"
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-rose-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-sm">
              <Megaphone size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-rose-600 transition-colors">
              Notices
            </span>
          </Link>

          {/* Action 6: Homework */}
          <Link
            href="/homework"
            className="group flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all text-center"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-sm">
              <BookOpen size={20} />
            </div>
            <span className="mt-2.5 text-xs font-bold text-gray-700 group-hover:text-purple-600 transition-colors">
              Homework
            </span>
          </Link>
        </div>

        {/* ========================================================================= */}
        {/* 3. FOUR PRIMARY KEY METRIC CARDS WITH TOP ACCENT LINES                    */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: TOTAL STUDENTS */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 right-5 w-24 h-1 bg-blue-500 rounded-b-full" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                  Total Students
                </p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  {stats.totalStudents.toLocaleString('en-IN')}
                </h3>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">Admissions this month:</span>
              <span className="font-semibold text-blue-600">+{stats.newAdmissionsThisMonth} new</span>
            </div>
          </div>

          {/* Card 2: TOTAL EMPLOYEES */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 right-5 w-24 h-1 bg-orange-500 rounded-b-full" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
                <Users size={20} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                  Total Employees
                </p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  {stats.totalStaff}
                </h3>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">Joined this month:</span>
              <span className="font-semibold text-orange-600">+2 joined</span>
            </div>
          </div>

          {/* Card 3: FEE BALANCE / DUE */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 right-5 w-24 h-1 bg-emerald-500 rounded-b-full" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                  Fee Balance
                </p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  {formatCurrency(stats.totalDues)}
                </h3>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">Income this month:</span>
              <span className="font-semibold text-emerald-600">
                +{formatCurrency(stats.incomeThisMonth)}
              </span>
            </div>
          </div>

          {/* Card 4: MONTH'S NET PROFIT */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Top accent bar */}
            <div className="absolute top-0 right-5 w-24 h-1 bg-amber-500 rounded-b-full" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <TrendingUp size={20} />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                  Monthly Profit
                </p>
                <h3 className="text-2xl font-extrabold text-gray-900 mt-0.5">
                  {formatCurrency(stats.profitThisMonth)}
                </h3>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between text-xs">
              <span className="text-gray-500">Expenses this month:</span>
              <span className="font-semibold text-rose-500">
                {formatCurrency(stats.expenseThisMonth)}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MIDDLE ANALYTICS GRID: INCOME VS EXPENSE (LEFT) & FEE COLLECTION (RIGHT) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Income vs Expense Chart (~65% width) */}
          <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Income vs Expense
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Last 6 months trend</p>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Income
                  </span>
                  <span className="flex items-center gap-1.5 font-medium text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Expense
                  </span>
                </div>

                <Link
                  href="/reports"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline"
                >
                  View Report <ArrowUpRight size={13} />
                </Link>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={financialTrendData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatCurrency(val), '']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '16px',
                      border: '1px solid #f3f4f6',
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorIncome)"
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="#ef4444"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorExpense)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Fee Collection Donut Widget (~35% width) */}
          <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Fee Collection
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Estimated vs collected this month
              </p>
            </div>

            {/* Circular Gauge / Donut */}
            <div className="relative h-44 flex items-center justify-center my-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={feeDonutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                    startAngle={90}
                    endAngle={-270}
                  >
                    {feeDonutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val: number) => formatCurrency(val)} />
                </PieChart>
              </ResponsiveContainer>

              {/* Inside center percentage */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-gray-900">
                  {stats.feeCollectionRate}%
                </span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Collected
                </span>
              </div>
            </div>

            {/* Bottom 3-item breakdown */}
            <div className="grid grid-cols-3 gap-2 pt-4 border-t border-gray-100 text-center">
              <div>
                <p className="text-xs font-bold text-emerald-600">
                  {formatCurrency(stats.incomeThisMonth)}
                </p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">Collected</p>
              </div>
              <div className="border-x border-gray-100 px-1">
                <p className="text-xs font-bold text-amber-600">
                  {formatCurrency(stats.totalDues)}
                </p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">Remaining</p>
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600">
                  {formatCurrency(stats.incomeThisMonth + stats.totalDues)}
                </p>
                <p className="text-[10px] font-medium text-gray-400 mt-0.5">Estimated</p>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4.5 LIVE FEE COLLECTION & PAYER ATTRIBUTION (STUDENT VS PARENT)           */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-base sm:text-lg font-black text-gray-900">
                  Live Fee Collection & Payer Stream
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                  Student vs Parent Tracking
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Real-time ledger recording whether fees were remitted directly by students via Student UPI QR or by parents via Parent Portal.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchFeeTransactions}
                disabled={isRefreshingFees}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                title="Refresh Real-Time Collection Feed"
              >
                <Radio size={14} className={isRefreshingFees ? 'animate-spin text-purple-600' : 'text-gray-500'} />
                <span>{isRefreshingFees ? 'Refreshing...' : 'Live Sync'}</span>
              </button>
              <Link
                href="/fees"
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition"
              >
                <span>Full Ledger</span>
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>

          {/* 3 Metrics Cards: Total, Student Paid, Parent Paid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Student Paid Total */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50/60 border border-blue-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase">Paid by Students Directly</span>
                <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <GraduationCap size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-950 mt-2">
                {formatCurrency(feeSummary.studentPaidTotal)}
              </p>
              <p className="text-[11px] text-blue-700 font-medium mt-0.5">
                {feeSummary.studentTransactionsCount} payments via Student UPI QR / App
              </p>
            </div>

            {/* Parent Paid Total */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50/60 border border-emerald-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 uppercase">Paid by Parents</span>
                <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Users size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-950 mt-2">
                {formatCurrency(feeSummary.parentPaidTotal)}
              </p>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
                {feeSummary.parentTransactionsCount} settlements via Parent Portal
              </p>
            </div>

            {/* Total Combined Online */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50/60 border border-purple-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-900 uppercase">Total Tracked Collections</span>
                <span className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  <Receipt size={16} />
                </span>
              </div>
              <p className="text-2xl font-black text-purple-950 mt-2">
                {formatCurrency(feeSummary.totalCollected)}
              </p>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                {feeSummary.totalTransactions} transactions across student & parent channels
              </p>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-2 pt-1 border-b border-gray-100 pb-3 overflow-x-auto">
            <span className="text-xs font-bold text-gray-500 mr-1">Filter by Payer:</span>
            {[
              { id: 'ALL', label: `All Channels (${feeTransactions.length})` },
              { id: 'STUDENT', label: `Paid by Student (${feeSummary.studentTransactionsCount})` },
              { id: 'PARENT', label: `Paid by Parent (${feeSummary.parentTransactionsCount})` },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFeePayerFilter(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  feePayerFilter === f.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Transactions Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Student & Class</th>
                  <th className="p-3">Payer Attribution</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Amount (₹)</th>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {feeTransactions
                  .filter(tx => feePayerFilter === 'ALL' || tx.payerType === feePayerFilter)
                  .map((tx, idx) => (
                    <tr key={tx.id || idx} className="hover:bg-gray-50/70 transition">
                      <td className="p-3 font-mono font-bold text-purple-700">
                        {tx.receiptNo}
                      </td>
                      <td className="p-3">
                        <p className="font-bold text-gray-900">{tx.studentName}</p>
                        <p className="text-[11px] text-gray-400">{tx.studentClass} &bull; {tx.admissionNo}</p>
                      </td>
                      <td className="p-3">
                        {tx.payerType === 'STUDENT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold text-[11px]">
                            <GraduationCap size={13} />
                            <span>Paid by Student ({tx.payerName || tx.studentName})</span>
                          </span>
                        ) : tx.payerType === 'PARENT' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                            <Users size={13} />
                            <span>Paid by Parent ({tx.payerName})</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 font-bold text-[11px]">
                            <Building2 size={13} />
                            <span>Cash / Admin Desk</span>
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-gray-800">
                        <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-[10px]">
                          {tx.paymentMode}
                        </span>
                      </td>
                      <td className="p-3 font-mono font-black text-gray-900 text-sm">
                        {formatCurrency(tx.paidAmount || tx.amount)}
                      </td>
                      <td className="p-3 text-[11px] text-gray-500">
                        {tx.paymentDate}
                      </td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase">
                          Cleared
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. OPERATIONS: TODAY'S PROGRESS & CLASS-WISE STRENGTH                     */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Today's Progress Card */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900">
                Today&apos;s Progress
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Attendance & fee collection at a glance
              </p>
            </div>

            {/* 3 Circular Progress Meters */}
            <div className="grid grid-cols-3 gap-4 my-6 text-center">
              {/* Meter 1: Students */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-blue-600 transition-all duration-1000 ease-out"
                      strokeDasharray={`${studentAttendanceRate}, 100`}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-sm font-extrabold text-gray-900">
                    {studentAttendanceRate}%
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-600 mt-2">
                  Students Present
                </span>
                <span className="text-[10px] text-gray-400">
                  {stats.presentStudentsToday} of {stats.totalStudents}
                </span>
              </div>

              {/* Meter 2: Staff */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-orange-500 transition-all duration-1000 ease-out"
                      strokeDasharray={`${staffAttendanceRate}, 100`}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-sm font-extrabold text-gray-900">
                    {staffAttendanceRate}%
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-600 mt-2">
                  Staff Present
                </span>
                <span className="text-[10px] text-gray-400">
                  {stats.presentStaffToday} of {stats.totalStaff}
                </span>
              </div>

              {/* Meter 3: Fee */}
              <div className="flex flex-col items-center">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      strokeWidth="3.2"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 transition-all duration-1000 ease-out"
                      strokeDasharray={`${stats.feeCollectionRate}, 100`}
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <span className="absolute text-sm font-extrabold text-gray-900">
                    {stats.feeCollectionRate}%
                  </span>
                </div>
                <span className="text-xs font-semibold text-gray-600 mt-2">
                  Fees Collected
                </span>
                <span className="text-[10px] text-gray-400">This Month</span>
              </div>
            </div>

            {/* Student Demographics (Ratio Bar from Reference Image) */}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-bold text-gray-800">Student Demographics</span>
                <span className="text-gray-400 text-[11px]">
                  {stats.totalStudents} Students
                </span>
              </div>

              {/* Stacked ratio bar */}
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${(stats.totalBoys / stats.totalStudents) * 100}%` }}
                  className="h-full bg-blue-500 rounded-l-full transition-all"
                  title={`Boys: ${stats.totalBoys}`}
                />
                <div
                  style={{ width: `${(stats.totalGirls / stats.totalStudents) * 100}%` }}
                  className="h-full bg-pink-500 rounded-r-full transition-all"
                  title={`Girls: ${stats.totalGirls}`}
                />
              </div>

              {/* Demographics Legend */}
              <div className="flex items-center justify-between mt-2.5 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>
                    Boys: <strong>{stats.totalBoys}</strong> (
                    {Math.round((stats.totalBoys / stats.totalStudents) * 100)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-pink-500" />
                  <span>
                    Girls: <strong>{stats.totalGirls}</strong> (
                    {Math.round((stats.totalGirls / stats.totalStudents) * 100)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Class-wise Strength Card */}
          <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-gray-900">
                  Class-wise Strength
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  13 Classes &bull; 16 Subjects assigned
                </p>
              </div>

              <Link
                href="/classes"
                className="text-xs font-semibold text-purple-600 hover:underline inline-flex items-center gap-1"
              >
                All Classes &gt;
              </Link>
            </div>

            {/* Class distribution bar chart */}
            <div className="h-[230px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={classStrengthData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    interval={1}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Tooltip
                    cursor={{ fill: '#f9fafb' }}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #f3f4f6',
                      fontSize: '11px',
                    }}
                  />
                  <Bar
                    dataKey="students"
                    fill="#6366f1"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Avg. Students per Class: <strong>68</strong></span>
              <span className="text-emerald-600 font-semibold">&bull; 100% Capacity active</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 6. OPERATIONAL FEEDS: ABSENT TODAY, PRESENT STAFF, NEW ADMISSIONS, BIRTHDAYS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Absent Today */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">Absent Today</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                0 absent
              </span>
            </div>

            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
                <Smile size={22} />
              </div>
              <p className="text-xs font-semibold text-gray-700">
                Full attendance today!
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                No absent students reported.
              </p>
            </div>

            <Link
              href="/attendance"
              className="text-center text-xs font-semibold text-purple-600 hover:underline pt-2 border-t border-gray-50 block"
            >
              View Attendance Sheet &rarr;
            </Link>
          </div>

          {/* Card 2: Present Staff */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">Present Staff</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-bold">
                {stats.presentStaffToday}/{stats.totalStaff} present
              </span>
            </div>

            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-2">
                <Building2 size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-700">
                Staff attendance active
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Teaching & Admin staff logged in.
              </p>
            </div>

            <Link
              href="/attendance"
              className="text-center text-xs font-semibold text-purple-600 hover:underline pt-2 border-t border-gray-50 block"
            >
              Manage Staff Log &rarr;
            </Link>
          </div>

          {/* Card 3: New Admissions */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">New Admissions</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                +{stats.newAdmissionsThisMonth} enrolled
              </span>
            </div>

            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-2">
                <UserPlus size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-700">
                18 Enrolled this month
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Academic Session 2025-26
              </p>
            </div>

            <Link
              href="/admission/new"
              className="text-center text-xs font-semibold text-purple-600 hover:underline pt-2 border-t border-gray-50 block"
            >
              + New Student Admission &rarr;
            </Link>
          </div>

          {/* Card 4: Birthdays */}
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-800">Birthdays</span>
              <span className="px-2 py-0.5 rounded-full bg-pink-50 text-pink-700 text-[10px] font-bold">
                Today
              </span>
            </div>

            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center mb-2">
                <Cake size={20} />
              </div>
              <p className="text-xs font-semibold text-gray-700">
                No birthdays today
              </p>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Next upcoming: Vihaan (Tomorrow)
              </p>
            </div>

            <button
              onClick={() => {
                setSmsMessage('Wishing you a very Happy Birthday! 🎉 — From Vidyalaya');
                setIsSmsModalOpen(true);
              }}
              className="text-center text-xs font-semibold text-pink-600 hover:underline pt-2 border-t border-gray-50 block w-full"
            >
              Schedule Birthday Wishes &rarr;
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 7. BOTTOM PROMOTIONAL BANNERS: FREE SMS GATEWAY & DESKTOP APPS            */}
        {/* ========================================================================= */}
        <div id="download-apps" className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Purple Free SMS Gateway Card */}
          <div className="lg:col-span-6 rounded-3xl bg-gradient-to-r from-[#4f1cb5] via-[#5c23cf] to-[#7928ca] p-6 text-white relative overflow-hidden shadow-md flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white">
                  <Radio size={22} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-base font-bold">Free SMS Gateway</h4>
                  <p className="text-xs text-purple-200 mt-0.5">
                    Send unlimited broadcast SMS on mobile numbers
                  </p>
                </div>
              </div>

              {/* Plus button */}
              <button
                onClick={() => setIsSmsModalOpen(true)}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white text-white hover:text-purple-700 flex items-center justify-center transition-all shadow-sm"
                title="Send Broadcast SMS"
              >
                <Send size={16} />
              </button>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
              <div className="flex items-center gap-3 text-xs text-purple-200">
                <span>&bull; Automated Fee Alerts</span>
                <span>&bull; Attendance SMS</span>
                <span>&bull; Notices</span>
              </div>
              <button
                onClick={() => setIsSmsModalOpen(true)}
                className="px-4 py-2 bg-white text-purple-700 hover:bg-purple-50 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
              >
                Launch Broadcast
              </button>
            </div>
          </div>

          {/* Desktop & Mobile App Download Banner */}
          <div className="lg:col-span-6 rounded-3xl bg-white p-6 border border-gray-100 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-md">
                  Desktop / Vendor App
                </span>
                <h4 className="text-base font-bold text-gray-900 mt-1.5">
                  Download & install Vidyalaya on your PC
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  Offline syncing, thermal printer receipts & biometric integration
                </p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-600">
                <Laptop size={20} />
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={() => alert('Vidyalaya for Windows installer (v2.4) downloading...')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow hover:from-blue-700 hover:to-indigo-700 transition-all transform active:scale-95"
              >
                <Download size={14} />
                <span>Download for Windows</span>
              </button>

              <button
                onClick={() => alert('Vidyalaya for macOS (Apple Silicon / Intel) downloading...')}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-xs font-bold rounded-xl shadow-sm hover:bg-black transition-all transform active:scale-95"
              >
                <Download size={14} />
                <span>Download for macOS</span>
              </button>
            </div>
          </div>
        </div>
        </>
        )}

        {/* ========================================================================= */}
        {/* 8. INTERACTIVE QUICK BROADCAST SMS MODAL                                  */}
        {/* ========================================================================= */}
        {isSmsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsSmsModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Radio size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Send Broadcast SMS</h3>
                  <p className="text-xs text-gray-500">Free SMS Gateway for Students & Staff</p>
                </div>
              </div>

              {smsStatus === 'success' ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle2 size={24} />
                  </div>
                  <h4 className="text-base font-bold text-gray-900">Broadcast Sent Successfully!</h4>
                  <p className="text-xs text-gray-500 mt-1">SMS delivered to selected recipients.</p>
                </div>
              ) : (
                <form onSubmit={handleSendSms} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Recipient Audience
                    </label>
                    <select
                      value={smsAudience}
                      onChange={(e) => setSmsAudience(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                    >
                      <option value="ALL_PARENTS">All Parents ({stats.totalStudents} Recipients)</option>
                      <option value="ALL_TEACHERS">All Teachers & Staff ({stats.totalStaff} Recipients)</option>
                      <option value="FEE_DEFAULTERS">Fee Pending Defaulters (142 Recipients)</option>
                      <option value="ABSENT_STUDENTS">Today&apos;s Absent Students</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Message Content
                      </label>
                      <span className="text-[10px] text-gray-400">{smsMessage.length}/160 chars</span>
                    </div>
                    <textarea
                      rows={4}
                      value={smsMessage}
                      onChange={(e) => setSmsMessage(e.target.value)}
                      placeholder="Type your message here or pick a template..."
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none"
                      required
                    />
                  </div>

                  {/* Quick Templates */}
                  <div>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mb-1.5">Quick Templates</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setSmsMessage(
                            'Dear Parent, kindly ensure the pending fee is paid before the due date to avoid late charges. — Vidyalaya'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-700 transition-colors"
                      >
                        Fee Reminder
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSmsMessage(
                            'Dear Parent, tomorrow will be observed as a holiday on account of the festival. — Vidyalaya'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-700 transition-colors"
                      >
                        Holiday Notice
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setSmsMessage(
                            'Dear Parent, the Half-Yearly examination schedule has been published on the portal. — Vidyalaya'
                          )
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-purple-50 hover:text-purple-700 text-gray-700 transition-colors"
                      >
                        Exam Schedule
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => setIsSmsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={smsStatus === 'sending' || !smsMessage.trim()}
                      className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all disabled:opacity-50"
                    >
                      {smsStatus === 'sending' ? (
                        <span>Sending...</span>
                      ) : (
                        <>
                          <Send size={13} />
                          <span>Send Broadcast Now</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
