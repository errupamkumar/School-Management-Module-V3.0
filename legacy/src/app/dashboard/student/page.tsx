'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  GraduationCap,
  CheckSquare,
  BookOpen,
  Award,
  Clock,
  Calendar,
  Zap,
  Trophy,
  Flame,
  Bell,
  Upload,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  FileText,
  Video,
  ChevronRight,
  ExternalLink,
  HelpCircle,
  Send,
  Play,
  Pause,
  RotateCcw,
  Target,
  Sliders,
  Compass,
  Download,
  Lightbulb,
  Check,
  Plus,
  MessageCircle,
  X,
  AlertCircle,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Trash2,
  Volume2,
  VolumeX,
  Star,
  Search,
  Filter,
  FileDown,
  IndianRupee,
  CreditCard,
  Receipt,
  QrCode,
  Shield,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface StudentDoubt {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  subject: string;
  teacherName: string;
  chapter: string;
  question: string;
  status: 'RESOLVED' | 'PENDING';
  teacherReply?: string;
  repliedAt?: string;
  urgency: 'HIGH' | 'NORMAL';
  createdAt: string;
}

interface PomodoroSession {
  id: string;
  studentId: string;
  subject: string;
  taskTitle: string;
  durationMinutes: number;
  plannedMinutes?: number;
  completedAt: string;
  timestamp?: number;
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  status: 'COMPLETED' | 'EARLY_STOP';
  notes?: string;
  rating?: number;
}

