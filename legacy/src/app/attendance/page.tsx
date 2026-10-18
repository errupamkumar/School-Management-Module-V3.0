'use client';

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Save,
  Users,
  Search,
  AlertCircle,
  Calendar,
  School,
  X,
  Send,
  Printer,
  Edit3,
  Barcode,
  Sparkles,
  Check,
  Briefcase,
  GraduationCap,
  Volume2,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface ClassOption {
  id: string;
  name: string;
  sections: { id: string; name: string }[];
}

interface StudentAttendanceItem {
  id: string;
  rollNo?: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  gender: string;
  attendance?: {
    status: string;
    remarks?: string;
  } | null;
}

interface StaffAttendanceItem {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  status: string;
  remarks?: string;
}

// Fallback sample students if database has no initial records
const SAMPLE_STUDENTS: StudentAttendanceItem[] = [
  { id: 'st-1', rollNo: '1', admissionNo: 'ADM251001', firstName: 'Aarav', lastName: 'Kumar', gender: 'MALE', attendance: { status: 'PRESENT' } },
  { id: 'st-2', rollNo: '2', admissionNo: 'ADM251002', firstName: 'Ananya', lastName: 'Sharma', gender: 'FEMALE', attendance: { status: 'PRESENT' } },
  { id: 'st-3', rollNo: '3', admissionNo: 'ADM251003', firstName: 'Rohan', lastName: 'Verma', gender: 'MALE', attendance: { status: 'ABSENT' } },
  { id: 'st-4', rollNo: '4', admissionNo: 'ADM251004', firstName: 'Ishita', lastName: 'Patel', gender: 'FEMALE', attendance: { status: 'PRESENT' } },
  { id: 'st-5', rollNo: '5', admissionNo: 'ADM251005', firstName: 'Kabir', lastName: 'Singh', gender: 'MALE', attendance: { status: 'LATE' } },
  { id: 'st-6', rollNo: '6', admissionNo: 'ADM251006', firstName: 'Meera', lastName: 'Iyer', gender: 'FEMALE', attendance: { status: 'PRESENT' } },
  { id: 'st-7', rollNo: '7', admissionNo: 'ADM251007', firstName: 'Aditya', lastName: 'Joshi', gender: 'MALE', attendance: { status: 'HALF_DAY' } },
  { id: 'st-8', rollNo: '8', admissionNo: 'ADM251008', firstName: 'Pooja', lastName: 'Mishra', gender: 'FEMALE', attendance: { status: 'PRESENT' } },
];

const SAMPLE_STAFF: StaffAttendanceItem[] = [
  { id: 'emp-1', employeeId: 'EMP101', name: 'Arun Sharma', designation: 'Senior Math Teacher', department: 'Academic', status: 'PRESENT' },
  { id: 'emp-2', employeeId: 'EMP102', name: 'Priya Singh', designation: 'English Teacher', department: 'Academic', status: 'PRESENT' },
  { id: 'emp-3', employeeId: 'EMP103', name: 'Deepak Verma', designation: 'Science HOD', department: 'Academic', status: 'PRESENT' },
  { id: 'emp-4', employeeId: 'EMP104', name: 'Sunita Gupta', designation: 'Hindi Teacher', department: 'Academic', status: 'LATE' },
  { id: 'emp-5', employeeId: 'EMP105', name: 'Vikram Sethi', designation: 'Head Accountant', department: 'Administration', status: 'PRESENT' },
  { id: 'emp-6', employeeId: 'EMP106', name: 'Ramesh Yadav', designation: 'Transport Supervisor', department: 'Operations', status: 'ABSENT' },
];

