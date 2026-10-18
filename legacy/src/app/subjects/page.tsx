'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Layers,
  GraduationCap,
  FlaskConical,
  BookMarked,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  ArrowRightLeft,
  Check,
  Building2
} from 'lucide-react';

interface ClassInfo {
  id: string;
  name: string;
  numericOrder: number;
}

interface SubjectItem {
  id: string;
  name: string;
  code: string;
  subjectType: string; // 'THEORY' | 'PRACTICAL' | 'BOTH'
  isOptional: boolean;
  classSubjects?: {
    class: ClassInfo;
  }[];
  _count?: {
    classSubjects: number;
    teacherSubjects: number;
  };
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'THEORY' | 'PRACTICAL' | 'BOTH'>('ALL');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [assignedSubjectIds, setAssignedSubjectIds] = useState<string[]>([]);

  // Add Subject Form
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subjectType, setSubjectType] = useState('THEORY');
  const [isOptional, setIsOptional] = useState(false);
  const [selectedInitialClasses, setSelectedInitialClasses] = useState<string[]>([]);

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subjRes, classRes] = await Promise.all([
        fetch('/api/subjects'),
        fetch('/api/classes'),
      ]);
      const subjJson = await subjRes.json();
      const classJson = await classRes.json();

      if (subjJson.success) setSubjects(subjJson.data);
      if (classJson.success) {
        setClasses(classJson.data);
        if (classJson.data.length > 0 && !selectedClassId) {
          setSelectedClassId(classJson.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading subjects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Submit New Subject
  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    try {
      const res = await fetch('/api/subjects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim().toUpperCase(),
          subjectType,
          isOptional,
          classIds: selectedInitialClasses,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Subject "${name}" created successfully!`);
        setIsAddModalOpen(false);
        setName('');
        setCode('');
        setSubjectType('THEORY');
        setIsOptional(false);
        setSelectedInitialClasses([]);
        loadData();
      } else {
        showNotification('error', data.error || 'Failed to create subject.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred.');
    }
  };

  // Open Assign Modal for a Class
  const openAssignModal = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const res = await fetch(`/api/subjects?classId=${classId}`);
      const json = await res.json();
      if (json.success) {
        setAssignedSubjectIds(json.data.map((s: SubjectItem) => s.id));
      }
    } catch (err) {
      console.error(err);
    }
    setIsAssignModalOpen(true);
  };

  // Submit Bulk Assign Subjects to Class
  const handleSaveClassSubjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    try {
      const res = await fetch('/api/subjects', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classId: selectedClassId,
          subjectIds: assignedSubjectIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Subjects allocated to class successfully!');
        setIsAssignModalOpen(false);
        loadData();
      } else {
        showNotification('error', data.error || 'Failed to allocate subjects.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred.');
    }
  };

  const toggleSubjectForClass = (id: string) => {
    setAssignedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Stats
  const stats = useMemo(() => {
    const theory = subjects.filter((s) => s.subjectType === 'THEORY').length;
    const practical = subjects.filter((s) => s.subjectType === 'PRACTICAL').length;
    const both = subjects.filter((s) => s.subjectType === 'BOTH').length;
    return { total: subjects.length, theory, practical, both };
  }, [subjects]);

  // Filtered Subjects
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchType = typeFilter === 'ALL' || s.subjectType === typeFilter;
      return matchSearch && matchType;
    });
  }, [subjects, searchQuery, typeFilter]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="text-rose-600" />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. PAGE HEADER                                                            */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Subjects Management</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Curriculum catalog, theory/practical grading weights, and class-wise allocations
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (classes.length > 0) openAssignModal(classes[0].id);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100/80 text-xs font-bold rounded-xl border border-purple-200 transition-all transform active:scale-95"
            >
              <ArrowRightLeft size={15} />
              <span>Assign to Class</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus size={15} />
              <span>Add New Subject</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS CARDS                                                            */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Subjects</p>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <BookOpen size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.total}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Active curriculum</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Theory Only</p>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <BookMarked size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.theory}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Languages & Humanities</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Theory + Practical</p>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FlaskConical size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.both}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Sciences & Computer</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Practical Only</p>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.practical}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Arts, Sports & Lab</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR: SEARCH & FILTER                                               */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or code (e.g. MAT, Science)..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ALL', 'THEORY', 'BOTH', 'PRACTICAL'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'ALL' ? 'All Types' : t === 'BOTH' ? 'Both (Th + Pr)' : t.charAt(0) + t.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. SUBJECTS GRID                                                          */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading curriculum subjects...</p>
          </div>
        ) : filteredSubjects.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <BookOpen size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No subjects found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              No subjects match your search or filter. Try a different query or create a new subject.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredSubjects.map((s) => (
              <div
                key={s.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top tags */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 font-black text-xs flex items-center justify-center border border-purple-100/60">
                        {s.code}
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900 leading-snug">{s.name}</h3>
                        <p className="text-[11px] text-gray-400 font-medium">Code: {s.code}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        s.subjectType === 'THEORY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : s.subjectType === 'BOTH'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                      }`}
                    >
                      {s.subjectType}
                    </span>
                  </div>

                  {/* Assigned Classes */}
                  <div className="mt-4 pt-3 border-t border-gray-50">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Assigned to Classes ({s.classSubjects?.length || 0})
                    </p>
                    {s.classSubjects && s.classSubjects.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        {s.classSubjects.map((cs) => (
                          <span
                            key={cs.class.id}
                            className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-medium"
                          >
                            Class {cs.class.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-amber-600 italic">Not assigned to any class yet</p>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <GraduationCap size={13} className="text-purple-600" />
                    <strong>{s._count?.teacherSubjects || 0}</strong> Teachers Assigned
                  </span>

                  {s.isOptional && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                      Optional
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MODAL: ADD NEW SUBJECT                                                 */}
        {/* ========================================================================= */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add New Subject</h3>
                  <p className="text-xs text-gray-500">Define code, grading type, and target classes</p>
                </div>
              </div>

              <form onSubmit={handleCreateSubject} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Subject Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sanskrit or AI"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Subject Code *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SKT or CS"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none uppercase"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Subject Type
                    </label>
                    <select
                      value={subjectType}
                      onChange={(e) => setSubjectType(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      <option value="THEORY">Theory Only</option>
                      <option value="PRACTICAL">Practical Only</option>
                      <option value="BOTH">Both (Theory + Practical)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2 pt-6">
                    <input
                      type="checkbox"
                      id="isOptional"
                      checked={isOptional}
                      onChange={(e) => setIsOptional(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
                    />
                    <label htmlFor="isOptional" className="text-xs font-bold text-gray-700 select-none">
                      Is Elective / Optional
                    </label>
                  </div>
                </div>

                {/* Assign to initial classes */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Assign to Classes Immediately (Optional)
                  </label>
                  <div className="grid grid-cols-3 gap-2 max-h-36 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-100">
                    {classes.map((cls) => {
                      const isChecked = selectedInitialClasses.includes(cls.id);
                      return (
                        <button
                          type="button"
                          key={cls.id}
                          onClick={() =>
                            setSelectedInitialClasses((prev) =>
                              isChecked ? prev.filter((id) => id !== cls.id) : [...prev, cls.id]
                            )
                          }
                          className={`flex items-center gap-1.5 p-2 rounded-xl text-xs font-semibold border transition-all text-left ${
                            isChecked
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[10px] ${
                              isChecked ? 'bg-white text-purple-600' : 'border border-gray-300'
                            }`}
                          >
                            {isChecked && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span className="truncate">Class {cls.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Create Subject
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. MODAL: ASSIGN SUBJECTS TO CLASS                                        */}
        {/* ========================================================================= */}
        {isAssignModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <ArrowRightLeft size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assign Subjects to Class</h3>
                  <p className="text-xs text-gray-500">Allocate curriculum subjects for selected grade</p>
                </div>
              </div>

              <form onSubmit={handleSaveClassSubjects} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Select Class
                  </label>
                  <select
                    value={selectedClassId}
                    onChange={(e) => openAssignModal(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Select Subjects ({assignedSubjectIds.length} Selected)
                    </label>
                    <div className="flex gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setAssignedSubjectIds(subjects.map((s) => s.id))}
                        className="text-purple-600 hover:underline font-semibold"
                      >
                        Select All
                      </button>
                      <span>&bull;</span>
                      <button
                        type="button"
                        onClick={() => setAssignedSubjectIds([])}
                        className="text-gray-400 hover:underline"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    {subjects.map((s) => {
                      const isChecked = assignedSubjectIds.includes(s.id);
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => toggleSubjectForClass(s.id)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all text-left ${
                            isChecked
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center text-[10px] flex-shrink-0 ${
                              isChecked ? 'bg-white text-purple-600' : 'border border-gray-300'
                            }`}
                          >
                            {isChecked && <Check size={11} strokeWidth={3} />}
                          </div>
                          <div className="truncate">
                            <p className="truncate leading-tight">{s.name}</p>
                            <span
                              className={`text-[10px] font-normal ${
                                isChecked ? 'text-purple-200' : 'text-gray-400'
                              }`}
                            >
                              {s.code} &bull; {s.subjectType}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Save Allocations
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