export default function StudentDashboard() {
  const { data: session } = useSession();
  const studentName = session?.user?.name || 'Aarav Sharma';

  // Navigation tab for the student's personal command center
  const [activeTab, setActiveTab] = useState<'SCHEDULE_HOMEWORK' | 'ASK_TEACHER' | 'ATTENDANCE_CALC' | 'STUDY_FOCUS' | 'TARGET_SIMULATOR' | 'FEES_PAYMENT'>('SCHEDULE_HOMEWORK');

  // Student Online Fee Payment State
  const [studentFeeStatus, setStudentFeeStatus] = useState<{
    isPaid: boolean;
    paidBy?: 'STUDENT' | 'PARENT' | 'ADMIN';
    paidByName?: string;
    paidDate?: string;
    receiptNo?: string;
    paymentMode?: string;
    amount: number;
  }>({
    isPaid: false,
    amount: 3000,
  });
  const [isStudentFeeModalOpen, setIsStudentFeeModalOpen] = useState(false);
  const [studentPaymentMethod, setStudentPaymentMethod] = useState<'UPI' | 'CARD' | 'NETBANKING'>('UPI');
  const [isProcessingFee, setIsProcessingFee] = useState(false);
  const [activeReceiptModal, setActiveReceiptModal] = useState<any>(null);

  // 1. Homework Submission Modal State
  const [selectedHw, setSelectedHw] = useState<any>(null);
  const [submissionNotes, setSubmissionNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 2. Ask Teacher a Doubt State
  const [doubts, setDoubts] = useState<StudentDoubt[]>([]);
  const [isAskDoubtModalOpen, setIsAskDoubtModalOpen] = useState(false);
  const [doubtForm, setDoubtForm] = useState({
    subject: 'Mathematics',
    teacherName: 'Mr. Arun Sharma',
    chapter: '',
    question: '',
    urgency: 'NORMAL' as const,
  });

  // 3. Smart Attendance Cushion Simulator State
  // Real numbers: 115 attended out of 125 total school days = 92%
  const [extraLeavesPlanned, setExtraLeavesPlanned] = useState(0);
  const totalDays = 125;
  const attendedDays = 115;
  const calculatedPercent = (((attendedDays - extraLeavesPlanned) / totalDays) * 100).toFixed(1);
  const safeLeavesRemaining = Math.max(0, Math.floor(attendedDays - 0.75 * totalDays));

  // 4. Pomodoro Study Timer & History State
  const POMODORO_STORAGE_KEY = 'vidyalaya_student_pomodoro_history';
  const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [currentStudySubject, setCurrentStudySubject] = useState('Mathematics');
  const [currentStudyTask, setCurrentStudyTask] = useState('Quadratic Equations Problem Solving');
  const [isZenOverlayOpen, setIsZenOverlayOpen] = useState(false);
  const [isMiniWidgetMinimized, setIsMiniWidgetMinimized] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'OFF' | 'RAIN' | 'CAFE' | 'LIBRARY'>('OFF');
  const [isStopConfirmModalOpen, setIsStopConfirmModalOpen] = useState(false);

  // Reflection modal state when session completes
  const [reflectionModalData, setReflectionModalData] = useState<{
    isOpen: boolean;
    mins: number;
    subject: string;
    task: string;
    notes: string;
    rating: number;
    status: 'COMPLETED' | 'EARLY_STOP';
  } | null>(null);

  // Filter & Search states for Study History
  const [historySubjectFilter, setHistorySubjectFilter] = useState('ALL');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const [pomodoroHistory, setPomodoroHistory] = useState<PomodoroSession[]>([
    {
      id: 'pomo-1',
      studentId: 'student-1',
      subject: 'Mathematics',
      taskTitle: 'Quadratic Equations Exercise 4.2 Derivations',
      durationMinutes: 25,
      plannedMinutes: 25,
      completedAt: 'Today, 08:30 PM',
      timestamp: Date.now() - 2 * 3600 * 1000,
      mode: 'FOCUS',
      status: 'COMPLETED',
      notes: 'Mastered finding roots by factorization & discriminant method',
      rating: 5,
    },
    {
      id: 'pomo-2',
      studentId: 'student-1',
      subject: 'Science (Physics)',
      taskTitle: 'Ray diagrams for concave mirror & Cartesian sign conventions',
      durationMinutes: 25,
      plannedMinutes: 25,
      completedAt: 'Today, 07:45 PM',
      timestamp: Date.now() - 3 * 3600 * 1000,
      mode: 'FOCUS',
      status: 'COMPLETED',
      notes: 'Practiced 6 mirror cases; remembered virtual image focal point rules',
      rating: 4,
    },
    {
      id: 'pomo-3',
      studentId: 'student-1',
      subject: 'Social Science',
      taskTitle: 'Nationalism in Europe timeline review & treaty dates',
      durationMinutes: 25,
      plannedMinutes: 25,
      completedAt: 'Today, 06:15 PM',
      timestamp: Date.now() - 4 * 3600 * 1000,
      mode: 'FOCUS',
      status: 'COMPLETED',
      notes: 'Memorized Treaty of Vienna (1815) & Frankfurt Parliament dates',
      rating: 5,
    },
    {
      id: 'pomo-4',
      studentId: 'student-1',
      subject: 'Computer Science',
      taskTitle: 'Python loops and binary search logic revision',
      durationMinutes: 20,
      plannedMinutes: 25,
      completedAt: 'Yesterday, 09:00 PM',
      timestamp: Date.now() - 24 * 3600 * 1000,
      mode: 'FOCUS',
      status: 'EARLY_STOP',
      notes: 'Finished early; binary search code tested and working',
      rating: 4,
    },
  ]);

  // Persistent localStorage Loader + API Synchronization
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPomodoroHistory(parsed);
        }
      }
    } catch (e) {
      console.error('Failed reading pomodoro history from localStorage', e);
    }

    // Sync with API
    fetch('/api/pomodoro')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const saved = localStorage.getItem(POMODORO_STORAGE_KEY);
          if (!saved) {
            setPomodoroHistory(data.data);
            try {
              localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(data.data));
            } catch (err) {}
          }
        }
      })
      .catch(() => {});
  }, []);

  // Keyboard shortcut: Escape to exit Zen Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isZenOverlayOpen) {
        setIsZenOverlayOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZenOverlayOpen]);

  const updateAndPersistHistory = (updater: (prev: PomodoroSession[]) => PomodoroSession[]) => {
    setPomodoroHistory(prev => {
      const next = updater(prev);
      try {
        localStorage.setItem(POMODORO_STORAGE_KEY, JSON.stringify(next));
      } catch (e) {
        console.error('Error saving pomodoro history to localStorage', e);
      }
      return next;
    });
  };

  const logPomodoroSession = (
    status: 'COMPLETED' | 'EARLY_STOP' = 'COMPLETED',
    customDuration?: number,
    notes?: string,
    rating?: number
  ) => {
    const duration = customDuration ?? (pomodoroMode === 'FOCUS' ? pomodoroDurationMinutes : 5);
    const d = new Date();
    const timeStr = `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newSession: PomodoroSession = {
      id: `pomo-${Date.now()}`,
      studentId: 'student-1',
      subject: currentStudySubject,
      taskTitle: currentStudyTask || `${currentStudySubject} Revision Sprint`,
      durationMinutes: Math.max(1, duration),
      plannedMinutes: pomodoroDurationMinutes,
      completedAt: timeStr,
      timestamp: Date.now(),
      mode: pomodoroMode,
      status,
      notes: notes || '',
      rating: rating || 5,
    };

    updateAndPersistHistory(prev => [newSession, ...prev]);

    // Async sync to server API
    fetch('/api/pomodoro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    }).catch(() => {});

    toast.success(`🎯 ${duration}m study sprint saved to your Study History! Great work!`);
  };

  useEffect(() => {
    let interval: any = null;
    if (isPomodoroActive && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds((sec) => sec - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      setIsPomodoroActive(false);
      // Trigger completion reflection modal
      setReflectionModalData({
        isOpen: true,
        mins: pomodoroMode === 'FOCUS' ? pomodoroDurationMinutes : 5,
        subject: currentStudySubject,
        task: currentStudyTask,
        notes: '',
        rating: 5,
        status: 'COMPLETED',
      });
      toast.success(
        pomodoroMode === 'FOCUS'
          ? '🎯 Study sprint complete! Log your reflection and take a break.'
          : '⚡ Break finished! Ready for another focused session?'
      );
    }
    return () => clearInterval(interval);
  }, [isPomodoroActive, pomodoroSeconds, pomodoroMode, pomodoroDurationMinutes, currentStudySubject, currentStudyTask]);

  const togglePomodoro = () => setIsPomodoroActive(!isPomodoroActive);
  const resetPomodoro = () => {
    setIsPomodoroActive(false);
    setPomodoroSeconds(pomodoroMode === 'FOCUS' ? pomodoroDurationMinutes * 60 : 5 * 60);
  };
  const switchPomodoroMode = (mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK') => {
    setPomodoroMode(mode);
    setIsPomodoroActive(false);
    const mins = mode === 'FOCUS' ? pomodoroDurationMinutes : mode === 'SHORT_BREAK' ? 5 : 15;
    setPomodoroSeconds(mins * 60);
  };

  const handleFinishEarly = () => {
    const elapsedSeconds = (pomodoroDurationMinutes * 60) - pomodoroSeconds;
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    setReflectionModalData({
      isOpen: true,
      mins: elapsedMinutes,
      subject: currentStudySubject,
      task: currentStudyTask,
      notes: '',
      rating: 4,
      status: 'EARLY_STOP',
    });
    resetPomodoro();
  };

  const handleCloseTimerClick = () => {
    const elapsedSeconds = (pomodoroDurationMinutes * 60) - pomodoroSeconds;
    if (elapsedSeconds > 10) {
      // Prompt user with options to save elapsed or discard
      setIsStopConfirmModalOpen(true);
    } else {
      resetPomodoro();
      setActiveTab('SCHEDULE_HOMEWORK');
      toast('Returned to Schedule', { icon: '←' });
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    updateAndPersistHistory(prev => prev.filter(p => p.id !== id));
    fetch(`/api/pomodoro?id=${id}`, { method: 'DELETE' }).catch(() => {});
    toast('Session removed from history', { icon: '🗑️' });
  };

  const handleClearHistory = () => {
    if (confirm('Clear all your study history logs? This cannot be undone.')) {
      updateAndPersistHistory(() => []);
      fetch('/api/pomodoro?id=all', { method: 'DELETE' }).catch(() => {});
      toast.success('Study history cleared');
    }
  };

  const handleExportStudyLog = () => {
    if (pomodoroHistory.length === 0) {
      toast.error('No study history to export');
      return;
    }
    const headers = ['Completed At', 'Subject', 'Topic / Goal', 'Duration (Mins)', 'Status', 'Focus Rating', 'Notes'];
    const rows = pomodoroHistory.map(s => [
      `"${s.completedAt}"`,
      `"${s.subject}"`,
      `"${s.taskTitle.replace(/"/g, '""')}"`,
      s.durationMinutes,
      s.status,
      `${s.rating || 5}/5`,
      `"${(s.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Vidyalaya_Study_Log_${studentName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Study history report downloaded as CSV! 📊');
  };

  const totalMinutesStudiedToday = pomodoroHistory
    .filter(p => p.completedAt.includes('Today') || p.completedAt === 'Just now')
    .reduce((sum, p) => sum + p.durationMinutes, 0);

  // Subject distribution map for analytics
  const subjectTimeMap: Record<string, number> = {};
  pomodoroHistory.forEach(s => {
    subjectTimeMap[s.subject] = (subjectTimeMap[s.subject] || 0) + s.durationMinutes;
  });
  const totalLoggedMinutes = Object.values(subjectTimeMap).reduce((a, b) => a + b, 0);

  // Filtered study history
  const filteredHistory = pomodoroHistory.filter(item => {
    if (historySubjectFilter !== 'ALL' && !item.subject.toLowerCase().includes(historySubjectFilter.toLowerCase())) {
      return false;
    }
    if (historySearchQuery.trim()) {
      const q = historySearchQuery.toLowerCase();
      const matchTask = item.taskTitle.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q) || false;
      const matchSub = item.subject.toLowerCase().includes(q);
      if (!matchTask && !matchNotes && !matchSub) return false;
    }
    if (historyTimeFilter === 'TODAY') {
      return item.completedAt.includes('Today') || item.completedAt === 'Just now';
    }
    if (historyTimeFilter === 'YESTERDAY') {
      return item.completedAt.includes('Yesterday');
    }
    return true;
  });

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 5. School Bag / Kit Checklist State
  const [bagItems, setBagItems] = useState([
    { id: 'b1', name: 'Mathematics NCERT & Geometry Box (Compass & Protractor)', checked: true, note: 'Period 1' },
    { id: 'b2', name: 'Physics Practical Notebook & Lab Coat', checked: false, note: 'Period 3 Lab' },
    { id: 'b3', name: 'English Literature Reader (First Flight)', checked: true, note: 'Period 2' },
    { id: 'b4', name: 'Tagore House Football Kit / Sports Shoes', checked: false, note: 'Period 5 Physical Ed' },
    { id: 'b5', name: 'Computer Science USB / Practical File', checked: true, note: 'Period 6 Computer Lab' },
  ]);

  const toggleBagItem = (id: string) => {
    setBagItems(bagItems.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  // 6. Target Exam Score Simulator State
  const [targetGoalPercent, setTargetGoalPercent] = useState(92);

  // Fetch Doubts from API
  const fetchDoubts = async () => {
    try {
      const res = await fetch('/api/doubts');
      const data = await res.json();
      if (data.success) {
        setDoubts(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Live School Fee Status
  const fetchStudentFeeStatus = async () => {
    try {
      const res = await fetch('/api/fees?studentId=student-1');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        // Find latest October / Term 2 fee payment or last paid record
        const term2Payment = data.data.find((p: any) => p.month === 'October' && p.paymentStatus === 'PAID');
        if (term2Payment) {
          setStudentFeeStatus({
            isPaid: true,
            paidBy: term2Payment.payerType,
            paidByName: term2Payment.payerName,
            paidDate: term2Payment.paymentDate,
            receiptNo: term2Payment.receiptNo,
            paymentMode: term2Payment.paymentMode,
            amount: term2Payment.paidAmount,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching student fee status:', err);
    }
  };

  useEffect(() => {
    fetchDoubts();
    fetchStudentFeeStatus();
  }, []);

  const handleStudentPayFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessingFee(true);
    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: 'student-1',
          studentName: studentName || 'Aarav Sharma',
          studentClass: 'Class 10-A',
          admissionNo: 'ADM2026100',
          amount: 3000,
          paidAmount: 3000,
          payerType: 'STUDENT',
          payerName: `${studentName || 'Aarav Sharma'} (Student)`,
          paymentMode: studentPaymentMethod,
          month: 'October',
          remarks: `Student Direct Payment via ${studentPaymentMethod}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`🎉 Fee Paid Successfully! Receipt #${data.data.receiptNo} generated.`);
        setStudentFeeStatus({
          isPaid: true,
          paidBy: 'STUDENT',
          paidByName: `${studentName || 'Aarav Sharma'} (Student)`,
          paidDate: data.data.paymentDate,
          receiptNo: data.data.receiptNo,
          paymentMode: studentPaymentMethod,
          amount: 3000,
        });
        setIsStudentFeeModalOpen(false);
        setActiveReceiptModal(data.data);
      } else {
        toast.error(data.error || 'Payment failed');
      }
    } catch {
      toast.error('Network error during fee payment');
    } finally {
      setIsProcessingFee(false);
    }
  };

  const handleHomeworkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      toast.success(`Assignment for ${selectedHw.subject} submitted successfully to ${selectedHw.teacher}!`);
      setSelectedHw(null);
      setSubmissionNotes('');
    }, 600);
  };

  const handleAskDoubtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!doubtForm.question.trim()) {
      toast.error('Please type your question or doubt.');
      return;
    }

    try {
      const res = await fetch('/api/doubts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doubtForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setIsAskDoubtModalOpen(false);
        setDoubtForm({
          subject: 'Mathematics',
          teacherName: 'Mr. Arun Sharma',
          chapter: '',
          question: '',
          urgency: 'NORMAL',
        });
        fetchDoubts();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Network error submitting doubt.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* ========================================================================= */}
        {/* 1. STUDENT HERO BANNER                                                    */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs font-bold text-cyan-200">
                <Sparkles size={14} className="text-yellow-300" />
                <span>Student Success Hub • Built for Your Daily Learning</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Hello, {studentName}! 👋
              </h1>
              <p className="text-sm text-cyan-100 max-w-xl">
                Class 10-A • Roll No: 1 • Tagore House • ADM2026100.
                Everything you need to conquer your day: live timetable, doubt solver, homework submission, and exam preparation.
              </p>
            </div>

            {/* QUICK STUDENT ACTION BUTTONS */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsAskDoubtModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-black rounded-2xl shadow-lg shadow-emerald-500/25 transition transform active:scale-95"
              >
                <HelpCircle size={16} />
                <span>Ask Teacher a Doubt</span>
              </button>

              <Link
                href="/exam-prep"
                className="inline-flex items-center gap-2 px-5 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black rounded-2xl shadow-lg shadow-orange-500/30 transition transform active:scale-95"
              >
                <Zap size={16} className="fill-white" />
                <span>Exam Prep Booster</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. LIVE PERIOD ALERT & BAG CHECKLIST (WHAT TO BRING TODAY)                */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Live Period Banner */}
          <div className="lg:col-span-2 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 border border-purple-200/80 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-600 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200">Period</span>
                <span className="text-xl font-black">2</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                    Live Right Now
                  </span>
                  <span className="text-xs font-mono font-bold text-gray-500">08:45 AM - 09:30 AM</span>
                </div>
                <h3 className="text-base font-black text-gray-900 mt-1">English Literature (Poetry Analysis)</h3>
                <p className="text-xs text-gray-600">Mrs. Priya Singh • Room 101</p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur p-3.5 rounded-2xl border border-purple-100 sm:text-right min-w-[190px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">Next Up (Period 3)</p>
              <p className="text-xs font-bold text-gray-900 mt-0.5">Science (Physics Optics Lab)</p>
              <p className="text-[11px] text-amber-700 font-semibold mt-0.5">⚠️ Physics Lab Coat & Notebook required!</p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-gray-400">Board Exam Countdown</p>
              <p className="text-2xl font-black text-gray-900 mt-1">12 Days Left</p>
              <p className="text-[11px] text-purple-600 font-bold mt-0.5">Half-Yearly Examination</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
              <Clock size={24} />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. STUDENT COCKPIT TABS                                                   */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-gray-200">
          {[
            { id: 'SCHEDULE_HOMEWORK', label: 'Today’s Timetable & Tasks', icon: Calendar },
            { id: 'ASK_TEACHER', label: `Doubt Solver (${doubts.length})`, icon: HelpCircle },
            { id: 'ATTENDANCE_CALC', label: 'Smart Attendance Buffer (92%)', icon: CheckSquare },
            { id: 'STUDY_FOCUS', label: 'Pomodoro Focus Timer', icon: Clock },
            { id: 'TARGET_SIMULATOR', label: 'Exam Target Simulator', icon: Target },
            {
              id: 'FEES_PAYMENT',
              label: studentFeeStatus.isPaid ? 'Fee Dues (Zero Dues ✓)' : 'School Fee Notice (₹3,000 Due)',
              icon: IndianRupee,
              highlight: !studentFeeStatus.isPaid,
            },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                    : tab.highlight
                    ? 'bg-amber-50 text-amber-800 border border-amber-300 ring-2 ring-amber-400/20'
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
        {/* TAB 1: SCHEDULE, HOMEWORK & BAG CHECKLIST                                 */}
        {/* ========================================================================= */}
        {activeTab === 'SCHEDULE_HOMEWORK' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Timetable & Homework */}
              <div className="lg:col-span-2 space-y-6">
                {/* Timetable Matrix */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <Clock size={18} className="text-purple-600" />
                      <span>Today&apos;s Class Sequence (Class 10-A)</span>
                    </h3>
                    <Link href="/timetable" className="text-xs font-bold text-purple-600 hover:underline">
                      Full Week Timetable
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { period: 1, time: '08:00 - 08:45', sub: 'Mathematics', teacher: 'Mr. Arun Sharma', room: 'Room 101', status: 'COMPLETED' },
                      { period: 2, time: '08:45 - 09:30', sub: 'English Literature', teacher: 'Mrs. Priya Singh', room: 'Room 101', status: 'CURRENT' },
                      { period: 3, time: '09:30 - 10:15', sub: 'Science (Physics Lab)', teacher: 'Mr. Deepak Verma', room: 'Physics Lab', status: 'UPCOMING' },
                      { period: 4, time: '10:45 - 11:30', sub: 'Hindi Vyakaran', teacher: 'Mrs. Sunita Gupta', room: 'Room 101', status: 'UPCOMING' },
                      { period: 5, time: '11:30 - 12:15', sub: 'Social Studies', teacher: 'Mrs. Kavita Mishra', room: 'Room 101', status: 'UPCOMING' },
                      { period: 6, time: '12:15 - 01:00', sub: 'Computer Science', teacher: 'Mr. Amit Yadav', room: 'Computer Lab', status: 'UPCOMING' },
                    ].map(p => (
                      <div
                        key={p.period}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between ${
                          p.status === 'CURRENT'
                            ? 'bg-purple-50 border-purple-300 ring-2 ring-purple-400/20 shadow-xs'
                            : p.status === 'COMPLETED'
                            ? 'bg-gray-50/60 border-gray-100 opacity-70'
                            : 'bg-white border-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-xl text-xs font-black flex items-center justify-center ${
                              p.status === 'CURRENT' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'
                            }`}
                          >
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

                {/* Homework Tracker with One-Click Upload */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <BookOpen size={18} className="text-amber-500" />
                      <span>Assignments & Daily Tasks</span>
                    </h3>
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full">
                      1 Pending • 1 Submitted
                    </span>
                  </div>

                  <div className="space-y-3">
                    {[
                      {
                        id: 'hw-1',
                        subject: 'Science (Physics)',
                        title: 'Ray Diagrams for Concave & Convex Mirrors',
                        due: 'Today, 05:00 PM',
                        teacher: 'Mr. Deepak Verma',
                        status: 'PENDING',
                        attachment: 'ray-diagrams-worksheet.pdf',
                        note: 'Draw all 6 object positions with pencil and clear arrow directions.'
                      },
                      {
                        id: 'hw-2',
                        subject: 'Mathematics',
                        title: 'Quadratic Equations Practice Set 4.2',
                        due: 'Sep 23, 2026',
                        teacher: 'Mr. Arun Sharma',
                        status: 'SUBMITTED',
                        attachment: 'maths-ch4-solved.pdf',
                        grade: 'Checked • Grade A+'
                      },
                    ].map((hw, i) => (
                      <div key={i} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                              {hw.subject}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              hw.status === 'SUBMITTED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {hw.status === 'SUBMITTED' ? 'Submitted' : 'Pending Submission'}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-gray-900">{hw.title}</h4>
                          <p className="text-[11px] text-gray-500">Teacher: {hw.teacher} • Due: {hw.due}</p>
                          {hw.note && <p className="text-[11px] text-gray-600 italic">“{hw.note}”</p>}
                          {hw.grade && (
                            <p className="text-[11px] text-emerald-700 font-bold bg-white px-2 py-1 rounded-lg border border-gray-100 inline-block">
                              ✓ {hw.grade}
                            </p>
                          )}
                        </div>

                        <div className="flex-shrink-0">
                          {hw.status === 'PENDING' ? (
                            <button
                              onClick={() => setSelectedHw(hw)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              <Upload size={13} />
                              <span>Submit Homework</span>
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={14} /> Submitted
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Col: Tomorrow's Backpack Checklist & Teacher's Handouts */}
              <div className="space-y-6">
                {/* Backpack Checklist */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <span>🎒</span>
                      <span>Bag Checklist for Tomorrow</span>
                    </h3>
                    <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full">
                      Auto-synced
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Never get scolded by teachers for missing equipment or notebooks!
                  </p>

                  <div className="space-y-2.5">
                    {bagItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => toggleBagItem(item.id)}
                        className={`p-3 rounded-2xl border cursor-pointer select-none transition flex items-center justify-between text-xs ${
                          item.checked
                            ? 'bg-emerald-50/50 border-emerald-200 text-gray-500 line-through'
                            : 'bg-gray-50 border-gray-100 text-gray-800 font-semibold hover:border-purple-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-5 h-5 rounded-lg flex items-center justify-center border ${
                              item.checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300'
                            }`}
                          >
                            {item.checked && <Check size={12} />}
                          </div>
                          <span>{item.name}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono">{item.note}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Teacher Handouts & Notes Locker */}
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      <FileText size={18} className="text-blue-600" />
                      <span>Class Notes Locker</span>
                    </h3>
                    <Link href="/lms" className="text-xs font-bold text-purple-600 hover:underline">
                      All LMS
                    </Link>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { title: 'Chemical Reactions Balanced Equations PDF', teacher: 'Dr. Khanna', size: '2.1 MB' },
                      { title: 'Trigonometry Formula Sheet & Derivations', teacher: 'Mrs. Sharma', size: '1.4 MB' },
                      { title: 'French Revolution Timeline Quick Map', teacher: 'Mr. Lal', size: '890 KB' },
                    ].map((note, i) => (
                      <div key={i} className="p-3 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-gray-900 truncate max-w-[180px]">{note.title}</p>
                          <p className="text-[10px] text-gray-400">{note.teacher} • {note.size}</p>
                        </div>
                        <button
                          onClick={() => toast.success(`Downloading ${note.title}`)}
                          className="p-1.5 rounded-lg bg-white border hover:bg-purple-50 text-purple-700"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: ASK TEACHER A DOUBT (DOUBT RESOLUTION DESK)                       */}
        {/* ========================================================================= */}
        {activeTab === 'ASK_TEACHER' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-3xl p-6 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="px-3 py-1 bg-white/20 text-emerald-100 text-[10px] font-bold uppercase rounded-full">
                  Zero-Hesitation Doubt Desk
                </span>
                <h3 className="text-xl font-black mt-2">Ask Your Subject Teacher Directly</h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-xl">
                  Stuck on homework or a tricky formula? Don&apos;t worry about asking in front of the whole class. Send your doubt privately to your teacher and get a verified step-by-step reply.
                </p>
              </div>

              <button
                onClick={() => setIsAskDoubtModalOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-2xl shadow-lg transition active:scale-95 whitespace-nowrap"
              >
                <Plus size={16} />
                <span>Ask New Doubt</span>
              </button>
            </div>

            {/* List of Previous Doubts & Teacher Answers */}
            <div className="space-y-4">
              <h3 className="text-base font-bold text-gray-900">My Questions & Verified Teacher Responses</h3>

              {doubts.length === 0 ? (
                <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border">
                  No doubts asked yet. When you get stuck on a topic, click &apos;Ask New Doubt&apos;!
                </div>
              ) : (
                <div className="space-y-4">
                  {doubts.map(d => (
                    <div
                      key={d.id}
                      className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                            {d.subject}
                          </span>
                          <span className="text-xs font-semibold text-gray-500">
                            Teacher: <strong>{d.teacherName}</strong>
                          </span>
                        </div>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'RESOLVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {d.status === 'RESOLVED' ? '✓ Answered by Teacher' : '⏳ Awaiting Teacher Reply'}
                        </span>
                      </div>

                      {/* Question */}
                      <div className="space-y-1">
                        <p className="text-[11px] text-gray-400 font-bold uppercase">{d.chapter}</p>
                        <h4 className="text-sm font-bold text-gray-900">{d.question}</h4>
                      </div>

                      {/* Teacher's Reply */}
                      {d.teacherReply ? (
                        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-1.5">
                          <p className="text-xs font-bold text-emerald-900 flex items-center justify-between">
                            <span className="flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-emerald-600" />
                              <span>Teacher Explanation ({d.teacherName}):</span>
                            </span>
                            <span className="text-[10px] font-normal text-emerald-700">{d.repliedAt}</span>
                          </p>
                          <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                            {d.teacherReply}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-100">
                          Your teacher has received your question and will respond before the next class session.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SMART ATTENDANCE BUFFER CALCULATOR                                  */}
        {/* ========================================================================= */}
        {activeTab === 'ATTENDANCE_CALC' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Attendance Safety Buffer & Leave Calculator</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Plan your family leaves with zero anxiety of dropping below CBSE 75% minimum
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                  Current: 92.0%
                </span>
              </div>

              {/* Status Banner */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-xl flex-shrink-0">
                  {safeLeavesRemaining}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-emerald-950">Safe Leave Cushion: {safeLeavesRemaining} Days</h4>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    You have attended {attendedDays} out of {totalDays} school days. You can take up to{' '}
                    <strong>{safeLeavesRemaining} more days off</strong> throughout the term and still remain above the mandatory 75% threshold!
                  </p>
                </div>
              </div>

              {/* Interactive Simulator Slider */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-700">Simulate Taking Leaves:</span>
                  <span className="font-mono font-bold text-purple-700 text-sm">
                    {extraLeavesPlanned} Days Planned
                  </span>
                </div>

                <input
                  type="range"
                  min="0"
                  max="15"
                  value={extraLeavesPlanned}
                  onChange={e => setExtraLeavesPlanned(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-gray-500">Projected Attendance:</span>
                  <span
                    className={`font-black text-sm ${
                      Number(calculatedPercent) >= 75 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {calculatedPercent}% {Number(calculatedPercent) >= 75 ? '(Safe to take)' : '⚠️ Warning: Drops below 75%!'}
                  </span>
                </div>
              </div>

              {/* Attendance Subject-wise Breakdown */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Subject-wise Class Attendance</h4>
                {[
                  { sub: 'Mathematics', present: 28, total: 30, pct: 93.3 },
                  { sub: 'Science', present: 27, total: 30, pct: 90.0 },
                  { sub: 'English', present: 29, total: 30, pct: 96.6 },
                  { sub: 'Social Studies', present: 26, total: 30, pct: 86.6 },
                ].map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 text-xs">
                    <span className="font-bold text-gray-800">{s.sub}</span>
                    <span className="font-semibold text-gray-600">
                      {s.present} / {s.total} Classes ({s.pct}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: POMODORO FOCUS STUDIO & STUDY HISTORY LOG                          */}
        {/* ========================================================================= */}
        {activeTab === 'STUDY_FOCUS' && (
          <div className="space-y-6">
            {/* 1. Header with Close and Control Actions */}
            <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                    Senior Study Room
                  </span>
                  <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                    <Flame size={14} className="fill-amber-500" />
                    <span>🔥 4-Day Active Streak</span>
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 mt-1">Pomodoro Focus Studio & Study History</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track every study sprint by subject, analyze revision hours, and maintain your persistent study record
                </p>
              </div>

              {/* Close & Mode Switcher Buttons */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setIsZenOverlayOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-100 text-purple-800 text-xs font-bold hover:bg-purple-200 transition shadow-xs"
                  title="Full-Screen Zen Mode"
                >
                  <Maximize2 size={13} />
                  <span>Zen Fullscreen</span>
                </button>

                <button
                  onClick={() => {
                    setIsMiniWidgetMinimized(true);
                    setActiveTab('SCHEDULE_HOMEWORK');
                    toast.success('Timer minimized to floating widget! You can now check timetable or notes.');
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition shadow-xs"
                  title="Minimize to floating widget"
                >
                  <Minimize2 size={13} />
                  <span>Minimize Widget</span>
                </button>

                <button
                  onClick={() => {
                    if (isPomodoroActive) {
                      setIsStopConfirmModalOpen(true);
                    } else {
                      setActiveTab('SCHEDULE_HOMEWORK');
                      toast('Closed Focus Studio, returned to Schedule', { icon: '←' });
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-black transition shadow-md"
                  title="Close Focus Studio and Return to Tasks"
                >
                  <X size={14} />
                  <span>Close Studio (Back to Tasks)</span>
                </button>
              </div>
            </div>

            {/* 2. Top Stats Bar: Total Minutes, Sessions, Daily Target, Subject Balance */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400">Total Studied Today</p>
                <p className="text-2xl font-black text-purple-700 mt-0.5">{totalMinutesStudiedToday} Mins</p>
                <p className="text-[11px] text-gray-500 mt-0.5">~{(totalMinutesStudiedToday / 60).toFixed(1)} Hours focused</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400">Completed Sprints</p>
                <p className="text-2xl font-black text-emerald-600 mt-0.5">{pomodoroHistory.length}</p>
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Recorded in study log</p>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400">Daily Study Target</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">
                  {Math.min(100, Math.round((totalMinutesStudiedToday / 100) * 100))}%
                </p>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.round((totalMinutesStudiedToday / 100) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <p className="text-[11px] font-bold uppercase text-gray-400">Current Study Goal</p>
                <p className="text-xs font-bold text-gray-900 mt-1 truncate">{currentStudySubject}</p>
                <p className="text-[10px] text-purple-600 font-medium truncate">{currentStudyTask}</p>
              </div>
            </div>

            {/* 3. Main Workspace: Timer on Left, Study History on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Timer & Controls (5 Cols) */}
              <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6 text-center">
                {/* Mode Selector */}
                <div className="flex justify-center gap-1.5 p-1 bg-gray-100 rounded-2xl">
                  <button
                    onClick={() => switchPomodoroMode('FOCUS')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      pomodoroMode === 'FOCUS' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Focus Sprint
                  </button>
                  <button
                    onClick={() => switchPomodoroMode('SHORT_BREAK')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      pomodoroMode === 'SHORT_BREAK' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    5m Break
                  </button>
                  <button
                    onClick={() => switchPomodoroMode('LONG_BREAK')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      pomodoroMode === 'LONG_BREAK' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    15m Break
                  </button>
                </div>

                {/* Pre-Session Configuration (Subject & Task) */}
                {pomodoroMode === 'FOCUS' && (
                  <div className="space-y-3 text-left p-4 rounded-2xl bg-purple-50/50 border border-purple-100">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Select Subject for this Session
                      </label>
                      <select
                        value={currentStudySubject}
                        onChange={e => setCurrentStudySubject(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-800 bg-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="Mathematics">Mathematics</option>
                        <option value="Science (Physics)">Science (Physics)</option>
                        <option value="Science (Chemistry/Bio)">Science (Chemistry/Bio)</option>
                        <option value="Social Science">Social Science (History/Civics)</option>
                        <option value="English Literature">English Literature</option>
                        <option value="Computer Science">Computer Science</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Session Goal / Chapter Task
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Solve 10 questions from Exercise 4.2"
                        value={currentStudyTask}
                        onChange={e => setCurrentStudyTask(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium text-gray-800 bg-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Sprint Duration Presets */}
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-wider text-purple-900 mb-1">
                        Sprint Length
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[15, 25, 45, 60].map(mins => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setPomodoroDurationMinutes(mins);
                              setPomodoroSeconds(mins * 60);
                              setIsPomodoroActive(false);
                            }}
                            className={`py-1.5 rounded-xl text-xs font-bold transition border ${
                              pomodoroDurationMinutes === mins
                                ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {mins}m
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Big Timer Clock Display */}
                <div className="py-2">
                  <div className="w-52 h-52 sm:w-56 sm:h-56 rounded-full border-8 border-purple-100 bg-purple-50/50 flex flex-col items-center justify-center mx-auto shadow-inner relative">
                    <p className="text-5xl font-black text-purple-900 font-mono tracking-tight">
                      {formatTimer(pomodoroSeconds)}
                    </p>
                    <p className="text-xs font-bold uppercase tracking-widest text-purple-600 mt-2">
                      {isPomodoroActive ? 'Session in Progress' : 'Paused / Ready'}
                    </p>
                    <p className="text-[11px] text-gray-400 font-semibold mt-1">
                      {currentStudySubject}
                    </p>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-3">
                    <button
                      onClick={togglePomodoro}
                      className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black shadow-lg transition active:scale-95 text-white ${
                        isPomodoroActive
                          ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/25'
                          : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/30'
                      }`}
                    >
                      {isPomodoroActive ? <Pause size={16} /> : <Play size={16} />}
                      <span>{isPomodoroActive ? 'Pause Session' : 'Start Focus Sprint'}</span>
                    </button>

                    <button
                      onClick={resetPomodoro}
                      className="p-3.5 rounded-2xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition"
                      title="Reset Timer"
                    >
                      <RotateCcw size={16} />
                    </button>
                  </div>

                  {/* Stop / Close Session Button */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={handleFinishEarly}
                      className="py-2.5 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 border border-emerald-200 transition"
                      title="Log minutes studied so far"
                    >
                      ✓ Finish Early & Log
                    </button>

                    <button
                      onClick={handleCloseTimerClick}
                      className="py-2.5 rounded-xl bg-gray-100 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-gray-600 text-xs font-bold border border-gray-200 transition"
                      title="Cancel or stop this study session"
                    >
                      ✕ Close / Stop Timer
                    </button>
                  </div>
                </div>

                {/* Science of Focus Tip */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/60 text-xs text-amber-900 text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <Lightbulb size={13} className="text-amber-600" />
                    <span>Senior Study Hack:</span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-amber-950">
                    25-minute sprints eliminate cognitive fatigue. Reviewing your session history proves to your brain that you are making real daily progress!
                  </p>
                </div>
              </div>

              {/* Right Column: Persistent Study History Log (7 Cols) */}
              <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-5 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Top Bar with Title, Count, Export CSV, Clear */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
                    <div>
                      <h4 className="text-base font-black text-gray-900 flex items-center gap-2">
                        <Clock size={18} className="text-purple-600" />
                        <span>My Study History & Session Log</span>
                      </h4>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {filteredHistory.length} of {pomodoroHistory.length} total study sprints recorded
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleExportStudyLog}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-gray-200 text-[11px] font-bold text-gray-700 hover:bg-gray-50 transition shadow-2xs"
                        title="Download CSV revision report"
                      >
                        <FileDown size={13} className="text-purple-600" />
                        <span>Export CSV</span>
                      </button>

                      {pomodoroHistory.length > 0 && (
                        <button
                          onClick={handleClearHistory}
                          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Clear all saved study history"
                        >
                          Clear History
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="space-y-2.5">
                    {/* Search Input */}
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search sessions by subject, topic, or notes..."
                        value={historySearchQuery}
                        onChange={e => setHistorySearchQuery(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Subject Filter Chips */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                      <span className="text-[10px] font-bold uppercase text-gray-400 mr-1 flex items-center gap-1 flex-shrink-0">
                        <Filter size={11} /> Subject:
                      </span>
                      {[
                        { id: 'ALL', label: 'All Subjects' },
                        { id: 'Mathematics', label: 'Maths' },
                        { id: 'Physics', label: 'Physics' },
                        { id: 'Chemistry', label: 'Chemistry' },
                        { id: 'Social Science', label: 'Social' },
                        { id: 'Computer Science', label: 'CS' },
                        { id: 'English', label: 'English' },
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setHistorySubjectFilter(tab.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition whitespace-nowrap ${
                            historySubjectFilter === tab.id
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Timeframe Filter Pills */}
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-[10px] font-bold uppercase text-gray-400 mr-1">Time:</span>
                      {(['ALL', 'TODAY', 'YESTERDAY'] as const).map(tf => (
                        <button
                          key={tf}
                          onClick={() => setHistoryTimeFilter(tf)}
                          className={`px-2 py-0.5 rounded-md font-bold transition ${
                            historyTimeFilter === tf
                              ? 'bg-gray-900 text-white'
                              : 'text-gray-500 hover:text-gray-900'
                          }`}
                        >
                          {tf === 'ALL' ? 'All Time' : tf === 'TODAY' ? 'Today' : 'Yesterday'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* History List */}
                  {filteredHistory.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 bg-gray-50 rounded-2xl border space-y-2">
                      <p className="text-xs font-semibold">No study sessions matching your search or filters.</p>
                      <button
                        onClick={() => {
                          setHistorySubjectFilter('ALL');
                          setHistorySearchQuery('');
                          setHistoryTimeFilter('ALL');
                        }}
                        className="text-xs font-bold text-purple-600 hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {filteredHistory.map(session => (
                        <div
                          key={session.id}
                          className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-1.5">
                              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                                {session.subject}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  session.status === 'COMPLETED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                  }`}
                              >
                                {session.status === 'COMPLETED' ? '✓ Completed' : '⚡ Logged Early'}
                              </span>
                              {session.rating && (
                                <span className="flex items-center text-amber-500 text-[10px] font-bold">
                                  {'★'.repeat(session.rating)}
                                </span>
                              )}
                              <span className="text-[11px] text-gray-400 font-mono">
                                {session.completedAt}
                              </span>
                            </div>
                            <h5 className="font-bold text-gray-900 truncate">{session.taskTitle}</h5>
                            {session.notes && (
                              <p className="text-[11px] text-gray-600 italic bg-white/70 px-2.5 py-1 rounded-lg border border-gray-100 mt-1">
                                📝 {session.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                            <span className="font-black text-purple-700 bg-white px-2.5 py-1 rounded-xl border border-gray-200">
                              {session.durationMinutes}m
                            </span>
                            <button
                              onClick={() => handleDeleteHistoryItem(session.id)}
                              className="text-gray-300 hover:text-rose-500 transition p-1"
                              title="Delete log"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Bottom Subject Breakdown Summary Bar */}
                <div className="pt-4 border-t border-gray-100 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-gray-500 font-bold text-[11px]">
                    <span>Revision Time by Subject ({totalLoggedMinutes}m total logged):</span>
                    <span className="text-purple-700 font-black">{pomodoroHistory.length} Sprints</span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-gray-100 flex overflow-hidden">
                    {Object.entries(subjectTimeMap).map(([sub, mins], idx) => {
                      const colors = ['bg-purple-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-pink-500'];
                      const widthPercent = totalLoggedMinutes > 0 ? (mins / totalLoggedMinutes) * 100 : 0;
                      return (
                        <div
                          key={sub}
                          style={{ width: `${widthPercent}%` }}
                          className={`${colors[idx % colors.length]}`}
                          title={`${sub}: ${mins}m (${Math.round(widthPercent)}%)`}
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {Object.entries(subjectTimeMap).map(([sub, mins]) => (
                      <span key={sub} className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-bold text-[10px]">
                        {sub}: {mins}m
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: EXAM TARGET SIMULATOR                                              */}
        {/* ========================================================================= */}
        {activeTab === 'TARGET_SIMULATOR' && (
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xl space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Term 1 Exam Target Simulator</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Calculate marks required in upcoming theory & practical exams to hit your target percentage
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-gray-500">Target Goal</span>
                  <p className="text-xl font-black text-purple-700">{targetGoalPercent}%</p>
                </div>
              </div>

              {/* Target Slider */}
              <div className="space-y-2 p-4 bg-purple-50/60 rounded-2xl border border-purple-100">
                <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                  <span>Adjust Your Academic Goal:</span>
                  <span className="text-sm font-black">{targetGoalPercent}% Overall Percentage</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="98"
                  value={targetGoalPercent}
                  onChange={e => setTargetGoalPercent(Number(e.target.value))}
                  className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>

              {/* Subject Breakdown & Required Marks */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-gray-700 uppercase">Target Score Roadmap to Hit {targetGoalPercent}%</h4>

                {[
                  { sub: 'Mathematics', current: 92, target: Math.min(100, Math.round(targetGoalPercent * 1.02)), tip: 'High scoring; focus on NCERT optional exercises' },
                  { sub: 'Science', current: 88, target: Math.min(100, Math.round(targetGoalPercent * 0.98)), tip: 'Practice numerical problems & ray diagrams' },
                  { sub: 'Social Studies', current: 87, target: Math.min(100, Math.round(targetGoalPercent * 0.97)), tip: 'Make timeline flashcards for History dates' },
                  { sub: 'English', current: 85, target: Math.min(100, Math.round(targetGoalPercent * 0.96)), tip: 'Revise formal letter writing format' },
                  { sub: 'Computer Science', current: 95, target: Math.min(100, Math.round(targetGoalPercent * 1.04)), tip: 'Full marks potential in Python syntax' },
                ].map((s, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-gray-900">{s.sub}</span>
                      <p className="text-[11px] text-gray-500">Pro Tip: {s.tip}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-purple-700 text-sm">Need: {s.target}/100</span>
                      <p className="text-[10px] text-gray-400">Current: {s.current}/100</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: STUDENT ONLINE FEE PAYMENT & RECEIPTS                              */}
        {/* ========================================================================= */}
        {activeTab === 'FEES_PAYMENT' && (
          <div className="space-y-6 max-w-5xl mx-auto">
            {/* Main Fee Status Header Card */}
            <div className={`rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl ${
              studentFeeStatus.isPaid
                ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700'
                : 'bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700'
            }`}>
              <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold text-white">
                    <Shield size={14} className="text-emerald-300" />
                    <span>Official CBSE School Fee Portal • Class 10-A</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black">
                    {studentFeeStatus.isPaid ? 'Term 2 School Fees Cleared' : 'Term 2 Fee Dues: ₹3,000'}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/90 max-w-xl">
                    {studentFeeStatus.isPaid
                      ? `Receipt #${studentFeeStatus.receiptNo || 'REC-2026-1001'} generated on ${studentFeeStatus.paidDate || 'Today'}. Settled by ${studentFeeStatus.paidByName || 'Student'}.`
                      : 'Due Date: October 10, 2026. Students can pay directly using UPI (GPay/PhonePe), Debit Card, or Parent Portal.'}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  {studentFeeStatus.isPaid ? (
                    <button
                      onClick={() => setActiveReceiptModal({
                        receiptNo: studentFeeStatus.receiptNo || 'REC-2026-1004',
                        studentName: studentName || 'Aarav Sharma',
                        studentClass: 'Class 10-A',
                        admissionNo: 'ADM2026100',
                        amount: studentFeeStatus.amount || 3000,
                        paidAmount: studentFeeStatus.amount || 3000,
                        paymentMode: studentFeeStatus.paymentMode || 'UPI',
                        paymentDate: studentFeeStatus.paidDate || 'Today, 09:30 AM',
                        payerType: studentFeeStatus.paidBy || 'STUDENT',
                        payerName: studentFeeStatus.paidByName || 'Aarav Sharma (Student)',
                        transactionId: 'TXN-UPI-992381',
                        month: 'October',
                        academicYear: '2026-2027',
                        breakdown: { tuitionFee: 2000, labFee: 500, libraryFee: 300, sportsFee: 200 },
                      })}
                      className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-black rounded-2xl shadow-lg transition active:scale-95"
                    >
                      <Receipt size={16} />
                      <span>Download Receipt (PDF)</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsStudentFeeModalOpen(true)}
                      className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-2xl shadow-xl shadow-emerald-500/30 transition transform hover:-translate-y-0.5 active:scale-95"
                    >
                      <CreditCard size={16} />
                      <span>Pay ₹3,000 Online Now</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Grid: Fee Breakdown & Payer Security Note */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Fee Breakdown */}
              <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <IndianRupee size={18} className="text-purple-600" />
                    <span>Term 2 Itemized Fee Schedule (Quarterly)</span>
                  </h3>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                    studentFeeStatus.isPaid ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {studentFeeStatus.isPaid ? 'Status: Paid' : 'Status: Payment Pending'}
                  </span>
                </div>

                <div className="divide-y divide-gray-100 text-xs">
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Tuition & Faculty Fee</p>
                      <p className="text-[11px] text-gray-500">Core academic curriculum & subject instruction</p>
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
                      <p className="font-bold text-gray-900">Digital Library, LMS & Smart Class</p>
                      <p className="text-[11px] text-gray-500">Interactive panels, cloud assessments & study booster</p>
                    </div>
                    <span className="font-mono font-bold text-gray-800">₹300.00</span>
                  </div>
                  <div className="py-3 flex items-center justify-between">
                    <div>
                      <p className="font-bold text-gray-900">Sports & Annual Co-Curricular Fund</p>
                      <p className="text-[11px] text-gray-500">Physical education equipment, tournaments & inter-house sports</p>
                    </div>
                    <span className="font-mono font-bold text-gray-800">₹200.00</span>
                  </div>
                  <div className="py-4 flex items-center justify-between bg-gray-50/70 px-3 rounded-2xl mt-2 font-black text-sm">
                    <span className="text-gray-900">Total Net Term Fee</span>
                    <span className="text-purple-700 font-mono text-base">₹3,000.00</span>
                  </div>
                </div>

                {studentFeeStatus.isPaid ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 size={24} className="text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900">
                        Payment Recorded in Vidyalaya Accounts System
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        {studentFeeStatus.paidBy === 'STUDENT'
                          ? 'Paid directly by student via Student Portal UPI. Synchronized with Parent Portal and Admin Accounts.'
                          : 'Paid by parent via Parent Portal. Synchronized with School Accounts.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-purple-900">Ready to pay your fee?</p>
                      <p className="text-[11px] text-purple-700">Quick UPI QR code scan using your phone, or debit card</p>
                    </div>
                    <button
                      onClick={() => setIsStudentFeeModalOpen(true)}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-md shadow-purple-600/30 transition"
                    >
                      Pay Online
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Past Receipts & Security */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <Receipt size={18} className="text-purple-600" />
                    <span>Receipt History (2026-27)</span>
                  </h3>

                  <div className="space-y-3">
                    {/* Term 1 Seed Receipt */}
                    <div className="p-3.5 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-gray-900">Term 1 (Jul - Sep)</span>
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded">PAID</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5">REC-2026-1001 • ₹3,000</p>
                        <p className="text-[10px] text-purple-600 font-bold">Paid by Parent (Rajesh Sharma)</p>
                      </div>
                      <button
                        onClick={() => setActiveReceiptModal({
                          receiptNo: 'REC-2026-1001',
                          studentName: 'Aarav Sharma',
                          studentClass: 'Class 10-A',
                          admissionNo: 'ADM2026100',
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

                    {/* Term 2 Receipt if Paid */}
                    {studentFeeStatus.isPaid && (
                      <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/60 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-gray-900">Term 2 (Oct - Dec)</span>
                            <span className="px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-black rounded">PAID</span>
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5">{studentFeeStatus.receiptNo || 'REC-2026-1004'} • ₹3,000</p>
                          <p className="text-[10px] text-emerald-800 font-bold">Paid by {studentFeeStatus.paidByName || 'Student'}</p>
                        </div>
                        <button
                          onClick={() => setActiveReceiptModal({
                            receiptNo: studentFeeStatus.receiptNo || 'REC-2026-1004',
                            studentName: studentName || 'Aarav Sharma',
                            studentClass: 'Class 10-A',
                            admissionNo: 'ADM2026100',
                            amount: studentFeeStatus.amount || 3000,
                            paidAmount: studentFeeStatus.amount || 3000,
                            paymentMode: studentFeeStatus.paymentMode || 'UPI',
                            paymentDate: studentFeeStatus.paidDate || 'Today',
                            payerType: studentFeeStatus.paidBy || 'STUDENT',
                            payerName: studentFeeStatus.paidByName || `${studentName} (Student)`,
                            transactionId: 'TXN-UPI-992381',
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
                    <span>Safe & Instant Fee Verification</span>
                  </div>
                  <p className="text-[11px]">
                    Every payment creates an immutable transaction entry. Receipts are valid for official CBSE audit, income tax 80C rebate, and student transport passes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: SUBMIT HOMEWORK                                                    */}
        {/* ========================================================================= */}
        {selectedHw && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-black text-gray-900">Submit Homework</h3>
                <button
                  onClick={() => setSelectedHw(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1">
                <p><strong>Subject:</strong> {selectedHw.subject}</p>
                <p><strong>Assignment:</strong> {selectedHw.title}</p>
                <p><strong>Due:</strong> {selectedHw.due}</p>
              </div>

              <form onSubmit={handleHomeworkSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Upload Homework File (PDF/Image)</label>
                  <div className="border-2 border-dashed border-gray-200 rounded-2xl p-4 text-center hover:border-purple-400 cursor-pointer">
                    <Upload size={24} className="mx-auto text-purple-600 mb-1" />
                    <p className="text-xs font-semibold text-gray-700">Click to upload assignment file</p>
                    <p className="text-[10px] text-gray-400">PDF, JPG, or PNG up to 10MB</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Student Notes / Doubts for Teacher</label>
                  <textarea
                    rows={2}
                    placeholder="Enter any comments or questions for your teacher..."
                    value={submissionNotes}
                    onChange={e => setSubmissionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedHw(null)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
                  >
                    {isSubmitting ? 'Uploading...' : 'Submit to Teacher'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: ASK TEACHER A DOUBT                                                */}
        {/* ========================================================================= */}
        {isAskDoubtModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Ask Your Subject Teacher</h3>
                  <p className="text-xs text-gray-500">Private question & doubt resolution desk</p>
                </div>
                <button
                  onClick={() => setIsAskDoubtModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleAskDoubtSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Subject & Teacher</label>
                    <select
                      value={doubtForm.subject}
                      onChange={e => {
                        const sub = e.target.value;
                        const teacher =
                          sub === 'Mathematics'
                            ? 'Mr. Arun Sharma'
                            : sub === 'Science (Physics)'
                            ? 'Mr. Deepak Verma'
                            : sub === 'Science (Chemistry/Bio)'
                            ? 'Dr. Rajesh Khanna'
                            : sub === 'English'
                            ? 'Mrs. Priya Singh'
                            : 'Mrs. Kavita Mishra';
                        setDoubtForm({ ...doubtForm, subject: sub, teacherName: teacher });
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Mathematics">Mathematics (Mr. Arun Sharma)</option>
                      <option value="Science (Physics)">Science - Physics (Mr. Deepak Verma)</option>
                      <option value="Science (Chemistry/Bio)">Science - Chemistry (Dr. Rajesh Khanna)</option>
                      <option value="English">English Literature (Mrs. Priya Singh)</option>
                      <option value="Social Studies">Social Studies (Mrs. Kavita Mishra)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Chapter / Topic</label>
                    <input
                      type="text"
                      placeholder="e.g. Quadratic Equations Ex 4.3"
                      value={doubtForm.chapter}
                      onChange={e => setDoubtForm({ ...doubtForm, chapter: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Your Question / Doubt Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Clearly describe the step, formula, or concept you are finding difficult..."
                    value={doubtForm.question}
                    onChange={e => setDoubtForm({ ...doubtForm, question: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAskDoubtModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30 transition"
                  >
                    Send Doubt to Teacher
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: STUDENT DIRECT FEE PAYMENT GATEWAY                                */}
        {/* ========================================================================= */}
        {isStudentFeeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">Student School Fee Checkout</h3>
                    <p className="text-xs text-gray-500">Term 2 (2026-27) • Class 10-A</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsStudentFeeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Order Amount Banner */}
              <div className="p-4 bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Total Payable Amount</span>
                  <p className="text-2xl font-black text-gray-900 mt-0.5">₹3,000.00</p>
                  <p className="text-[11px] text-gray-500">Student: {studentName} • ADM2026100</p>
                </div>
                <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-xl shadow-sm">
                  Term 2 Dues
                </span>
              </div>

              {/* Payment Method Switcher */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Select Instant Payment Method:</label>
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
                        onClick={() => setStudentPaymentMethod(m.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition ${
                          studentPaymentMethod === m.id
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

              {/* UPI Tab View */}
              {studentPaymentMethod === 'UPI' && (
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
                      <rect x="35" y="15" width="8" height="8" fill="#1e1b4b" />
                      <rect x="50" y="10" width="12" height="6" fill="#1e1b4b" />
                      <rect x="35" y="35" width="30" height="30" fill="#7c3aed" rx="4" />
                      <rect x="42" y="42" width="16" height="16" fill="#fff" rx="2" />
                      <text x="50" y="54" fontSize="10" textAnchor="middle" fill="#7c3aed" fontWeight="bold">₹</text>
                      <rect x="72" y="40" width="18" height="10" fill="#1e1b4b" />
                      <rect x="40" y="72" width="20" height="8" fill="#1e1b4b" />
                      <rect x="70" y="70" width="20" height="20" fill="#1e1b4b" />
                    </svg>
                  </div>

                  <div className="text-xs space-y-1">
                    <p className="font-mono font-bold text-gray-700">UPI ID: vidyalayaschool@icici</p>
                    <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-gray-500 font-semibold">
                      <span>Google Pay</span> • <span>PhonePe</span> • <span>Paytm</span> • <span>BHIM</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Card Tab View */}
              {studentPaymentMethod === 'CARD' && (
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
                      defaultValue={studentName}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold focus:ring-2 focus:ring-purple-500 bg-white"
                    />
                  </div>
                </div>
              )}

              {/* Net Banking Tab View */}
              {studentPaymentMethod === 'NETBANKING' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-3">
                  <label className="block text-xs font-bold text-gray-700">Select Bank:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra Bank', 'Punjab National Bank'].map(bank => (
                      <div key={bank} className="p-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 flex items-center gap-2 cursor-pointer hover:border-purple-400">
                        <input type="radio" name="bank_select" defaultChecked={bank === 'State Bank of India'} />
                        <span className="truncate">{bank}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl flex items-center gap-2 text-xs text-purple-900">
                <Shield size={16} className="text-purple-600 flex-shrink-0" />
                <span>
                  Immediate sync: Payment will be registered with <strong>Paid by Student ({studentName})</strong> and reflect directly on the school accounts and parent dashboard.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStudentFeeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStudentPayFee}
                  disabled={isProcessingFee}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessingFee ? (
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

        {/* ========================================================================= */}
        {/* MODAL: POST-SPRINT REFLECTION & LOGGING                                   */}
        {/* ========================================================================= */}
        {reflectionModalData?.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black">
                    🎯
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">Sprint Finished!</h3>
                    <p className="text-xs text-gray-500">Record your achievements into your study log</p>
                  </div>
                </div>
                <button
                  onClick={() => setReflectionModalData(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-purple-700">Subject & Task</span>
                  <p className="text-xs font-black text-gray-900">{reflectionModalData.subject}</p>
                  <p className="text-[11px] text-gray-600 truncate max-w-[200px]">{reflectionModalData.task}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black text-purple-700">{reflectionModalData.mins}m</span>
                  <p className="text-[10px] font-bold text-emerald-700">
                    {reflectionModalData.status === 'COMPLETED' ? '100% Target Met' : 'Logged Early'}
                  </p>
                </div>
              </div>

              {/* Star Rating */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">Self-Reflection / Focus Quality:</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReflectionModalData({ ...reflectionModalData, rating: star })}
                      className="p-1 text-amber-400 hover:scale-110 transition"
                    >
                      <Star
                        size={22}
                        className={star <= reflectionModalData.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                      />
                    </button>
                  ))}
                  <span className="text-xs text-gray-500 font-medium ml-2">
                    {reflectionModalData.rating === 5 ? 'Deep Focus 🔥' : reflectionModalData.rating >= 4 ? 'Great Session ⚡' : 'Moderate Focus'}
                  </span>
                </div>
              </div>

              {/* Reflection Notes */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  What did you accomplish or learn in this sprint?
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Solved 8 NCERT quadratic equations; need to revise discriminant formula"
                  value={reflectionModalData.notes}
                  onChange={e => setReflectionModalData({ ...reflectionModalData, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    logPomodoroSession(reflectionModalData.status, reflectionModalData.mins, '', reflectionModalData.rating);
                    setReflectionModalData(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Skip Notes & Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    logPomodoroSession(
                      reflectionModalData.status,
                      reflectionModalData.mins,
                      reflectionModalData.notes,
                      reflectionModalData.rating
                    );
                    setReflectionModalData(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition"
                >
                  ✓ Save to Study History
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: STOP / CLOSE ACTIVE TIMER CONFIRMATION                             */}
        {/* ========================================================================= */}
        {isStopConfirmModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h4 className="text-base font-black text-gray-900">Stop Current Study Session?</h4>
                <p className="text-xs text-gray-500 mt-1">
                  You have studied for {Math.max(1, Math.round(((pomodoroDurationMinutes * 60) - pomodoroSeconds) / 60))} minute(s) on {currentStudySubject}.
                </p>
              </div>
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    const elapsedSeconds = (pomodoroDurationMinutes * 60) - pomodoroSeconds;
                    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
                    setIsStopConfirmModalOpen(false);
                    setReflectionModalData({
                      isOpen: true,
                      mins: elapsedMinutes,
                      subject: currentStudySubject,
                      task: currentStudyTask,
                      notes: '',
                      rating: 4,
                      status: 'EARLY_STOP',
                    });
                    resetPomodoro();
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm"
                >
                  ✓ Log Elapsed Time & Close
                </button>
                <button
                  onClick={() => {
                    resetPomodoro();
                    setIsStopConfirmModalOpen(false);
                    toast('Study session discarded and closed', { icon: '✕' });
                  }}
                  className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition"
                >
                  ✕ Discard Session & Close
                </button>
                <button
                  onClick={() => setIsStopConfirmModalOpen(false)}
                  className="w-full py-2 rounded-xl text-gray-500 hover:text-gray-800 text-xs font-semibold"
                >
                  Resume Studying
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FLOATING PICTURE-IN-PICTURE MINI-TIMER WIDGET                             */}
        {/* ========================================================================= */}
        {(isMiniWidgetMinimized || (pomodoroSeconds < pomodoroDurationMinutes * 60 && activeTab !== 'STUDY_FOCUS') || (isPomodoroActive && activeTab !== 'STUDY_FOCUS')) && (
          <div className="fixed bottom-6 right-6 z-50 bg-gray-950/95 backdrop-blur-md text-white p-3.5 px-4 rounded-3xl shadow-2xl border border-gray-800 flex items-center gap-3.5 animate-in slide-in-from-bottom-5">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${isPomodoroActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black text-amber-400 tracking-tight">
                  {formatTimer(pomodoroSeconds)}
                </span>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-purple-900/90 text-purple-200 border border-purple-700/50">
                  {currentStudySubject}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 truncate max-w-[150px] font-medium">
                {currentStudyTask || 'Focus Sprint'}
              </p>
            </div>

            <div className="flex items-center gap-1.5 border-l border-gray-800 pl-3">
              <button
                onClick={togglePomodoro}
                className="p-1.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-white transition"
                title={isPomodoroActive ? 'Pause' : 'Play'}
              >
                {isPomodoroActive ? <Pause size={13} /> : <Play size={13} />}
              </button>
              <button
                onClick={() => {
                  setIsMiniWidgetMinimized(false);
                  setActiveTab('STUDY_FOCUS');
                }}
                className="p-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition"
                title="Expand Full Focus Studio"
              >
                <Maximize2 size={13} />
              </button>
              <button
                onClick={() => {
                  setIsMiniWidgetMinimized(false);
                  if (pomodoroSeconds < pomodoroDurationMinutes * 60) {
                    setIsStopConfirmModalOpen(true);
                  } else {
                    resetPomodoro();
                    toast('Timer closed', { icon: '✕' });
                  }
                }}
                className="p-1.5 rounded-xl bg-gray-800 hover:bg-rose-900 text-gray-400 hover:text-white transition"
                title="Close / Stop Timer"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* FULL-SCREEN ZEN DISTRACTION-FREE OVERLAY                                  */}
        {/* ========================================================================= */}
        {isZenOverlayOpen && (
          <div className="fixed inset-0 z-50 bg-gray-950/98 backdrop-blur-2xl text-white flex flex-col justify-between p-6 sm:p-12 animate-in fade-in-50">
            {/* Zen Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-600/30 text-purple-400 border border-purple-500/30 flex items-center justify-center font-black">
                  <Zap size={20} />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black tracking-tight">Zen Distraction-Free Study Space</h2>
                  <p className="text-xs text-purple-300 font-medium">
                    {currentStudySubject} • {currentStudyTask || 'Focus Session'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Ambient Sound Mode Simulator */}
                <div className="hidden sm:flex items-center gap-1 p-1 bg-white/10 rounded-xl border border-white/10 text-xs">
                  <span className="px-2 text-[10px] text-gray-400 uppercase font-bold flex items-center gap-1">
                    <Volume2 size={12} /> Ambient:
                  </span>
                  {(['OFF', 'RAIN', 'CAFE', 'LIBRARY'] as const).map(sound => (
                    <button
                      key={sound}
                      onClick={() => {
                        setAmbientSound(sound);
                        toast.success(`Ambient sound set to: ${sound}`);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition ${
                        ambientSound === sound ? 'bg-purple-600 text-white' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      {sound}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setIsZenOverlayOpen(false)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-xs font-bold transition"
                  title="Close Zen Fullscreen (Press Esc)"
                >
                  <X size={15} />
                  <span>Exit Zen Mode (Esc)</span>
                </button>
              </div>
            </div>

            {/* Giant Minimalist Clock in Center */}
            <div className="my-auto py-8 text-center space-y-6">
              <p className="text-xs font-bold uppercase tracking-widest text-purple-300 flex items-center justify-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Senior Revision Focus Sprint • {currentStudySubject}</span>
              </p>

              <div className="text-7xl sm:text-9xl font-black font-mono tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-purple-100 to-purple-300">
                {formatTimer(pomodoroSeconds)}
              </div>

              <p className="text-sm text-gray-400 font-medium max-w-md mx-auto">
                Goal: {currentStudyTask || 'Complete chapter questions without distractions'}
              </p>

              {/* Zen Controls */}
              <div className="flex items-center justify-center gap-4 pt-2">
                <button
                  onClick={togglePomodoro}
                  className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl text-xs font-black shadow-xl transition active:scale-95 text-white ${
                    isPomodoroActive
                      ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/30'
                      : 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/40'
                  }`}
                >
                  {isPomodoroActive ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPomodoroActive ? 'Pause Session' : 'Resume Sprint'}</span>
                </button>

                <button
                  onClick={resetPomodoro}
                  className="p-3.5 rounded-2xl border border-white/20 text-gray-300 hover:bg-white/10 transition"
                  title="Reset Timer"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={() => {
                    handleFinishEarly();
                    setIsZenOverlayOpen(false);
                  }}
                  className="px-5 py-3.5 rounded-2xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition"
                >
                  ✓ Finish Early & Log
                </button>

                <button
                  onClick={() => setIsZenOverlayOpen(false)}
                  className="p-3.5 rounded-2xl border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition"
                  title="Close Zen Fullscreen"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Motivational Footer Quote */}
            <div className="border-t border-white/10 pt-4 text-center">
              <p className="text-xs text-gray-400 font-medium italic">
                “Small daily improvements over time lead to stunning board exam results.”
              </p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: STUDENT ONLINE FEE PAYMENT (UPI QR / CARD / NETBANKING)           */}
        {/* ========================================================================= */}
        {isStudentFeeModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                    <IndianRupee size={20} className="text-purple-600" />
                    <span>Pay School Fees Online</span>
                  </h3>
                  <p className="text-xs text-gray-500">Term 2 Fee Clearance • Official Vidyalaya Portal</p>
                </div>
                <button
                  onClick={() => setIsStudentFeeModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Student Details Pill */}
              <div className="p-3 bg-purple-50/70 border border-purple-100 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-900">{studentName}</p>
                  <p className="text-[11px] text-gray-500">Class 10-A • ADM2026100 • Roll 1</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Amount Payable</span>
                  <p className="text-base font-black text-purple-700">₹3,000.00</p>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-700">Select Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'UPI', label: 'UPI / QR Code', icon: QrCode },
                    { id: 'CARD', label: 'Debit / Card', icon: CreditCard },
                    { id: 'NETBANKING', label: 'Net Banking', icon: Shield },
                  ].map(m => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setStudentPaymentMethod(m.id as any)}
                        className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition ${
                          studentPaymentMethod === m.id
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/20'
                            : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border-gray-200'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* UPI Tab */}
              {studentPaymentMethod === 'UPI' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-center space-y-3">
                  <p className="text-xs font-bold text-gray-800">Scan & Pay ₹3,000 via any UPI App</p>
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
                      <rect x="35" y="35" width="30" height="30" fill="#7c3aed" rx="4" />
                      <text x="50" y="54" fontSize="10" textAnchor="middle" fill="#fff" fontWeight="bold">₹</text>
                      <rect x="70" y="70" width="20" height="20" fill="#1e1b4b" />
                    </svg>
                  </div>
                  <p className="font-mono text-xs font-bold text-gray-700">UPI ID: vidyalayaschool@icici</p>
                  <p className="text-[11px] text-gray-500">Supports Google Pay, PhonePe, Paytm, BHIM</p>
                </div>
              )}

              {/* Card Tab */}
              {studentPaymentMethod === 'CARD' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-gray-600 font-bold mb-1">Card Number</label>
                    <input
                      type="text"
                      placeholder="4532 •••• •••• 8892"
                      defaultValue="4532 9012 8841 3320"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">Expiry Date</label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        defaultValue="08/29"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-600 font-bold mb-1">CVV</label>
                      <input
                        type="password"
                        placeholder="•••"
                        defaultValue="782"
                        maxLength={3}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Netbanking Tab */}
              {studentPaymentMethod === 'NETBANKING' && (
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2">
                  <label className="block text-xs font-bold text-gray-700">Select Bank:</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank'].map(b => (
                      <div key={b} className="p-2.5 bg-white border border-gray-200 rounded-xl font-medium text-gray-800 flex items-center gap-2 cursor-pointer hover:border-purple-400">
                        <input type="radio" name="student_bank_select" defaultChecked={b === 'State Bank of India'} />
                        <span className="truncate">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-2 text-xs text-blue-900">
                <Shield size={16} className="text-blue-600 flex-shrink-0" />
                <span>
                  Recorded as <strong>Paid by Student ({studentName})</strong> and immediately reflected on both your parent dashboard and school accounts desk.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStudentFeeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStudentPayFee}
                  disabled={isProcessingFee}
                  className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30 transition disabled:opacity-50 flex items-center gap-2"
                >
                  {isProcessingFee ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Processing Payment...</span>
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

