'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  GraduationCap,
  IndianRupee,
  CheckSquare,
  BookOpen,
  Calendar,
  Award,
  FileText,
  Bell,
  Clock,
  Video,
  User,
  ShieldAlert,
  CalendarCheck,
  Sparkles,
  ChevronRight,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trophy,
  ExternalLink,
  CreditCard,
  Flame,
  Shield,
  MapPin,
  Bus,
  Radio,
  Receipt,
  QrCode,
  X,
  RefreshCw,
} from 'lucide-react';
import { formatCurrency } from '@/utils/helpers';
import toast from 'react-hot-toast';

export default function ParentDashboard() {
  const { data: session } = useSession();
  const parentName = session?.user?.name || 'Rajesh Sharma';

  // Multi-child switcher state
  const children = [
    {
      id: 'c-1',
      name: 'Aarav Sharma',
      admissionNo: 'ADM2026100',
      rollNo: '1',
      class: 'Class 10-A',
      house: 'Tagore House',
      attendancePercent: 92,
      lastScore: '91.2%',
      rank: '#3',
      feeDue: 3000,
    }
  ];

  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const currentChild = children[selectedChildIndex];

  // Active Tab
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'TIMETABLE' | 'HOMEWORK' | 'EXAMS' | 'FEES' | 'ACTIVITIES' | 'STUDY_FOCUS'>('OVERVIEW');

  // Fee payment simulator state
  const [feePaid, setFeePaid] = useState(false);

  // Live Campus Arrival & Presence Tracking State
  const [gatePresence, setGatePresence] = useState<{
    studentId: string;
    studentName: string;
    studentClass: string;
    status: 'INSIDE_CAMPUS' | 'LATE_ENTRY' | 'ABSENT' | 'DEPARTED';
    statusLabel: string;
    gateName: string;
    checkInTime?: string;
    checkOutTime?: string;
    isSafe: boolean;
    busRoute?: string;
    timeline: Array<{
      time: string;
      event: string;
      detail: string;
      type: 'SUCCESS' | 'WARNING' | 'ALERT' | 'INFO';
    }>;
  }>({
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    status: 'INSIDE_CAMPUS',
    statusLabel: 'Inside Campus - Safe & Present',
    gateName: 'Gate 1 (Main Entrance)',
    checkInTime: '07:52 AM',
    isSafe: true,
    busRoute: 'Bus Route 4 (Tagore Garden)',
    timeline: [
      {
        time: '07:15 AM',
        event: 'School Bus Boarded',
        detail: 'Aarav boarded Bus Route 4 at Tagore Garden Stop (GPS Verified).',
        type: 'INFO',
      },
      {
        time: '07:52 AM',
        event: 'Gate 1 RFID Check-In',
        detail: 'RFID Student ID Card tapped at Gate 1. Verified safe arrival.',
        type: 'SUCCESS',
      },
      {
        time: '08:00 AM',
        event: 'Classroom Roll Call',
        detail: 'Marked PRESENT in Class 10-A Room 101 by Mr. Arun Sharma.',
        type: 'SUCCESS',
      },
    ],
  });
  const [isSimulatingGate, setIsSimulatingGate] = useState(false);

  // Live Notifications List
  const [parentNotifications, setParentNotifications] = useState<any[]>([]);

  // Live Fee State
  const [feeData, setFeeData] = useState<{
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
  const [isParentFeeModalOpen, setIsParentFeeModalOpen] = useState(false);
  const [parentPaymentMethod, setParentPaymentMethod] = useState<'CARD' | 'UPI' | 'NETBANKING'>('CARD');
  const [isProcessingParentFee, setIsProcessingParentFee] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<any>(null);

  // Child's study log data
  const [studyHistory, setStudyHistory] = useState<any[]>([
    {
      id: 'pomo-1',
      subject: 'Mathematics',
      taskTitle: 'Quadratic Equations Exercise 4.2 Derivations',
      durationMinutes: 25,
      completedAt: 'Today, 08:30 PM',
      status: 'COMPLETED',
      notes: 'Mastered finding roots by factorization & discriminant method',
      rating: 5,
    },
    {
      id: 'pomo-2',
      subject: 'Science (Physics)',
      taskTitle: 'Ray diagrams for concave mirror & Cartesian sign conventions',
      durationMinutes: 25,
      completedAt: 'Today, 07:45 PM',
      status: 'COMPLETED',
      notes: 'Practiced 6 mirror cases; remembered virtual image focal point rules',
      rating: 4,
    },
    {
      id: 'pomo-3',
      subject: 'Social Science',
      taskTitle: 'Nationalism in Europe timeline review & treaty dates',
      durationMinutes: 25,
      completedAt: 'Today, 06:15 PM',
      status: 'COMPLETED',
      notes: 'Memorized Treaty of Vienna (1815) & Frankfurt Parliament dates',
      rating: 5,
    },
  ]);

  // Fetch Gate Status
  const fetchGateStatus = async () => {
    try {
      const res = await fetch('/api/attendance/gate?studentId=student-1');
      const data = await res.json();
      if (data.success && data.data) {
        setGatePresence(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Parent Notifications
  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications?studentId=student-1');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setParentNotifications(data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fetch Live Fees
  const fetchFees = async () => {
    try {
      const res = await fetch('/api/fees?studentId=student-1');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        const term2Payment = data.data.find((p: any) => p.month === 'October' && p.paymentStatus === 'PAID');
        if (term2Payment) {
          setFeeData({
            isPaid: true,
            paidBy: term2Payment.payerType,
            paidByName: term2Payment.payerName,
            paidDate: term2Payment.paymentDate,
            receiptNo: term2Payment.receiptNo,
            paymentMode: term2Payment.paymentMode,
            amount: term2Payment.paidAmount,
            transactionId: term2Payment.transactionId,
          });
          setFeePaid(true);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simulate Gate Actions
  const handleSimulateGateEvent = async (action: 'GATE_IN' | 'LATE_ENTRY' | 'ABSENT_ALERT' | 'GATE_OUT') => {
    setIsSimulatingGate(true);
    try {
      const res = await fetch('/api/attendance/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          studentName: currentChild.name,
          gate: action === 'GATE_OUT' ? 'Gate 2' : 'Gate 1',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGatePresence(data.data);
        if (action === 'GATE_IN') {
          toast.success(`🟢 Safe Arrival Verified: ${currentChild.name} reached school safely!`, { duration: 4000 });
        } else if (action === 'LATE_ENTRY') {
          toast.error(`🟡 Late Arrival Alert: ${currentChild.name} entered school 25 mins late!`, { duration: 4000 });
        } else if (action === 'ABSENT_ALERT') {
          toast.error(`🔴 Absence Alert: ${currentChild.name} was marked absent for morning roll call!`, { duration: 5000 });
        } else if (action === 'GATE_OUT') {
          toast.success(`🔵 Campus Departure: ${currentChild.name} safely departed via Gate 2 & boarded Bus 4!`, { duration: 4000 });
        }
        fetchNotifications();
      }
    } catch {
      toast.error('Failed to trigger gate simulation event');
    } finally {
      setIsSimulatingGate(false);
    }
  };

  // Handle Parent Pay Fee
  const handleParentPayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingParentFee(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'student-1',
          studentName: currentChild.name,
          studentClass: currentChild.class,
          admissionNo: currentChild.admissionNo,
          amount: 3000,
          paidAmount: 3000,
          payerType: 'PARENT',
          payerName: `${parentName} (Parent)`,
          paymentMode: parentPaymentMethod,
          month: 'October',
          remarks: `Parent Portal Payment by ${parentName} via ${parentPaymentMethod}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 Fee Paid Successfully! Official Receipt #${data.data.receiptNo} generated.`);
        setFeeData({
          isPaid: true,
          paidBy: 'PARENT',
          paidByName: `${parentName} (Parent)`,
          paidDate: data.data.paymentDate,
          receiptNo: data.data.receiptNo,
          paymentMode: parentPaymentMethod,
          amount: 3000,
          transactionId: data.data.transactionId,
        });
        setFeePaid(true);
        setIsParentFeeModalOpen(false);
        setActiveReceiptModal(data.data);
        fetchNotifications();
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch {
      toast.error('Network error during fee payment');
    } finally {
      setIsProcessingParentFee(false);
    }
  };

  useEffect(() => {
    fetchGateStatus();
    fetchNotifications();
    fetchFees();

    try {
      const saved = localStorage.getItem('vidyalaya_student_pomodoro_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setStudyHistory(parsed);
        }
      }
    } catch (e) {}

    fetch('/api/pomodoro')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setStudyHistory(data.data);
        }
      })
      .catch(() => {});
  }, []);

  const totalMinutesStudiedToday = studyHistory
    .filter(p => p.completedAt?.includes('Today') || p.completedAt === 'Just now')
    .reduce((sum, p) => sum + (p.durationMinutes || 0), 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* ========================================================================= */}
        {/* 1. HERO BANNER WITH CHILD SWITCHER & PRINCIPAL CONNECT CALLOUT            */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs font-bold text-purple-200">
                <Sparkles size={14} className="text-amber-400" />
                <span>Parent 360° Academic & Pastoral Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Welcome, {parentName}!
              </h1>
              <p className="text-sm text-purple-200 max-w-xl">
                Real-time visibility into your child&apos;s academics, attendance, exam marksheets, fee settlements, and direct 1-to-1 communication with School Leadership.
              </p>
            </div>

            {/* CHILD SWITCHER & PRINCIPAL CONNECT BUTTON */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-3 text-left">
                <p className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Viewing Ward</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-400 text-purple-950 font-black text-xs flex items-center justify-center">
                    {currentChild.name[0]}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{currentChild.name}</p>
                    <p className="text-[10px] text-purple-200">{currentChild.class} • Roll No: {currentChild.rollNo}</p>
                  </div>
                </div>
              </div>

              {/* USP: Confidential 1-to-1 Meeting with Teacher or Principal */}
              <Link
                href="/meetings"
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-500/30 transition transform active:scale-95"
              >
                <CalendarCheck size={16} />
                <span>1:1 Teacher & Principal Connect</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS COCKPIT                                                          */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Child Profile</p>
              <p className="text-base font-black text-gray-900">{currentChild.name}</p>
              <p className="text-[11px] text-gray-400">{currentChild.class} • {currentChild.house}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Attendance Rate</p>
              <p className="text-2xl font-black text-emerald-600">{currentChild.attendancePercent}%</p>
              <p className="text-[11px] text-emerald-600 font-medium">Spotless record this month</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Award size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Last Exam Score</p>
              <p className="text-2xl font-black text-purple-700">{currentChild.lastScore}</p>
              <p className="text-[11px] text-purple-600 font-medium">Rank {currentChild.rank} in Standard 10</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
              feeData.isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <IndianRupee size={24} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">School Fees</p>
              <p className={`text-2xl font-black ${feeData.isPaid ? 'text-emerald-600' : 'text-rose-600'}`}>
                {feeData.isPaid ? formatCurrency(0) : formatCurrency(currentChild.feeDue)}
              </p>
              <p className="text-[11px] font-medium">
                {feeData.isPaid ? (
                  <span className="text-emerald-600 font-bold">
                    ✓ Paid by {feeData.paidBy === 'STUDENT' ? 'Student' : 'Parent'}
                  </span>
                ) : (
                  <span className="text-rose-500">Due date: Oct 15, 2026</span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2.5 LIVE CAMPUS ARRIVAL & SAFE PRESENCE TRACKER (PARENT USP)              */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-md relative overflow-hidden space-y-5">
          {/* Top Status Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${
                gatePresence.status === 'INSIDE_CAMPUS'
                  ? 'bg-emerald-100 text-emerald-700'
                  : gatePresence.status === 'LATE_ENTRY'
                  ? 'bg-amber-100 text-amber-700'
                  : gatePresence.status === 'ABSENT'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                {gatePresence.status === 'INSIDE_CAMPUS' ? (
                  <Shield size={24} />
                ) : gatePresence.status === 'LATE_ENTRY' ? (
                  <Clock size={24} />
                ) : gatePresence.status === 'ABSENT' ? (
                  <AlertTriangle size={24} />
                ) : (
                  <Bus size={24} />
                )}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    gatePresence.status === 'INSIDE_CAMPUS'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : gatePresence.status === 'LATE_ENTRY'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : gatePresence.status === 'ABSENT'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      gatePresence.status === 'INSIDE_CAMPUS'
                        ? 'bg-emerald-500 animate-pulse'
                        : gatePresence.status === 'LATE_ENTRY'
                        ? 'bg-amber-500'
                        : gatePresence.status === 'ABSENT'
                        ? 'bg-rose-600 animate-ping'
                        : 'bg-blue-500'
                    }`} />
                    {gatePresence.statusLabel}
                  </span>
                  <span className="text-xs text-gray-500 font-mono font-bold">
                    {gatePresence.checkInTime ? `Checked In: ${gatePresence.checkInTime}` : gatePresence.checkOutTime ? `Departed: ${gatePresence.checkOutTime}` : 'Morning Roll Call Alert'}
                  </span>
                </div>
                <h3 className="text-base font-black text-gray-900 mt-1">
                  Safe School Transit & Gate Check-In Monitor
                </h3>
                <p className="text-xs text-gray-500">
                  {currentChild.name} • {gatePresence.gateName} • {gatePresence.busRoute}
                </p>
              </div>
            </div>

            {/* Simulation Controls for testing end-to-end */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-gray-50 p-2.5 rounded-2xl border border-gray-100">
              <span className="text-[10px] font-bold uppercase text-gray-400 px-2 flex items-center gap-1">
                <Radio size={12} className="text-purple-600 animate-pulse" /> Live Gate Simulator:
              </span>
              <div className="grid grid-cols-2 sm:flex items-center gap-1.5">
                <button
                  onClick={() => handleSimulateGateEvent('GATE_IN')}
                  disabled={isSimulatingGate}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    gatePresence.status === 'INSIDE_CAMPUS'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                  title="Simulate safe gate RFID tap"
                >
                  <CheckCircle2 size={13} />
                  <span>Gate In (Safe)</span>
                </button>
                <button
                  onClick={() => handleSimulateGateEvent('LATE_ENTRY')}
                  disabled={isSimulatingGate}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    gatePresence.status === 'LATE_ENTRY'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                  title="Simulate late entry at 08:25 AM"
                >
                  <Clock size={13} />
                  <span>Late Entry</span>
                </button>
                <button
                  onClick={() => handleSimulateGateEvent('ABSENT_ALERT')}
                  disabled={isSimulatingGate}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    gatePresence.status === 'ABSENT'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                  title="Simulate absent roll call alert"
                >
                  <AlertTriangle size={13} />
                  <span>Absent Alert</span>
                </button>
                <button
                  onClick={() => handleSimulateGateEvent('GATE_OUT')}
                  disabled={isSimulatingGate}
                  className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 ${
                    gatePresence.status === 'DEPARTED'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-gray-700 hover:bg-gray-100 border'
                  }`}
                  title="Simulate afternoon departure"
                >
                  <Bus size={13} />
                  <span>Gate Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* Transit Timeline Step Tracker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                step: '1. Bus Boarding',
                time: '07:15 AM',
                desc: 'Bus Route 4 (Tagore Garden)',
                active: true,
                status: 'COMPLETED',
                icon: Bus,
              },
              {
                step: '2. RFID Gate Tap',
                time: gatePresence.checkInTime || (gatePresence.status === 'ABSENT' ? 'Not Checked In' : '07:52 AM'),
                desc: gatePresence.status === 'ABSENT' ? 'No Gate Scan Detected' : 'Gate 1 RFID Verified',
                active: gatePresence.status !== 'ABSENT',
                status: gatePresence.status === 'ABSENT' ? 'FAILED' : 'COMPLETED',
                icon: Shield,
              },
              {
                step: '3. Classroom Roll Call',
                time: '08:00 AM',
                desc: gatePresence.status === 'ABSENT' ? 'Marked ABSENT in Room 101' : gatePresence.status === 'LATE_ENTRY' ? 'Marked LATE (25m Delay)' : 'Marked PRESENT in Room 101',
                active: true,
                status: gatePresence.status === 'ABSENT' ? 'FAILED' : gatePresence.status === 'LATE_ENTRY' ? 'WARNING' : 'COMPLETED',
                icon: CheckSquare,
              },
              {
                step: '4. Campus Departure',
                time: gatePresence.checkOutTime || '02:15 PM (Upcoming)',
                desc: gatePresence.status === 'DEPARTED' ? 'Exited via Gate 2 & Boarded Bus' : 'School Closes at 02:15 PM',
                active: gatePresence.status === 'DEPARTED',
                status: gatePresence.status === 'DEPARTED' ? 'COMPLETED' : 'PENDING',
                icon: Bus,
              },
            ].map((node, i) => {
              const NodeIcon = node.icon;
              return (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border transition ${
                    node.status === 'FAILED'
                      ? 'bg-rose-50 border-rose-200'
                      : node.status === 'WARNING'
                      ? 'bg-amber-50 border-amber-200'
                      : node.status === 'COMPLETED'
                      ? 'bg-emerald-50/70 border-emerald-100'
                      : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-900">{node.step}</span>
                    <NodeIcon
                      size={15}
                      className={
                        node.status === 'FAILED'
                          ? 'text-rose-600'
                          : node.status === 'WARNING'
                          ? 'text-amber-600'
                          : node.status === 'COMPLETED'
                          ? 'text-emerald-600'
                          : 'text-gray-400'
                      }
                    />
                  </div>
                  <p className="text-xs font-black text-gray-800 mt-1 font-mono">{node.time}</p>
                  <p className="text-[11px] text-gray-600 mt-0.5">{node.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Recent Notification Banner */}
          {parentNotifications.length > 0 && (
            <div className="p-3 bg-purple-50/80 border border-purple-100 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <Bell size={16} className="text-purple-600 animate-bounce flex-shrink-0" />
                <div>
                  <span className="font-bold text-purple-950">Latest School Security Alert: </span>
                  <span className="text-purple-800">{parentNotifications[0].title} — {parentNotifications[0].message}</span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-purple-600 font-bold whitespace-nowrap ml-2">
                {parentNotifications[0].time}
              </span>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 3. 360° MULTI-TAB NAVIGATION                                              */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          {[
            { id: 'OVERVIEW', label: '360° Overview', icon: BookOpen },
            { id: 'TIMETABLE', label: 'Class Timetable', icon: Clock },
            { id: 'HOMEWORK', label: 'Homework Monitor', icon: CheckSquare },
            { id: 'EXAMS', label: 'Marks & Report Card', icon: Award },
            { id: 'FEES', label: 'Fee Invoices & Pay', icon: IndianRupee },
            { id: 'ACTIVITIES', label: 'Clubs & Achievements', icon: Trophy },
            { id: 'STUDY_FOCUS', label: 'Self-Study & Focus Log', icon: Flame },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-100'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* TAB CONTENT: 360° OVERVIEW                                                */}
        {/* ========================================================================= */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Timetable Card */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={18} className="text-purple-600" />
                    <span>Today&apos;s Class Schedule ({currentChild.class})</span>
                  </h3>
                  <button onClick={() => setActiveTab('TIMETABLE')} className="text-xs font-bold text-purple-600 hover:underline">
                    Full Week
                  </button>
                </div>

                <div className="space-y-2.5">
                  {[
                    { period: 1, time: '08:00 - 08:45', sub: 'Mathematics', teacher: 'Mr. Arun Sharma', room: 'Room 101' },
                    { period: 2, time: '08:45 - 09:30', sub: 'English Literature', teacher: 'Mrs. Priya Singh', room: 'Room 101' },
                    { period: 3, time: '09:30 - 10:15', sub: 'Science (Physics)', teacher: 'Mr. Deepak Verma', room: 'Physics Lab' },
                    { period: 4, time: '10:45 - 11:30', sub: 'Hindi', teacher: 'Mrs. Sunita Gupta', room: 'Room 101' },
                    { period: 5, time: '11:30 - 12:15', sub: 'Social Studies', teacher: 'Mrs. Kavita Mishra', room: 'Room 101' },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-xl bg-purple-100 text-purple-800 text-xs font-black flex items-center justify-center">
                          {p.period}
                        </span>
                        <div>
                          <p className="text-xs font-bold text-gray-900">{p.sub}</p>
                          <p className="text-[11px] text-gray-500">{p.teacher} • {p.room}</p>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono text-gray-400 font-semibold">{p.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Milestones & Principal Meetings */}
              <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
                <div>
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Calendar size={18} className="text-amber-500" />
                    <span>Academic Calendar & PTM Dates</span>
                  </h3>

                  <div className="space-y-3">
                    {[
                      { date: 'Sep 28', title: '1-to-1 Principal Meeting (Dr. Mukherjee)', type: 'LEADERSHIP', desc: '10:00 AM • Executive Office' },
                      { date: 'Oct 15', title: 'Half-Yearly Examination Commences', type: 'EXAM', desc: 'Syllabus covering Chapters 1 to 7' },
                      { date: 'Oct 20', title: 'Diwali & Dussehra Festive Vacation', type: 'HOLIDAY', desc: 'School reopens on Oct 30' },
                      { date: 'Nov 05', title: 'Term 1 Parent-Teacher Conference', type: 'PTM', desc: 'Report Card distribution & teacher feedback' },
                    ].map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-700 flex flex-col items-center justify-center flex-shrink-0">
                          <span className="text-[9px] uppercase font-bold text-purple-600">{item.date.split(' ')[0]}</span>
                          <span className="text-sm font-black text-purple-900">{item.date.split(' ')[1]}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-900 truncate">{item.title}</p>
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-white border text-gray-600">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Need specific counseling for your child?</span>
                  <Link
                    href="/meetings"
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-600 hover:text-purple-700"
                  >
                    <span>Teacher & Principal Connect</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>

            {/* Recent Circulars Noticeboard Preview */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Bell size={18} className="text-rose-500" />
                  <span>Important Notices & School Announcements</span>
                </h3>
                <Link href="/notices" className="text-xs font-bold text-purple-600 hover:underline">
                  View Noticeboard
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { title: 'CBSE Class 10 Board Registration Final Checklist', date: '2 days ago', cat: 'EXAM', urgent: true },
                  { title: 'Annual Sports Meet & Inter-House Trials', date: '5 days ago', cat: 'EVENT', urgent: false },
                  { title: 'Second Quarter Tuition Fee Reminder', date: '1 week ago', cat: 'FEE', urgent: false },
                ].map((n, i) => (
                  <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {n.cat}
                        </span>
                        {n.urgent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-700">
                            Urgent
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-gray-800 mt-2 leading-snug">{n.title}</h4>
                    </div>
                    <p className="text-[10px] text-gray-400">{n.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: TIMETABLE                                                    */}
        {/* ========================================================================= */}
        {activeTab === 'TIMETABLE' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Weekly Academic Timetable ({currentChild.class})</h3>
                <p className="text-xs text-gray-500">6 periods daily with dedicated laboratories and sports activities</p>
              </div>
              <button
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition"
              >
                <Printer size={14} />
                <span>Print Timetable</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-purple-50/70 text-purple-950 border-b border-purple-100">
                    <th className="p-3 font-bold rounded-l-xl">Day</th>
                    <th className="p-3 font-bold">Period 1 (08:00)</th>
                    <th className="p-3 font-bold">Period 2 (08:45)</th>
                    <th className="p-3 font-bold">Period 3 (09:30)</th>
                    <th className="p-3 font-bold">Period 4 (10:45)</th>
                    <th className="p-3 font-bold">Period 5 (11:30)</th>
                    <th className="p-3 font-bold rounded-r-xl">Period 6 (12:15)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {[
                    { day: 'Monday', p: ['Mathematics', 'English', 'Science Lab', 'Hindi', 'Social Science', 'Computer'] },
                    { day: 'Tuesday', p: ['Science', 'Mathematics', 'English', 'Social Science', 'Physical Ed', 'Hindi'] },
                    { day: 'Wednesday', p: ['Mathematics', 'Computer Lab', 'Biology', 'English', 'Hindi', 'Art & Craft'] },
                    { day: 'Thursday', p: ['English', 'Mathematics', 'Chemistry', 'Social Science', 'Library', 'Science'] },
                    { day: 'Friday', p: ['Physics', 'Mathematics', 'Social Science', 'English', 'Robotics Club', 'Moral Science'] },
                  ].map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{row.day}</td>
                      {row.p.map((subject, idx) => (
                        <td key={idx} className="p-3">
                          <span className="p-1.5 rounded-lg bg-gray-100/70 border border-gray-100 inline-block text-[11px] font-semibold text-gray-800">
                            {subject}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: HOMEWORK MONITOR                                             */}
        {/* ========================================================================= */}
        {activeTab === 'HOMEWORK' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Assigned Homework & Submission Status</h3>
                <p className="text-xs text-gray-500">Track homework tasks, teacher evaluation, and feedback</p>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                2 Submitted • 1 In Progress
              </span>
            </div>

            <div className="space-y-3">
              {[
                {
                  subject: 'Mathematics',
                  title: 'Quadratic Equations Practice Set 4.2',
                  due: 'Today, 05:00 PM',
                  status: 'SUBMITTED',
                  teacher: 'Mr. Arun Sharma',
                  remarks: 'Checked. Excellent work on derivation questions.',
                  grade: 'A+'
                },
                {
                  subject: 'Science (Physics)',
                  title: 'Ray Diagrams for Concave & Convex Mirrors',
                  due: 'Tomorrow, 08:00 AM',
                  status: 'PENDING',
                  teacher: 'Mr. Deepak Verma',
                  remarks: 'Pending student upload.',
                  grade: 'Pending'
                },
                {
                  subject: 'English',
                  title: 'Formal Letter to Municipal Commissioner',
                  due: 'Sep 23, 2026',
                  status: 'CHECKED',
                  teacher: 'Mrs. Priya Singh',
                  remarks: 'Verified. Great vocabulary and formal tone.',
                  grade: 'A'
                },
              ].map((hw, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                        {hw.subject}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        hw.status === 'SUBMITTED' ? 'bg-blue-100 text-blue-800' :
                        hw.status === 'CHECKED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {hw.status}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900">{hw.title}</h4>
                    <p className="text-xs text-gray-500">Teacher: {hw.teacher} • Due: {hw.due}</p>
                    <p className="text-xs text-emerald-700 bg-white p-2 rounded-xl border border-gray-100 inline-block">
                      <strong>Teacher Feedback:</strong> {hw.remarks} (Grade: {hw.grade})
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    <button
                      onClick={() => toast.success(`Viewing submission attachment for ${hw.title}`)}
                      className="px-4 py-2 bg-white hover:bg-purple-600 hover:text-white border border-gray-200 text-purple-700 rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      View Submission
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: EXAMS & REPORT CARD                                          */}
        {/* ========================================================================= */}
        {activeTab === 'EXAMS' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Term Examination Marksheet & Report Card</h3>
                <p className="text-xs text-gray-500">Academic Year 2025-26 • Standard 10th Cumulative Assessment</p>
              </div>
              <button
                onClick={() => toast.success('Official Term Report Card PDF generated')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-purple-600/20"
              >
                <Download size={14} />
                <span>Download Report Card PDF</span>
              </button>
            </div>

            {/* Marks Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="bg-purple-50/70 text-purple-950 border-b border-purple-100">
                    <th className="p-3 font-bold rounded-l-xl">Subject</th>
                    <th className="p-3 font-bold">Max Marks</th>
                    <th className="p-3 font-bold">Marks Obtained</th>
                    <th className="p-3 font-bold">Percentage</th>
                    <th className="p-3 font-bold rounded-r-xl">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                  {[
                    { sub: 'Mathematics', max: 100, obt: 92, grade: 'A1' },
                    { sub: 'Science & Practical', max: 100, obt: 88, grade: 'A2' },
                    { sub: 'English Language', max: 100, obt: 85, grade: 'A2' },
                    { sub: 'Hindi', max: 100, obt: 90, grade: 'A1' },
                    { sub: 'Social Science', max: 100, obt: 87, grade: 'A2' },
                    { sub: 'Computer Science (Code 402)', max: 100, obt: 95, grade: 'A1' },
                  ].map((m, i) => (
                    <tr key={i} className="hover:bg-gray-50/50">
                      <td className="p-3 font-bold text-gray-900">{m.sub}</td>
                      <td className="p-3">{m.max}</td>
                      <td className="p-3 font-bold text-purple-700">{m.obt}</td>
                      <td className="p-3">{m.obt}%</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-black text-[10px]">
                          {m.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 font-black text-gray-900 border-t-2 border-gray-200">
                    <td className="p-3">Total Cumulative</td>
                    <td className="p-3">600</td>
                    <td className="p-3 text-purple-700">537</td>
                    <td className="p-3">89.5%</td>
                    <td className="p-3 text-emerald-700">Grade A1 (Passed)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: FEES LEDGER & INSTANT PAYMENT                                */}
        {/* ========================================================================= */}
        {activeTab === 'FEES' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Student Fee Account & Dual-Payer Gateway</h3>
                <p className="text-xs text-gray-500">
                  School fees can be settled directly by parents or by students from their respective portals.
                </p>
              </div>

              {!feeData.isPaid ? (
                <button
                  onClick={() => setIsParentFeeModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <CreditCard size={15} />
                  <span>Pay School Fees (₹3,000)</span>
                </button>
              ) : (
                <span className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-800 text-xs font-black inline-flex items-center gap-1.5">
                  <CheckCircle2 size={16} /> All Dues Cleared
                </span>
              )}
            </div>

            {/* Payer Attribution Status Banner */}
            {feeData.isPaid ? (
              <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-emerald-950">
                        Term 2 Fee Settled
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-white border border-emerald-300 text-emerald-800">
                        {feeData.paidBy === 'STUDENT' ? '👤 Paid by Student' : '👨‍👩‍👦 Paid by Parent'}
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      Payer: {feeData.paidByName || (feeData.paidBy === 'STUDENT' ? 'Aarav Sharma (Student)' : `${parentName} (Parent)`)} • Mode: {feeData.paymentMode || 'UPI'} • Receipt #{feeData.receiptNo || 'REC-2026-1004'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveReceiptModal({
                    receiptNo: feeData.receiptNo || 'REC-2026-1004',
                    studentName: currentChild.name,
                    studentClass: currentChild.class,
                    admissionNo: currentChild.admissionNo,
                    amount: feeData.amount || 3000,
                    paidAmount: feeData.amount || 3000,
                    paymentMode: feeData.paymentMode || 'UPI',
                    paymentDate: feeData.paidDate || 'Today',
                    payerType: feeData.paidBy || 'STUDENT',
                    payerName: feeData.paidByName || (feeData.paidBy === 'STUDENT' ? 'Aarav Sharma (Student)' : `${parentName} (Parent)`),
                    transactionId: feeData.transactionId || 'TXN-UPI-992381',
                    month: 'October',
                    academicYear: '2026-2027',
                    breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                  })}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Receipt size={14} />
                  <span>Download Official Receipt</span>
                </button>
              </div>
            ) : (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-amber-950">
                      Term 2 Fee Due: ₹3,000.00
                    </p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Due Date: October 15, 2026. You can pay here as a parent, or your child can pay via their Student Portal.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsParentFeeModalOpen(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <CreditCard size={14} />
                  <span>Pay ₹3,000 Now</span>
                </button>
              </div>
            )}

            {/* Financial Summary 3-Col Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Annual Liability</p>
                <p className="text-xl font-black text-gray-900 mt-1">{formatCurrency(36000)}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">4 Quarters • Class 10-A</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                <p className="text-xs text-emerald-800 font-semibold uppercase">Total Amount Paid</p>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {feeData.isPaid ? formatCurrency(36000) : formatCurrency(33000)}
                </p>
                <p className="text-[10px] text-emerald-600 mt-0.5">
                  {feeData.isPaid ? 'All Term Dues Cleared' : 'Term 1 Settled • Term 2 Pending'}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                <p className="text-xs text-rose-800 font-semibold uppercase">Current Balance Due</p>
                <p className="text-xl font-black text-rose-600 mt-1">
                  {feeData.isPaid ? formatCurrency(0) : formatCurrency(3000)}
                </p>
                <p className="text-[10px] text-rose-500 mt-0.5">
                  {feeData.isPaid ? 'No Outstanding Dues' : 'Payable by Student or Parent'}
                </p>
              </div>
            </div>

            {/* Detailed Itemized Fee Breakdown */}
            <div className="border border-gray-100 rounded-2xl p-4 bg-gray-50/50 space-y-2 text-xs">
              <h4 className="font-bold text-gray-800 uppercase text-[11px]">Term 2 Itemized Fee Schedule</h4>
              <div className="divide-y divide-gray-200">
                <div className="py-2 flex justify-between">
                  <span className="text-gray-600">Tuition & Faculty Instruction (Q2)</span>
                  <span className="font-mono font-bold text-gray-900">₹2,000.00</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-600">Science & Computer Lab Practical Consumables</span>
                  <span className="font-mono font-bold text-gray-900">₹500.00</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-600">Digital Smart Class & Interactive LMS Portal</span>
                  <span className="font-mono font-bold text-gray-900">₹300.00</span>
                </div>
                <div className="py-2 flex justify-between">
                  <span className="text-gray-600">Sports & Annual Co-Curricular Assessment</span>
                  <span className="font-mono font-bold text-gray-900">₹200.00</span>
                </div>
                <div className="py-2.5 flex justify-between font-black text-sm">
                  <span className="text-gray-900">Total Net Term Fee</span>
                  <span className="text-purple-700 font-mono">₹3,000.00</span>
                </div>
              </div>
            </div>

            {/* Recent Receipts List with Payer Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase">Recent Payment Receipts</h4>
              <div className="space-y-2">
                {/* Term 2 Receipt if paid */}
                {feeData.isPaid && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{feeData.receiptNo || 'REC-2026-1004'}</span>
                        <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-bold text-[10px]">PAID</span>
                        <span className="text-[10px] font-bold text-emerald-800">
                          {feeData.paidBy === 'STUDENT' ? '👤 Paid by Student' : '👨‍👩‍👦 Paid by Parent'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-[11px] mt-0.5">October 2026 (Term 2) • {feeData.paidDate || 'Today'} • via {feeData.paymentMode || 'UPI'}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-black text-emerald-800 font-mono text-sm">{formatCurrency(feeData.amount || 3000)}</span>
                      <button
                        onClick={() => setActiveReceiptModal({
                          receiptNo: feeData.receiptNo || 'REC-2026-1004',
                          studentName: currentChild.name,
                          studentClass: currentChild.class,
                          admissionNo: currentChild.admissionNo,
                          amount: feeData.amount || 3000,
                          paidAmount: feeData.amount || 3000,
                          paymentMode: feeData.paymentMode || 'UPI',
                          paymentDate: feeData.paidDate || 'Today',
                          payerType: feeData.paidBy || 'STUDENT',
                          payerName: feeData.paidByName || (feeData.paidBy === 'STUDENT' ? 'Aarav Sharma (Student)' : `${parentName} (Parent)`),
                          transactionId: feeData.transactionId || 'TXN-UPI-992381',
                          month: 'October',
                          academicYear: '2026-2027',
                          breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                        })}
                        className="px-3 py-1 bg-white border border-emerald-300 rounded-lg text-emerald-700 font-bold hover:bg-emerald-100 transition shadow-xs"
                      >
                        Receipt PDF
                      </button>
                    </div>
                  </div>
                )}

                {/* Term 1 Receipt */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100 text-xs gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">REC-2026-1001</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">PAID</span>
                      <span className="text-[10px] font-bold text-purple-700">👨‍👩‍👦 Paid by Parent (Rajesh Sharma)</span>
                    </div>
                    <p className="text-gray-500 text-[11px] mt-0.5">September 2026 (Term 1) • Sep 10, 2026 • via UPI</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-gray-900 font-mono text-sm">{formatCurrency(3000)}</span>
                    <button
                      onClick={() => setActiveReceiptModal({
                        receiptNo: 'REC-2026-1001',
                        studentName: currentChild.name,
                        studentClass: currentChild.class,
                        admissionNo: currentChild.admissionNo,
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
                      className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-purple-700 font-bold hover:bg-purple-50 transition"
                    >
                      Receipt PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: CLUBS & ACHIEVEMENTS                                         */}
        {/* ========================================================================= */}
        {activeTab === 'ACTIVITIES' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">Child Extracurricular Clubs & Badges</h3>
                <p className="text-xs text-gray-500">Holistic development beyond academics</p>
              </div>
              <Link href="/activities" className="text-xs font-bold text-purple-600 hover:underline">
                Explore All Clubs
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { name: 'Robotics & AI Innovation Lab', badge: '🤖 Junior AI Innovator', role: 'Team Lead', mentor: 'Mr. Amit Yadav' },
                { name: 'Model UN & Debate Society', badge: '🎙️ Distinguished Orator', role: 'Active Member', mentor: 'Mrs. Priya Singh' },
                { name: 'Grandmasters Chess Academy', badge: '♟️ Chess Tactician', role: 'Board 1 Player', mentor: 'Mr. Arun Sharma' },
              ].map((c, i) => (
                <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2">
                  <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {c.badge}
                  </span>
                  <h4 className="text-xs font-black text-gray-900 mt-2">{c.name}</h4>
                  <p className="text-[11px] text-gray-500">Role: {c.role} • Mentor: {c.mentor}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB CONTENT: SELF-STUDY & POMODORO LOG (PARENT 360 VISIBILITY)            */}
        {/* ========================================================================= */}
        {activeTab === 'STUDY_FOCUS' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                    Self-Study Discipline Monitor
                  </span>
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <Flame size={14} className="fill-amber-500" />
                    <span>🔥 {currentChild.name}&apos;s Active Study Streak: 4 Days</span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-1">{currentChild.name}&apos;s Revision & Focus Log</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Full visibility into self-study hours, subject distribution, and completed Pomodoro sprints
                </p>
              </div>

              <Link
                href="/pomodoro"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-md shadow-purple-600/30"
              >
                <span>View Full Focus Studio</span>
                <ExternalLink size={13} />
              </Link>
            </div>

            {/* Top Cards for Parent */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Today&apos;s Focus Revision</p>
                <p className="text-2xl font-black text-purple-700 mt-1">{totalMinutesStudiedToday} Mins</p>
                <p className="text-[11px] text-gray-500 mt-0.5">~{(totalMinutesStudiedToday / 60).toFixed(1)} Hours focused self-study</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Recorded Revision Sprints</p>
                <p className="text-2xl font-black text-emerald-600 mt-1">{studyHistory.length} Sessions</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Consistent daily study habit</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                <p className="text-xs text-gray-400 font-bold uppercase">Daily Goal Attainment</p>
                <p className="text-2xl font-black text-gray-900 mt-1">
                  {Math.min(100, Math.round((totalMinutesStudiedToday / 100) * 100))}%
                </p>
                <div className="w-full bg-gray-100 rounded-full h-2 mt-2 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalMinutesStudiedToday / 100) * 100))}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Session History List */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-4">
              <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-purple-600" />
                <span>Recent Self-Study Sprints Completed by {currentChild.name}</span>
              </h4>

              <div className="space-y-3">
                {studyHistory.map((s, idx) => (
                  <div
                    key={s.id || idx}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50/70 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                          {s.subject}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          ✓ {s.status === 'COMPLETED' ? 'Completed Sprint' : 'Logged Early'}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">{s.completedAt}</span>
                      </div>
                      <h5 className="font-bold text-gray-900">{s.taskTitle}</h5>
                      {s.notes && (
                        <p className="text-[11px] text-gray-600 italic bg-white px-2.5 py-1 rounded-lg border border-gray-100 mt-1">
                          📝 Student Reflection: {s.notes}
                        </p>
                      )}
                    </div>

                    <span className="font-black text-purple-700 bg-white px-3 py-1.5 rounded-xl border border-gray-200">
                      {s.durationMinutes}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: PARENT FEE CHECKOUT GATEWAY                                        */}
        {/* ========================================================================= */}
        {isParentFeeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">Parent Fee Settlement Portal</h3>
                    <p className="text-xs text-gray-500">Ward: {currentChild.name} • {currentChild.class}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsParentFeeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Order Amount Banner */}
              <div className="p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Net Term Fee</span>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">₹3,000.00</p>
                  <p className="text-[11px] text-gray-600">Payer: {parentName} (Parent) • ADM2026100</p>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-xl shadow-sm">
                  Term 2 (2026-27)
                </span>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Select Preferred Payment Mode:</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CARD', label: 'Credit / Debit Card', icon: CreditCard },
                    { id: 'UPI', label: 'UPI / QR Scan', icon: QrCode },
                    { id: 'NETBANKING', label: 'Net Banking', icon: Shield },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setParentPaymentMethod(m.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                          parentPaymentMethod === m.id
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

              {/* Card Form */}
              {parentPaymentMethod === 'CARD' && (
                <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="•••• •••• •••• ••••"
                      defaultValue="5241 8912 4310 9924"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Valid Thru</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="11/28"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">CVV / CVC</label>
                      <input
                        type="password"
                        placeholder="•••"
                        defaultValue="419"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Cardholder Full Name</label>
                    <input
                      type="text"
                      defaultValue={parentName}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* UPI Tab */}
              {parentPaymentMethod === 'UPI' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
                  <p className="text-xs font-bold text-gray-800">Scan & Pay ₹3,000 via UPI</p>
                  <div className="mx-auto w-36 h-36 bg-white p-3 rounded-2xl border border-gray-300 shadow-inner flex flex-col items-center justify-center">
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
                      <rect x="35" y="35" width="30" height="30" fill="#059669" rx="4" />
                      <text x="50" y="54" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">₹</text>
                      <rect x="70" y="70" width="20" height="20" fill="#1e1b4b" />
                    </svg>
                  </div>
                  <p className="font-mono text-xs font-bold text-gray-700">UPI ID: vidyalayaschool@icici</p>
                </div>
              )}

              {/* Net Banking */}
              {parentPaymentMethod === 'NETBANKING' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Select Bank:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Bank of Baroda'].map(b => (
                      <div key={b} className="p-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 flex items-center gap-2 cursor-pointer hover:border-purple-400">
                        <input type="radio" name="parent_bank_select" defaultChecked={b === 'HDFC Bank'} />
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-purple-50/80 border border-purple-200 rounded-2xl flex items-center gap-2 text-xs text-purple-900">
                <Shield size={16} className="text-purple-600 flex-shrink-0" />
                <span>
                  Recorded as <strong>Paid by Parent ({parentName})</strong> and immediately reflected on both your child’s student dashboard and the school accounts portal.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsParentFeeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleParentPayFee}
                  disabled={isProcessingParentFee}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessingParentFee ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Authorizing Payment...</span>
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
              {/* Receipt Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black text-xl shadow-md">
                    🏫
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900">Vidyalaya Senior Secondary School</h3>
                    <p className="text-xs text-gray-500">Affiliation No: CBSE/AFF/2130098 • New Delhi</p>
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

              {/* Receipt Metadata Grid */}
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
                  <p className="font-bold text-gray-800">{activeReceiptModal.studentClass} • Roll 1</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Admission No</span>
                  <p className="font-mono font-bold text-gray-800">{activeReceiptModal.admissionNo}</p>
                </div>
              </div>

              {/* Payer Attribution Badge */}
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

              {/* Items Breakdown Table */}
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

              {/* Verification & Digital Signature */}
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

              {/* Actions */}
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
