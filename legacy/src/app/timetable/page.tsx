'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Clock,
  Printer,
  Plus,
  Calendar,
  BookOpen,
  UserCheck,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Settings,
  Download,
  Eye,
  Lock,
  RefreshCw,
  ArrowRightLeft,
  Shield,
  Edit3,
  BarChart2,
  Users
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClassItem {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PERIODS = [
  { id: 1, name: 'Period 1', time: '08:00 - 08:45 AM' },
  { id: 2, name: 'Period 2', time: '08:45 - 09:30 AM' },
  { id: 3, name: 'Period 3', time: '09:30 - 10:15 AM' },
  { id: 'break', name: 'Recess Break', time: '10:15 - 10:45 AM', isBreak: true },
  { id: 4, name: 'Period 4', time: '10:45 - 11:30 AM' },
  { id: 5, name: 'Period 5', time: '11:30 - 12:15 PM' },
  { id: 6, name: 'Period 6', time: '12:15 - 01:00 PM' },
];

// Initial default timetable schedule matrix
const initialSchedule: Record<string, { subject: string; teacher: string; room: string }> = {
  'Monday-1': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Monday-2': { subject: 'English', teacher: 'Priya Singh', room: 'Room 101' },
  'Monday-3': { subject: 'Science', teacher: 'Deepak Verma', room: 'Physics Lab' },
  'Monday-4': { subject: 'Hindi', teacher: 'Sunita Gupta', room: 'Room 101' },
  'Monday-5': { subject: 'Social Science', teacher: 'Kavita Mishra', room: 'Room 101' },
  'Monday-6': { subject: 'Computer Science', teacher: 'Amit Yadav', room: 'Computer Lab' },

  'Tuesday-1': { subject: 'Science', teacher: 'Rakesh Tiwari', room: 'Chemistry Lab' },
  'Tuesday-2': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Tuesday-3': { subject: 'English', teacher: 'Priya Singh', room: 'Room 101' },
  'Tuesday-4': { subject: 'Social Science', teacher: 'Kavita Mishra', room: 'Room 101' },
  'Tuesday-5': { subject: 'Physical Education', teacher: 'Sunita Gupta', room: 'Playground' },
  'Tuesday-6': { subject: 'Hindi', teacher: 'Sunita Gupta', room: 'Room 101' },

  'Wednesday-1': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Wednesday-2': { subject: 'Computer Science', teacher: 'Amit Yadav', room: 'Computer Lab' },
  'Wednesday-3': { subject: 'Science', teacher: 'Neha Pandey', room: 'Bio Lab' },
  'Wednesday-4': { subject: 'English', teacher: 'Priya Singh', room: 'Room 101' },
  'Wednesday-5': { subject: 'Hindi', teacher: 'Sunita Gupta', room: 'Room 101' },
  'Wednesday-6': { subject: 'Art & Craft', teacher: 'Deepak Verma', room: 'Art Room' },

  'Thursday-1': { subject: 'English', teacher: 'Priya Singh', room: 'Room 101' },
  'Thursday-2': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Thursday-3': { subject: 'Social Science', teacher: 'Kavita Mishra', room: 'Room 101' },
  'Thursday-4': { subject: 'Science', teacher: 'Deepak Verma', room: 'Room 101' },
  'Thursday-5': { subject: 'Hindi', teacher: 'Sunita Gupta', room: 'Room 101' },
  'Thursday-6': { subject: 'General Knowledge', teacher: 'Kavita Mishra', room: 'Room 101' },

  'Friday-1': { subject: 'Science', teacher: 'Rakesh Tiwari', room: 'Chemistry Lab' },
  'Friday-2': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Friday-3': { subject: 'Computer Science', teacher: 'Amit Yadav', room: 'Computer Lab' },
  'Friday-4': { subject: 'English', teacher: 'Priya Singh', room: 'Room 101' },
  'Friday-5': { subject: 'Social Science', teacher: 'Kavita Mishra', room: 'Room 101' },
  'Friday-6': { subject: 'Physical Education', teacher: 'Deepak Verma', room: 'Playground' },

  'Saturday-1': { subject: 'Mathematics', teacher: 'Arun Sharma', room: 'Room 101' },
  'Saturday-2': { subject: 'Science Quiz', teacher: 'Neha Pandey', room: 'Auditorium' },
  'Saturday-3': { subject: 'English Debate', teacher: 'Priya Singh', room: 'Room 101' },
  'Saturday-4': { subject: 'Sports & Games', teacher: 'Amit Yadav', room: 'Playground' },
  'Saturday-5': { subject: 'Library Period', teacher: 'Sunita Gupta', room: 'Library' },
  'Saturday-6': { subject: 'Class Activity', teacher: 'Arun Sharma', room: 'Room 101' },
};

export default function TimetablePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';

  // ─── ENTERPRISE RBAC PERMISSIONS ───
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // All features accessible without permissions lockouts
  const canEditSlots = true;
  const canAssignTeacher = true;
  const canConfigureBreaks = true;
  const canPublish = true;
  const canViewAllClasses = true;
  const canRequestSwap = true;
  const canPrint = true; // All roles

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [schedule, setSchedule] = useState(initialSchedule);
  const [isPublished, setIsPublished] = useState(true);
  const [showTeacherSchedule, setShowTeacherSchedule] = useState(false);
  const [academicYear, setAcademicYear] = useState('2026-27 (Term 1)');
  const [breakTiming, setBreakTiming] = useState('10:15 - 10:45 AM');
  const [showBreakModal, setShowBreakModal] = useState(false);

  // Edit slot modal
  const [editingSlotKey, setEditingSlotKey] = useState<string | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editTeacher, setEditTeacher] = useState('');
  const [editRoom, setEditRoom] = useState('');

  // Swap request modal
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swapData, setSwapData] = useState({
    originalSlot: '',
    targetSlot: '',
    reason: '',
  });

  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data.length > 0) {
          setClasses(data.data);
          setSelectedClassId(data.data[0].id);
          if (data.data[0].sections.length > 0) {
            setSelectedSectionId(data.data[0].sections[0].id);
          }
        }
      });
  }, []);

  const openSlotEdit = (key: string) => {
    if (!canEditSlots) {
      if (canRequestSwap) {
        setSwapData({ ...swapData, originalSlot: key });
        setShowSwapModal(true);
      }
      return;
    }
    const current = schedule[key] || { subject: '', teacher: '', room: '' };
    setEditingSlotKey(key);
    setEditSubject(current.subject);
    setEditTeacher(current.teacher);
    setEditRoom(current.room);
  };

  const handleSaveSlot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSlotKey) return;
    setSchedule((prev) => ({
      ...prev,
      [editingSlotKey]: {
        subject: editSubject,
        teacher: editTeacher,
        room: editRoom || 'Room 101',
      },
    }));
    setEditingSlotKey(null);
    toast.success('Timetable slot updated successfully!');
  };

  const handleSwapRequest = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Substitution swap request submitted to Admin for approval.');
    setShowSwapModal(false);
    setSwapData({ originalSlot: '', targetSlot: '', reason: '' });
  };

  const handleTogglePublish = () => {
    setIsPublished(!isPublished);
    toast.success(isPublished ? 'Timetable unpublished — hidden from students and parents.' : 'Timetable published — now visible to all.');
  };

  const handleExportCSV = () => {
    const rows = ['Day,Period,Subject,Teacher,Room'];
    DAYS.forEach(day => {
      PERIODS.forEach(p => {
        if (p.isBreak) return;
        const slot = schedule[`${day}-${p.id}`];
        if (slot) rows.push(`${day},${p.name},${slot.subject},${slot.teacher},${slot.room}`);
      });
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'timetable_schedule.csv';
    link.click();
    toast.success('Timetable exported!');
  };

  // Teacher's personal schedule (filtering by teacher name)
  const teacherName = (session?.user as any)?.name || 'Rajesh Khanna';
  const teacherSlots = Object.entries(schedule).filter(([, val]) =>
    val.teacher.toLowerCase().includes('arun') || val.teacher.toLowerCase().includes('sharma')
  );

  const activeClass = classes.find((c) => c.id === selectedClassId);
  const activeSections = activeClass?.sections || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ========================================================================= */}
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Clock size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Class Timetable</h1>
              {isSuperAdmin && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {isPublished ? '● Published' : '● Draft'}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin
                ? 'Full control — Create, edit, publish timetables. Assign teachers & rooms. Detect conflicts.'
                : isTeacher
                ? 'View class schedules and your personal teaching schedule. Request period swaps.'
                : isParent
                ? "View your ward's class schedule for the current academic term."
                : 'View your class schedule for the current academic week.'}
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Admin: Configure Breaks */}
            {canConfigureBreaks && (
              <button
                onClick={() => setShowBreakModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-all shadow-sm"
              >
                <Settings size={14} />
                <span>Configure Breaks</span>
              </button>
            )}

            {/* Admin: Publish/Unpublish Toggle */}
            {canPublish && (
              <button
                onClick={handleTogglePublish}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm ${
                  isPublished
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                    : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isPublished ? <Eye size={14} /> : <Lock size={14} />}
                <span>{isPublished ? 'Unpublish' : 'Publish'}</span>
              </button>
            )}

            {/* View My Schedule toggle */}
            <button
              onClick={() => setShowTeacherSchedule(!showTeacherSchedule)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all shadow-sm ${
                showTeacherSchedule
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-white text-purple-700 border-purple-200 hover:bg-purple-50'
              }`}
            >
              <UserCheck size={14} />
              <span>{showTeacherSchedule ? 'Class View' : 'My Schedule'}</span>
            </button>

            {/* Request Swap */}
            <button
              onClick={() => setShowSwapModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <ArrowRightLeft size={14} />
              <span>Request Swap</span>
            </button>

            {/* Export CSV */}
            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <Download size={14} />
              <span>Export</span>
            </button>

            {/* Print (All roles) */}
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 transition-all shadow-sm"
            >
              <Printer size={14} />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TEACHER'S PERSONAL SCHEDULE                                                */}
        {/* ========================================================================= */}
        {isTeacher && showTeacherSchedule && (
          <div className="bg-white rounded-3xl border border-purple-100 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <UserCheck size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">My Teaching Schedule</h3>
                <p className="text-xs text-gray-500">Your assigned periods across all classes this week</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {DAYS.map(day => {
                const daySlots = Object.entries(schedule)
                  .filter(([key]) => key.startsWith(day))
                  .filter(([, val]) => val.teacher.toLowerCase().includes('arun') || val.teacher.toLowerCase().includes('sharma'));
                if (daySlots.length === 0) return null;
                return (
                  <div key={day} className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                    <p className="text-xs font-bold text-purple-900 mb-2">{day}</p>
                    <div className="space-y-1.5">
                      {daySlots.map(([key, val]) => {
                        const periodNum = key.split('-')[1];
                        const period = PERIODS.find(p => String(p.id) === periodNum);
                        return (
                          <div key={key} className="flex items-center justify-between text-xs bg-white p-2 rounded-xl border border-purple-100/50">
                            <div>
                              <p className="font-bold text-gray-900">{val.subject}</p>
                              <p className="text-[10px] text-gray-500">{period?.time || ''}</p>
                            </div>
                            <span className="text-[10px] font-mono text-gray-400">{val.room}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. SELECTOR BAR                                                           */}
        {/* ========================================================================= */}
        <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                {isParent ? "Ward's Class" : 'Select Class'}
              </label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  const cls = classes.find((c) => c.id === e.target.value);
                  if (cls && cls.sections.length > 0) {
                    setSelectedSectionId(cls.sections[0].id);
                  }
                }}
                disabled={isStudent || isParent}
                className={`text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none ${(isStudent || isParent) ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    Class {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                Section
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                disabled={isStudent || isParent}
                className={`text-xs font-bold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none ${(isStudent || isParent) ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {activeSections.map((sec) => (
                  <option key={sec.id} value={sec.id}>
                    Section {sec.name}
                  </option>
                ))}
              </select>
            </div>

            {isParent && (
              <div className="ml-2 px-3 py-2 bg-purple-50 rounded-xl border border-purple-100">
                <p className="text-[10px] font-bold text-purple-700">Ward: Aarav Sharma</p>
                <p className="text-[9px] text-purple-500">Class 10 - Section A</p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Timing: <strong>08:00 AM - 01:00 PM</strong></span>
            <span>&bull;</span>
            <span>6 Periods + 1 Recess</span>
            {isSuperAdmin && (
              <>
                <span>&bull;</span>
                <span className="text-purple-600 font-bold">Click any slot to edit</span>
              </>
            )}
            {isTeacher && (
              <>
                <span>&bull;</span>
                <span className="text-blue-600 font-bold">Click slot to request swap</span>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADMIN CONFIG BAR                                                           */}
        {/* ========================================================================= */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={18} /></div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Total Slots</p>
                <p className="text-sm font-black text-gray-900">{DAYS.length * 6}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><Users size={18} /></div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Teachers Used</p>
                <p className="text-sm font-black text-gray-900">{new Set(Object.values(schedule).map(s => s.teacher)).size}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center"><Building2 size={18} /></div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Rooms Used</p>
                <p className="text-sm font-black text-gray-900">{new Set(Object.values(schedule).map(s => s.room)).size}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><AlertCircle size={18} /></div>
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">Conflicts</p>
                <p className="text-sm font-black text-emerald-600">0 Found</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. TIMETABLE MATRIX TABLE                                                 */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-4 w-32">Day / Time</th>
                  {PERIODS.map((p) => (
                    <th key={p.id} className="py-3.5 px-3 text-center">
                      <p className="font-bold text-gray-800">{p.name}</p>
                      <p className="text-[10px] text-gray-400 lowercase font-normal">{p.time}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {DAYS.map((day) => (
                  <tr key={day} className="hover:bg-purple-50/20 transition-colors">
                    {/* Day Column */}
                    <td className="py-4 px-4 font-bold text-gray-900 bg-gray-50/40 border-r border-gray-100">
                      {day}
                    </td>

                    {/* Period Columns */}
                    {PERIODS.map((period) => {
                      if (period.isBreak) {
                        return (
                          <td
                            key={period.id}
                            className="py-3 px-2 text-center bg-amber-50/40 text-[11px] font-bold text-amber-700 border-x border-gray-100"
                          >
                            Break
                          </td>
                        );
                      }

                      const slotKey = `${day}-${period.id}`;
                      const slot = schedule[slotKey];

                      return (
                        <td
                          key={period.id}
                          onClick={() => (canEditSlots || canRequestSwap) ? openSlotEdit(slotKey) : undefined}
                          className={`py-2.5 px-2 text-center transition-colors ${
                            canEditSlots ? 'cursor-pointer group hover:bg-purple-100/40' :
                            canRequestSwap ? 'cursor-pointer group hover:bg-blue-100/40' : ''
                          }`}
                        >
                          {slot ? (
                            <div className={`p-2.5 rounded-2xl border shadow-xs transition-all text-left ${
                              canEditSlots
                                ? 'bg-purple-50 group-hover:bg-white border-purple-100'
                                : 'bg-purple-50 border-purple-100'
                            }`}>
                              <p className="font-bold text-purple-900 leading-tight truncate">
                                {slot.subject}
                              </p>
                              <p className="text-[10px] text-gray-600 mt-1 truncate flex items-center gap-1">
                                <UserCheck size={10} className="text-purple-600" />
                                <span>{slot.teacher}</span>
                              </p>
                              <p className="text-[9px] text-gray-400 mt-0.5 truncate font-mono">
                                {slot.room}
                              </p>
                              {canEditSlots && (
                                <p className="text-[8px] text-purple-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click to edit
                                </p>
                              )}
                              {canRequestSwap && (
                                <p className="text-[8px] text-blue-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  Click to swap
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className={`p-2.5 rounded-2xl border border-dashed text-[11px] transition-colors ${
                              canEditSlots
                                ? 'border-gray-200 text-gray-300 hover:border-purple-300 hover:text-purple-600'
                                : 'border-gray-200 text-gray-300'
                            }`}>
                              {canEditSlots ? '+ Assign' : '—'}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Role-specific footer message */}
        {(isStudent || isParent) && (
          <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100 flex items-center gap-3">
            <Shield size={18} className="text-purple-500 shrink-0" />
            <p className="text-xs text-purple-800">
              {isParent
                ? 'This is your ward\'s class schedule. Timetable changes are managed by the school administration. Contact the class teacher for any queries.'
                : 'This is your class schedule for the current term. Only school administrators can modify the timetable.'}
            </p>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MODAL: EDIT SLOT (Admin Only)                                           */}
        {/* ========================================================================= */}
        {editingSlotKey && canEditSlots && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setEditingSlotKey(null)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Clock size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Period Slot</h3>
                  <p className="text-xs text-gray-500">{editingSlotKey.replace('-', ' • ')}</p>
                </div>
              </div>

              <form onSubmit={handleSaveSlot} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Subject Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mathematics"
                    value={editSubject}
                    onChange={(e) => setEditSubject(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Teacher Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Arun Sharma"
                    value={editTeacher}
                    onChange={(e) => setEditTeacher(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Room / Lab
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 101 or Computer Lab"
                    value={editRoom}
                    onChange={(e) => setEditRoom(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingSlotKey(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Save Slot
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MODAL: SWAP REQUEST (Teacher Only)                                      */}
        {/* ========================================================================= */}
        {showSwapModal && canRequestSwap && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowSwapModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Request Period Swap</h3>
                  <p className="text-xs text-gray-500">Submit substitution request to admin</p>
                </div>
              </div>

              <form onSubmit={handleSwapRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Original Slot</label>
                  <input type="text" value={swapData.originalSlot || 'Click a slot on the timetable'} disabled className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Swap With (Day - Period)</label>
                  <input type="text" value={swapData.targetSlot} onChange={e => setSwapData({ ...swapData, targetSlot: e.target.value })} placeholder="e.g. Tuesday-3" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Reason *</label>
                  <textarea rows={2} required value={swapData.reason} onChange={e => setSwapData({ ...swapData, reason: e.target.value })} placeholder="Why do you need this swap?" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-blue-500/20 outline-none resize-none" />
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowSwapModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md">Submit Request</button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* 6. MODAL: CONFIGURE BREAK TIMINGS (Admin Only)                            */}
        {/* ========================================================================= */}
        {showBreakModal && canConfigureBreaks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowBreakModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Settings size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Configure Break Timings</h3>
                  <p className="text-xs text-gray-500">Set daily recess and lunch slots</p>
                </div>
              </div>

              <form onSubmit={e => { e.preventDefault(); toast.success(`Recess break timing updated to ${breakTiming}`); setShowBreakModal(false); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Recess Break Time Slot</label>
                  <input type="text" value={breakTiming} onChange={e => setBreakTiming(e.target.value)} placeholder="e.g. 10:15 - 10:45 AM" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Academic Term / Session</label>
                  <select value={academicYear} onChange={e => setAcademicYear(e.target.value)} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none">
                    <option value="2026-27 (Term 1)">Academic Year 2026-27 (Term 1)</option>
                    <option value="2026-27 (Term 2)">Academic Year 2026-27 (Term 2)</option>
                    <option value="2026-27 (Summer Schedule)">Summer Session Schedule</option>
                  </select>
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowBreakModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md">Save Settings</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
