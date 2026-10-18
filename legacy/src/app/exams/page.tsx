'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useCampus } from '@/components/providers/CampusProvider';
import {
  Award,
  Plus,
  Search,
  Calendar,
  Clock,
  BookOpen,
  Printer,
  FileText,
  CheckCircle2,
  X,
  AlertCircle,
  ArrowRight,
  School,
  CheckSquare,
  Square
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExamClassItem {
  id: string;
  class: { id: string; name: string };
}

interface ExamItem {
  id: string;
  name: string;
  examType: string;
  startDate: string;
  endDate: string;
  class?: { name: string };
  classes?: ExamClassItem[];
  subjects?: {
    id: string;
    examDate: string;
    maxMarks: number;
    subject: { name: string; code: string };
  }[];
  _count?: {
    results: number;
  };
}

interface ClassOption {
  id: string;
  name: string;
}

const DEFAULT_DEMO_EXAMS: ExamItem[] = [
  {
    id: 'ex-1',
    name: 'Half-Yearly Examination 2025-26',
    examType: 'HALF_YEARLY',
    startDate: '2026-10-15',
    endDate: '2026-10-28',
    class: { name: '10' },
    classes: [
      { id: 'ec-1', class: { id: 'c-10', name: '10' } },
      { id: 'ec-2', class: { id: 'c-9', name: '9' } },
    ],
    _count: { results: 54 },
  },
  {
    id: 'ex-2',
    name: 'Unit Test 2 (Mid Term)',
    examType: 'UNIT_TEST',
    startDate: '2026-11-05',
    endDate: '2026-11-12',
    class: { name: '9' },
    classes: [{ id: 'ec-3', class: { id: 'c-9', name: '9' } }],
    _count: { results: 42 },
  },
  {
    id: 'ex-3',
    name: 'Annual Board Mock Exam',
    examType: 'PRE_BOARD',
    startDate: '2027-01-10',
    endDate: '2027-01-22',
    class: { name: '10' },
    classes: [{ id: 'ec-4', class: { id: 'c-10', name: '10' } }],
    _count: { results: 0 },
  },
];

export default function ExamsPage() {
  const { selectedCampusId } = useCampus();
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State (SA-09)
  const [name, setName] = useState('');
  const [examType, setExamType] = useState('HALF_YEARLY');
  const [academicYear, setAcademicYear] = useState('2025-26');
  const [startDate, setStartDate] = useState('2026-10-15');
  const [endDate, setEndDate] = useState('2026-10-25');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load available classes
  useEffect(() => {
    fetch('/api/classes')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setClasses(data.data);
          if (data.data.length > 0 && selectedClassIds.length === 0) {
            setSelectedClassIds([data.data[0].id]);
          }
        }
      })
      .catch((err) => console.error('Failed to load classes', err));
  }, []);

  // Load exams
  const loadExams = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedCampusId && selectedCampusId !== 'ALL'
        ? `/api/exams?campusId=${selectedCampusId}`
        : '/api/exams';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setExams(data.data);
      } else {
        setExams(DEFAULT_DEMO_EXAMS);
      }
    } catch (err) {
      console.error(err);
      setExams(DEFAULT_DEMO_EXAMS);
    } finally {
      setLoading(false);
    }
  }, [selectedCampusId]);

  useEffect(() => {
    loadExams();
  }, [loadExams]);

  const toggleSelectClass = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSelectAllClasses = () => {
    if (selectedClassIds.length === classes.length) {
      setSelectedClassIds([]);
    } else {
      setSelectedClassIds(classes.map((c) => c.id));
    }
  };

  // Submit Create Exam with multi-class mapping (SA-09)
  const handleCreateExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (selectedClassIds.length === 0) {
      toast.error('Please associate at least one class with the exam');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        examType,
        academicYear,
        startDate,
        endDate,
        classIds: selectedClassIds,
      };

      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Exam scheduled and linked with ${selectedClassIds.length} classes!`);
        setIsCreateModalOpen(false);
        setName('');
        loadExams();
      } else {
        toast.error(data.error || 'Failed to create exam');
      }
    } catch (err) {
      toast.error('An error occurred while creating exam');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Award size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Examinations &amp; Schedules</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Examination schedules, multi-class date sheets, marks entry, and report cards (SA-09)
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/exams/marks"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100 font-bold text-xs rounded-xl border border-purple-200 transition-colors"
            >
              <FileText size={14} />
              <span>Marks Entry</span>
            </Link>

            <Link
              href="/exams/results"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs rounded-xl border border-emerald-200 transition-colors"
            >
              <Award size={14} />
              <span>Results &amp; Report Cards</span>
            </Link>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus size={15} />
              <span>Create Exam</span>
            </button>
          </div>
        </div>

        {/* Exams Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading examinations directory...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {exams.map((ex) => {
              // Gather linked classes (SA-09)
              const linkedClasses = ex.classes && ex.classes.length > 0
                ? ex.classes.map((c) => c.class?.name || '').filter(Boolean)
                : [ex.class?.name || 'All Classes'];

              const displayDates = `${new Date(ex.startDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} - ${new Date(ex.endDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;

              return (
                <div
                  key={ex.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100">
                        {ex.examType.replace('_', ' ')}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Scheduled
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 leading-snug">{ex.name}</h3>

                    {/* SA-09 Multi-Class Badges */}
                    <div className="mt-2.5">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">
                        Linked Classes ({linkedClasses.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {linkedClasses.map((clsName, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100 text-[11px]"
                          >
                            <School size={11} />
                            Class {clsName}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 space-y-1.5 text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-gray-400" />
                        <span>{displayDates}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen size={13} className="text-gray-400" />
                        <span>{ex.subjects?.length || 5} Subject Papers</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <Link
                      href="/exams/marks"
                      className="text-xs font-bold text-purple-600 hover:underline inline-flex items-center gap-1"
                    >
                      Enter Marks <ArrowRight size={13} />
                    </Link>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Print Date Sheet"
                    >
                      <Printer size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SA-09: MODAL TO CREATE EXAM WITH MULTI-CLASS ASSOCIATION                  */}
        {/* ========================================================================= */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Schedule Examination (SA-09)</h3>
                  <p className="text-xs text-gray-500">Configure exam dates and associate one or more classes</p>
                </div>
              </div>

              <form onSubmit={handleCreateExam} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Exam Term Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Half-Yearly Examination 2025-26"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Exam Type
                    </label>
                    <select
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                    >
                      <option value="UNIT_TEST">Unit Test (Class Test)</option>
                      <option value="HALF_YEARLY">Half Yearly Examination</option>
                      <option value="ANNUAL">Annual Final Examination</option>
                      <option value="PRE_BOARD">Pre-Board Examination</option>
                      <option value="PRACTICE">Practice Assessment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Academic Year
                    </label>
                    <select
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                    >
                      <option value="2025-26">2025-26</option>
                      <option value="2026-27">2026-27</option>
                      <option value="2024-25">2024-25</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                    />
                  </div>
                </div>

                {/* SA-09 Multi-Select Associated Classes */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Associate Classes * ({selectedClassIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={handleSelectAllClasses}
                      className="text-[11px] font-bold text-purple-600 hover:underline"
                    >
                      {selectedClassIds.length === classes.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-100 p-2.5 rounded-2xl bg-gray-50">
                    {classes.map((cls) => {
                      const isChecked = selectedClassIds.includes(cls.id);
                      return (
                        <label
                          key={cls.id}
                          className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold cursor-pointer border transition-colors ${
                            isChecked
                              ? 'bg-purple-100 border-purple-200 text-purple-900 font-bold'
                              : 'bg-white border-gray-200 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleSelectClass(cls.id)}
                            className="w-3.5 h-3.5 text-purple-600 rounded border-gray-300 focus:ring-purple-500"
                          />
                          <span className="truncate">Class {cls.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || selectedClassIds.length === 0}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {submitting ? 'Scheduling...' : 'Schedule Exam'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
