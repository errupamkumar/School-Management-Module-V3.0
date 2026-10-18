'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Clock,
  Zap,
  Flame,
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Trash2,
  Lightbulb,
  FileDown,
  Search,
  Filter,
  Star,
  AlertTriangle,
  X,
  Volume2,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

const POMODORO_STORAGE_KEY = 'vidyalaya_student_pomodoro_history';

export default function PomodoroStudioPage() {
  const { data: session } = useSession();
  const studentName = session?.user?.name || 'Aarav Sharma';

  // Timer Configuration State
  const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(25);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [isPomodoroActive, setIsPomodoroActive] = useState(false);
  const [pomodoroMode, setPomodoroMode] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [currentStudySubject, setCurrentStudySubject] = useState('Mathematics');
  const [currentStudyTask, setCurrentStudyTask] = useState('Quadratic Equations Problem Solving');

  // Overlays & Modals
  const [isZenOverlayOpen, setIsZenOverlayOpen] = useState(false);
  const [ambientSound, setAmbientSound] = useState<'OFF' | 'RAIN' | 'CAFE' | 'LIBRARY'>('OFF');
  const [isStopConfirmModalOpen, setIsStopConfirmModalOpen] = useState(false);

  // Reflection modal state
  const [reflectionModalData, setReflectionModalData] = useState<{
    isOpen: boolean;
    mins: number;
    subject: string;
    task: string;
    notes: string;
    rating: number;
    status: 'COMPLETED' | 'EARLY_STOP';
  } | null>(null);

  // Filter & Search states
  const [historySubjectFilter, setHistorySubjectFilter] = useState('ALL');
  const [historyTimeFilter, setHistoryTimeFilter] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK'>('ALL');
  const [historySearchQuery, setHistorySearchQuery] = useState('');

  // Initial Study History
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

  // Load from localStorage and sync with server
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

  // Escape key to exit Zen Mode
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

  // Timer Tick Engine
  useEffect(() => {
    let interval: any = null;
    if (isPomodoroActive && pomodoroSeconds > 0) {
      interval = setInterval(() => {
        setPomodoroSeconds(sec => sec - 1);
      }, 1000);
    } else if (pomodoroSeconds === 0) {
      setIsPomodoroActive(false);
      setReflectionModalData({
        isOpen: true,
        mins: pomodoroMode === 'FOCUS' ? pomodoroDurationMinutes : 5,
        subject: currentStudySubject,
        task: currentStudyTask,
        notes: '',
        rating: 5,
        status: 'COMPLETED',
      });
      toast.success('🎯 Study sprint complete! Log your reflection and take a break.');
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
    const elapsedSeconds = pomodoroDurationMinutes * 60 - pomodoroSeconds;
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
    const elapsedSeconds = pomodoroDurationMinutes * 60 - pomodoroSeconds;
    if (elapsedSeconds > 10) {
      setIsStopConfirmModalOpen(true);
    } else {
      resetPomodoro();
      toast('Timer reset and ready', { icon: '↺' });
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

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        {/* Top Navigation & Close Header */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase bg-purple-100 text-purple-800">
                Senior Focus Studio
              </span>
              <span className="text-xs font-bold text-amber-600 flex items-center gap-1">
                <Flame size={14} className="fill-amber-500" />
                <span>🔥 4-Day Active Streak</span>
              </span>
            </div>
            <h2 className="text-2xl font-black text-gray-900 mt-1">Pomodoro Study Studio & History</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Distraction-free revision sprints with persistent session history, subject analytics, and focus metrics
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            <button
              onClick={() => setIsZenOverlayOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-purple-100 text-purple-800 text-xs font-bold hover:bg-purple-200 transition shadow-2xs"
            >
              <Maximize2 size={14} />
              <span>Zen Fullscreen</span>
            </button>

            <Link
              href="/dashboard/student"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gray-900 hover:bg-black text-white text-xs font-black transition shadow-md"
              title="Close Pomodoro Studio and Return to Student Dashboard"
            >
              <ArrowLeft size={14} />
              <span>Close / Back to Dashboard</span>
            </Link>
          </div>
        </div>

        {/* 4-Stat Top Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase text-gray-400">Total Studied Today</p>
            <p className="text-2xl font-black text-purple-700 mt-0.5">{totalMinutesStudiedToday} Mins</p>
            <p className="text-[11px] text-gray-500 mt-0.5">~{(totalMinutesStudiedToday / 60).toFixed(1)} Hours focused</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase text-gray-400">Completed Sprints</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{pomodoroHistory.length}</p>
            <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Logged in study history</p>
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

        {/* Main Workspace */}
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

        {/* Reflection Modal */}
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

        {/* Confirmation Modal: Stop Active Timer */}
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

        {/* Zen Distraction-Free Fullscreen */}
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
      </div>
    </DashboardLayout>
  );
}