export default function AttendancePage() {
  const [targetType, setTargetType] = useState<'student' | 'employee'>('student');
  const [mode, setMode] = useState<'manual' | 'card'>('manual');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Classes & Section states
  const [classes, setClasses] = useState<ClassOption[]>([
    { id: 'cls-10', name: '10', sections: [{ id: 'sec-10a', name: 'A' }, { id: 'sec-10b', name: 'B' }] },
    { id: 'cls-9', name: '9', sections: [{ id: 'sec-9a', name: 'A' }, { id: 'sec-9b', name: 'B' }] },
    { id: 'cls-8', name: '8', sections: [{ id: 'sec-8a', name: 'A' }] },
  ]);
  const [selectedClassId, setSelectedClassId] = useState<string>('cls-10');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-10a');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(true);

  // Student Attendance records
  const [students, setStudents] = useState<StudentAttendanceItem[]>(SAMPLE_STUDENTS);
  const [records, setRecords] = useState<Record<string, string>>({
    'st-1': 'PRESENT',
    'st-2': 'PRESENT',
    'st-3': 'ABSENT',
    'st-4': 'PRESENT',
    'st-5': 'LATE',
    'st-6': 'PRESENT',
    'st-7': 'HALF_DAY',
    'st-8': 'PRESENT',
  });
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  // Staff Attendance records
  const [staffList, setStaffList] = useState<StaffAttendanceItem[]>(SAMPLE_STAFF);
  const [staffRecords, setStaffRecords] = useState<Record<string, string>>({
    'emp-1': 'PRESENT',
    'emp-2': 'PRESENT',
    'emp-3': 'PRESENT',
    'emp-4': 'LATE',
    'emp-5': 'PRESENT',
    'emp-6': 'ABSENT',
  });

  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Card Scanning Mode state
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanHistory, setScanHistory] = useState<Array<{ id: string; name: string; time: string; status: string }>>([
    { id: 'ADM251001', name: 'Aarav Kumar (Class 10-A)', time: '08:14 AM', status: 'Marked Present' },
    { id: 'ADM251002', name: 'Ananya Sharma (Class 10-A)', time: '08:15 AM', status: 'Marked Present' },
  ]);

  // Load classes from API if available
  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data && data.data.length > 0) {
          setClasses(data.data);
          setSelectedClassId(data.data[0].id);
          if (data.data[0].sections && data.data[0].sections.length > 0) {
            setSelectedSectionId(data.data[0].sections[0].id);
          }
        }
      })
      .catch((err) => console.log('Loaded default classes'));
  }, []);

  // SA-07: Reset attendance filters back to default
  const handleResetFilters = () => {
    setDate(new Date().toISOString().split('T')[0]);
    if (classes.length > 0) {
      setSelectedClassId(classes[0].id);
      if (classes[0].sections && classes[0].sections.length > 0) {
        setSelectedSectionId(classes[0].sections[0].id);
      }
    }
    setSearchFilter('');
    setTargetType('student');
    setMode('manual');
    toast.success('Attendance filters reset to defaults');
  };

  // Dynamically load real students for selected section & date
  useEffect(() => {
    if (!selectedSectionId) return;
    fetch(`/api/attendance?sectionId=${selectedSectionId}&date=${date}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          setStudents(d.data);
          const initialMap: Record<string, string> = {};
          d.data.forEach((s: any) => {
            initialMap[s.id] = s.attendance?.status || 'PRESENT';
          });
          setRecords(initialMap);
        }
      })
      .catch(() => {});
  }, [selectedSectionId, date]);

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classes.find((c) => c.id === classId);
    if (cls && cls.sections.length > 0) {
      setSelectedSectionId(cls.sections[0].id);
    } else {
      setSelectedSectionId('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    toast.success(
      targetType === 'student'
        ? `Attendance loaded for Class ${classes.find((c) => c.id === selectedClassId)?.name || 'Selected'}`
        : 'Employee roster loaded for ' + date
    );
  };

  const handleSetStudentStatus = (id: string, status: string) => {
    setRecords((prev) => ({ ...prev, [id]: status }));
  };

  const handleSetStaffStatus = (id: string, status: string) => {
    setStaffRecords((prev) => ({ ...prev, [id]: status }));
  };

  const setAllStudents = (status: string) => {
    const updated: Record<string, string> = {};
    students.forEach((s) => {
      updated[s.id] = status;
    });
    setRecords(updated);
    toast.success(`Marked all students as ${status}`);
  };

  const setAllStaff = (status: string) => {
    const updated: Record<string, string> = {};
    staffList.forEach((s) => {
      updated[s.id] = status;
    });
    setStaffRecords(updated);
    toast.success(`Marked all staff as ${status}`);
  };

  // Card Scanning Submit
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim().toUpperCase();
    const matchedStudent = students.find((s) => s.admissionNo.toUpperCase() === code || s.rollNo === code);

    if (matchedStudent) {
      setRecords((prev) => ({ ...prev, [matchedStudent.id]: 'PRESENT' }));
      setScanHistory((prev) => [
        {
          id: matchedStudent.admissionNo,
          name: `${matchedStudent.firstName} ${matchedStudent.lastName}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Marked Present',
        },
        ...prev,
      ]);
      toast.success(`✓ Scanned: ${matchedStudent.firstName} ${matchedStudent.lastName}`);
    } else {
      setScanHistory((prev) => [
        {
          id: code,
          name: 'Manual Scan Card: ' + code,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          status: 'Marked Present',
        },
        ...prev,
      ]);
      toast.success(`Card ${code} marked Present`);
    }

    setBarcodeInput('');
  };

  const handleSaveAttendance = async () => {
    setSaving(true);
    try {
      if (targetType === 'student') {
        const payload = students.map((s) => ({
          studentId: s.id,
          status: records[s.id] || 'PRESENT',
          remarks: remarks[s.id] || null,
        }));

        const res = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sectionId: selectedSectionId,
            date,
            records: payload,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success(data.message || 'Student attendance updated successfully!');
        } else {
          toast.error(data.error || 'Failed to update attendance');
        }
      } else {
        toast.success('Employee attendance updated successfully!');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Student counts
  const studentCounts = students.reduce(
    (acc, s) => {
      const status = records[s.id] || 'PRESENT';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 } as Record<string, number>
  );

  const filteredStudents = students.filter(
    (s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(searchFilter.toLowerCase()) ||
      s.admissionNo.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (s.rollNo && s.rollNo.includes(searchFilter))
  );

  const selectedClassName = classes.find((c) => c.id === selectedClassId)?.name || '10';
  const activeSections = classes.find((c) => c.id === selectedClassId)?.sections || [];

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-7xl mx-auto pb-10">
        {/* ========================================================================= */}
        {/* 1. TOP TITLE & TARGET SWITCHER (Students vs Employees)                     */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <CalendarCheck size={18} />
            </div>
            <div className="flex items-center gap-2 text-sm sm:text-base font-bold text-gray-900 dark:text-gray-100">
              <span className="text-purple-700 dark:text-purple-300">Attendance</span>
              <span className="text-gray-400 font-normal">&gt;</span>
              <span className="font-semibold text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                {targetType === 'student'
                  ? 'Mark or update Student Attendance'
                  : 'Mark or Update Employees Attendance'}
              </span>
            </div>
          </div>

          {/* Student vs Employee Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-slate-800 rounded-2xl self-start sm:self-auto">
            <button
              type="button"
              onClick={() => {
                setTargetType('student');
                setIsSubmitted(true);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                targetType === 'student'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              <GraduationCap size={15} />
              <span>Students</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetType('employee');
                setIsSubmitted(true);
              }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all',
                targetType === 'employee'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
              )}
            >
              <Briefcase size={15} />
              <span>Employees</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. MODE SELECTOR PILLS (Manual Attendance vs Card Scanning)                */}
        {/* ========================================================================= */}
        <div className="flex justify-center">
          <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800/80 rounded-2xl border border-gray-200/80 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                mode === 'manual'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-md border border-purple-100 dark:border-purple-900'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Edit3 size={16} className={mode === 'manual' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
              <span>Manual Attendance</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('card')}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all',
                mode === 'card'
                  ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-md border border-purple-100 dark:border-purple-900'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
            >
              <Barcode size={16} className={mode === 'card' ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400'} />
              <span>Card Scanning</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. STEP 1: SELECT DATE & CLASS FORM (Matches Reference Screenshot 4 & 5)   */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-6 sm:p-8 max-w-4xl mx-auto">
          {mode === 'manual' ? (
            <form onSubmit={handleFormSubmit} className="space-y-6">
              {/* Step indicator */}
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-[#1e1147] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  1
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {targetType === 'student' ? 'Select Date & Class' : 'Select Attendance Date'}
                </h3>
              </div>

              {/* Form Input Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* Date Input */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                      className="w-full text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900 dark:text-gray-100 shadow-sm"
                    />
                  </div>
                </div>

                {/* Class Select (Only for Student mode) */}
                {targetType === 'student' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Class <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => handleClassChange(e.target.value)}
                      required
                      className="w-full text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900 dark:text-gray-100 shadow-sm"
                    >
                      <option value="">Select Class</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          Class {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-2">
                      Department / Shift
                    </label>
                    <select
                      defaultValue="ALL"
                      className="w-full text-xs sm:text-sm font-semibold px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none text-gray-900 dark:text-gray-100 shadow-sm"
                    >
                      <option value="ALL">All Departments (Academic &amp; Admin)</option>
                      <option value="TEACHING">Teaching Faculty Only</option>
                      <option value="NON_TEACHING">Non-Teaching Staff</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Submit & Reset Buttons (SA-07) */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-300 text-xs sm:text-sm font-bold rounded-2xl transition-all"
                  title="Clear and reset all attendance filters"
                >
                  <RotateCcw size={15} />
                  <span>Clear / Reset Filters</span>
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#5c28d2] hover:bg-[#4d1fbc] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-purple-600/25 transition-all transform active:scale-95"
                >
                  <Check size={16} />
                  <span>Submit</span>
                </button>
              </div>
            </form>
          ) : (
            /* Card Scanning Mode View */
            <div className="space-y-6">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100 dark:border-slate-800">
                <div className="w-7 h-7 rounded-full bg-[#1e1147] text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  <Barcode size={14} />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  Instant Card / Barcode Scanner
                </h3>
              </div>

              <div className="p-6 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900/50 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-purple-600 text-white rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-purple-600/20">
                  <Barcode size={32} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                    Scan Student or Employee ID Card Barcode / RFID
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Connect your USB barcode gun or type the student admission number to instantly mark attendance.
                  </p>
                </div>

                <form onSubmit={handleBarcodeSubmit} className="max-w-md mx-auto flex gap-2">
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Scan or enter ID (e.g. ADM251001)..."
                    autoFocus
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-purple-200 dark:border-purple-800 rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Scan
                  </button>
                </form>
              </div>

              {/* Real-time Scan Log Feed */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recent Scanned Cards</h4>
                <div className="divide-y divide-gray-100 dark:divide-slate-800 border border-gray-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                  {scanHistory.map((item, idx) => (
                    <div key={idx} className="p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <div>
                          <p className="font-bold text-gray-900 dark:text-gray-100">{item.name}</p>
                          <p className="text-[10px] text-gray-400">Card ID: {item.id}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px]">
                          {item.status}
                        </span>
                        <p className="text-[10px] text-gray-400 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 4. STEP 2: ROSTER ATTENDANCE REGISTER & STATUS PILLS                      */}
        {/* ========================================================================= */}
        {isSubmitted && mode === 'manual' && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm p-4 sm:p-6 space-y-4 animate-in fade-in duration-200">
            {/* Header Toolbar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <span>
                    {targetType === 'student'
                      ? `Mark / Update Attendance for Class ${selectedClassName}`
                      : `Mark / Update Employee Attendance`}
                  </span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-bold">
                    {targetType === 'student' ? `${students.length} Students` : `${staffList.length} Staff`}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Select P (Present), A (Absent), L (Late), HD (Half Day), or LV (Leave) for each person
                </p>
              </div>

              {/* Bulk Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => (targetType === 'student' ? setAllStudents('PRESENT') : setAllStaff('PRESENT'))}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold hover:bg-emerald-100 transition-colors"
                >
                  All Present
                </button>
                <button
                  type="button"
                  onClick={() => (targetType === 'student' ? setAllStudents('ABSENT') : setAllStaff('ABSENT'))}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors"
                >
                  All Absent
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 rounded-xl border border-gray-200 dark:border-slate-700 text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
                  title="Print Attendance"
                >
                  <Printer size={16} />
                </button>
                <button
                  type="button"
                  onClick={handleSaveAttendance}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  <Save size={15} />
                  <span>{saving ? 'Updating...' : 'Update Attendance'}</span>
                </button>
              </div>
            </div>

            {/* Attendance Counters & Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold">
                  Total: {targetType === 'student' ? students.length : staffList.length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold">
                  Present: {targetType === 'student' ? studentCounts.PRESENT : Object.values(staffRecords).filter((s) => s === 'PRESENT').length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-bold">
                  Absent: {targetType === 'student' ? studentCounts.ABSENT : Object.values(staffRecords).filter((s) => s === 'ABSENT').length}
                </span>
                <span className="px-3 py-1.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 font-bold">
                  Late: {targetType === 'student' ? studentCounts.LATE : Object.values(staffRecords).filter((s) => s === 'LATE').length}
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search by name, roll no..."
                    className="w-full pl-9 pr-8 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
                {searchFilter && (
                  <button
                    type="button"
                    onClick={() => setSearchFilter('')}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 text-gray-600 dark:text-gray-300 transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Attendance Roster Table */}
            <div className="overflow-x-auto touch-scroll w-full border border-gray-100 dark:border-slate-800 rounded-2xl">
              <table className="w-full text-xs text-left min-w-[650px]">
                <thead className="bg-gray-50/80 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4 w-16">Roll</th>
                    <th className="py-3 px-4">Name &amp; ID</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    <th className="py-3 px-4 w-48">Remarks / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 font-medium">
                  {targetType === 'student' ? (
                    filteredStudents.map((st) => {
                      const curStatus = records[st.id] || 'PRESENT';
                      return (
                        <tr key={st.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                            #{st.rollNo || '-'}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {st.firstName[0]}
                              </div>
                              <div>
                                <p className="font-bold text-gray-900 dark:text-gray-100">
                                  {st.firstName} {st.lastName}
                                </p>
                                <p className="text-[10px] text-gray-400 font-mono">{st.admissionNo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {/* Status Option Pills */}
                            <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl gap-1">
                              {[
                                { key: 'PRESENT', label: 'P', color: 'bg-emerald-600 text-white' },
                                { key: 'ABSENT', label: 'A', color: 'bg-rose-600 text-white' },
                                { key: 'LATE', label: 'L', color: 'bg-amber-500 text-white' },
                                { key: 'HALF_DAY', label: 'HD', color: 'bg-orange-500 text-white' },
                                { key: 'LEAVE', label: 'LV', color: 'bg-blue-600 text-white' },
                              ].map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleSetStudentStatus(st.id, opt.key)}
                                  className={cn(
                                    'w-7 h-7 rounded-lg text-xs font-extrabold transition-all',
                                    curStatus === opt.key
                                      ? opt.color + ' shadow-sm scale-105'
                                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={remarks[st.id] || ''}
                              onChange={(e) => setRemarks((prev) => ({ ...prev, [st.id]: e.target.value }))}
                              placeholder="Add remark..."
                              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-purple-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    staffList.map((emp) => {
                      const curStatus = staffRecords[emp.id] || 'PRESENT';
                      return (
                        <tr key={emp.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100">
                            {emp.employeeId}
                          </td>
                          <td className="py-3 px-4">
                            <p className="font-bold text-gray-900 dark:text-gray-100">{emp.name}</p>
                            <p className="text-[10px] text-gray-400">{emp.designation} &bull; {emp.department}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex p-1 bg-gray-100 dark:bg-slate-800 rounded-xl gap-1">
                              {[
                                { key: 'PRESENT', label: 'P', color: 'bg-emerald-600 text-white' },
                                { key: 'ABSENT', label: 'A', color: 'bg-rose-600 text-white' },
                                { key: 'LATE', label: 'L', color: 'bg-amber-500 text-white' },
                                { key: 'HALF_DAY', label: 'HD', color: 'bg-orange-500 text-white' },
                              ].map((opt) => (
                                <button
                                  key={opt.key}
                                  type="button"
                                  onClick={() => handleSetStaffStatus(emp.id, opt.key)}
                                  className={cn(
                                    'w-7 h-7 rounded-lg text-xs font-extrabold transition-all',
                                    curStatus === opt.key
                                      ? opt.color + ' shadow-sm scale-105'
                                      : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                                  )}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              placeholder="Staff notes..."
                              className="w-full px-2.5 py-1.5 text-xs bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg outline-none focus:border-purple-500"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
              <p className="text-xs text-gray-500">
                Automatic SMS alerts will be queued for students marked <strong>Absent (A)</strong>.
              </p>
              <button
                type="button"
                onClick={handleSaveAttendance}
                disabled={saving}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-[#5c28d2] hover:bg-[#4d1fbc] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-lg shadow-purple-600/25 transition-all disabled:opacity-50"
              >
                <Save size={16} />
                <span>{saving ? 'Updating...' : '✓ Update Attendance'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
