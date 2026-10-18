'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  School,
  Plus,
  Users,
  Search,
  LayoutGrid,
  List,
  UserCheck,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Sparkles,
  BookOpen,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface SectionData {
  id: string;
  name: string;
  capacity: number;
  classTeacherId?: string | null;
  classTeacher?: {
    firstName: string;
    lastName: string;
  } | null;
  _count?: {
    students: number;
  };
}

interface ClassData {
  id: string;
  name: string;
  numericOrder: number;
  campusId: string;
  sections: SectionData[];
  _count?: {
    students: number;
  };
}

interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
  employeeId: string;
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal states
  const [isAddClassModalOpen, setIsAddClassModalOpen] = useState(false);
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [selectedClassForSection, setSelectedClassForSection] = useState<string>('');

  // Form states
  const [newClassName, setNewClassName] = useState('');
  const [newClassOrder, setNewClassOrder] = useState('1');
  const [newClassSections, setNewClassSections] = useState('A, B');
  const [newClassCapacity, setNewClassCapacity] = useState('40');

  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionCapacity, setNewSectionCapacity] = useState('40');
  const [newSectionTeacherId, setNewSectionTeacherId] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load Classes and Teachers
  const loadData = async () => {
    setLoading(true);
    try {
      const [classRes, teacherRes] = await Promise.all([
        fetch('/api/classes'),
        fetch('/api/teachers'),
      ]);
      const classJson = await classRes.json();
      const teacherJson = await teacherRes.json();

      if (classJson.success) setClasses(classJson.data);
      if (teacherJson.success) setTeachers(teacherJson.data);
    } catch (err) {
      console.error('Failed to load classes or teachers', err);
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

  // Submit Add Class
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;

    try {
      const sectionList = newClassSections
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const res = await fetch('/api/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          numericOrder: Number(newClassOrder) || 1,
          sections: sectionList.length > 0 ? sectionList : ['A'],
          capacity: Number(newClassCapacity) || 40,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Class ${newClassName} created successfully!`);
        setIsAddClassModalOpen(false);
        setNewClassName('');
        setNewClassSections('A, B');
        loadData();
      } else {
        showNotification('error', data.error || 'Failed to create class.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred.');
    }
  };

  // Submit Add Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim() || !selectedClassForSection) return;

    try {
      const res = await fetch('/api/classes/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSectionName.trim().toUpperCase(),
          classId: selectedClassForSection,
          capacity: Number(newSectionCapacity) || 40,
          classTeacherId: newSectionTeacherId || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', `Section ${newSectionName.toUpperCase()} added successfully!`);
        setIsAddSectionModalOpen(false);
        setNewSectionName('');
        setNewSectionTeacherId('');
        loadData();
      } else {
        showNotification('error', data.error || 'Failed to add section.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred.');
    }
  };

  // Aggregated Stats
  const stats = useMemo(() => {
    let totalSections = 0;
    let totalCapacity = 0;
    let totalStudents = 0;

    classes.forEach((c) => {
      totalSections += c.sections?.length || 0;
      totalStudents += c._count?.students || 0;
      c.sections?.forEach((s) => {
        totalCapacity += s.capacity || 40;
      });
    });

    return {
      totalClasses: classes.length,
      totalSections,
      totalCapacity,
      totalStudents,
    };
  }, [classes]);

  // Filtered classes
  const filteredClasses = useMemo(() => {
    return classes.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [classes, searchQuery]);

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
        {/* 1. PAGE HEADER & ACTIONS                                                  */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <School size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Classes & Sections</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure academic grade levels, student capacities, and assigned class teachers
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                if (classes.length > 0) setSelectedClassForSection(classes[0].id);
                setIsAddSectionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-50 text-purple-700 hover:bg-purple-100/80 text-xs font-bold rounded-xl border border-purple-200 transition-all transform active:scale-95"
            >
              <Plus size={15} />
              <span>Add Section</span>
            </button>

            <button
              onClick={() => setIsAddClassModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus size={15} />
              <span>Add New Class</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS OVERVIEW CARDS                                                   */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Classes</p>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <School size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalClasses}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Nursery to Class 12</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Sections</p>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Building2 size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalSections}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Across all grades</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Capacity</p>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Users size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalCapacity.toLocaleString()}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Available student seats</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Enrolled Students</p>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Sparkles size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalStudents.toLocaleString()}</h3>
            <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
              {stats.totalCapacity > 0 ? Math.round((stats.totalStudents / stats.totalCapacity) * 100) : 0}% Filled
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. TOOLBAR: SEARCH & VIEW SWITCHER                                        */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search classes..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'grid' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <LayoutGrid size={14} />
              <span>Grid View</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === 'table' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <List size={14} />
              <span>Table View</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. MAIN CONTENT: GRID OR TABLE VIEW                                       */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading academic classes & sections...</p>
          </div>
        ) : filteredClasses.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <School size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No classes found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              No academic classes match your search query. Try searching for a different grade or add a new class.
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredClasses.map((cls) => {
              const classCapacity = cls.sections?.reduce((acc, s) => acc + (s.capacity || 40), 0) || 0;
              const classStudents = cls._count?.students || 0;
              const fillRate = classCapacity > 0 ? Math.round((classStudents / classCapacity) * 100) : 0;

              return (
                <div
                  key={cls.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                >
                  <div className="p-5">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-[10px] font-bold">
                          Order #{cls.numericOrder}
                        </div>
                        <h3 className="text-lg font-black text-gray-900 mt-1">Class {cls.name}</h3>
                      </div>

                      <button
                        onClick={() => {
                          setSelectedClassForSection(cls.id);
                          setIsAddSectionModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
                        title="Add Section to this class"
                      >
                        <Plus size={13} />
                        <span>Add Section</span>
                      </button>
                    </div>

                    {/* Capacity Progress */}
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-gray-500 font-medium">Class Enrollment</span>
                        <span className="font-bold text-gray-800">
                          {classStudents} / {classCapacity} ({fillRate}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${Math.min(fillRate, 100)}%` }}
                          className={`h-full rounded-full transition-all ${
                            fillRate >= 90 ? 'bg-amber-500' : 'bg-purple-600'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Sections List */}
                    <div className="mt-5 space-y-2.5">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Sections ({cls.sections?.length || 0})
                      </p>
                      {cls.sections?.map((sec) => (
                        <div
                          key={sec.id}
                          className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/80 hover:bg-gray-50 border border-gray-100 transition-colors"
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-600 text-white font-black text-xs flex items-center justify-center shadow-sm">
                              {sec.name}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900">Section {sec.name}</p>
                              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                <UserCheck size={11} className="text-purple-600" />
                                {sec.classTeacher ? (
                                  <span>{sec.classTeacher.firstName} {sec.classTeacher.lastName}</span>
                                ) : (
                                  <span className="text-amber-600 italic">No class teacher assigned</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-bold text-gray-700">
                              {sec._count?.students || 0} / {sec.capacity}
                            </span>
                            <p className="text-[10px] text-gray-400">Students</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="px-5 py-3 bg-gray-50/60 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      <strong>{cls.sections?.length || 0}</strong> Sections Active
                    </span>
                    <a
                      href={`/students?classId=${cls.id}`}
                      className="font-semibold text-purple-700 hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      View Students <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TABLE VIEW */
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                    <th className="py-3.5 px-6">Class Name</th>
                    <th className="py-3.5 px-6">Numeric Order</th>
                    <th className="py-3.5 px-6">Sections</th>
                    <th className="py-3.5 px-6">Total Enrolled</th>
                    <th className="py-3.5 px-6">Total Capacity</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredClasses.map((cls) => {
                    const classCapacity = cls.sections?.reduce((acc, s) => acc + (s.capacity || 40), 0) || 0;
                    return (
                      <tr key={cls.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="py-4 px-6 font-bold text-gray-900">Class {cls.name}</td>
                        <td className="py-4 px-6">#{cls.numericOrder}</td>
                        <td className="py-4 px-6">
                          <div className="flex flex-wrap gap-1.5">
                            {cls.sections?.map((s) => (
                              <span
                                key={s.id}
                                className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-[11px] font-semibold border border-purple-100"
                              >
                                Sec {s.name} ({s._count?.students || 0}/{s.capacity})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-semibold">{cls._count?.students || 0}</td>
                        <td className="py-4 px-6 text-gray-500">{classCapacity}</td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setSelectedClassForSection(cls.id);
                              setIsAddSectionModalOpen(true);
                            }}
                            className="text-xs font-semibold text-purple-700 hover:underline"
                          >
                            + Add Section
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MODAL: ADD NEW CLASS                                                   */}
        {/* ========================================================================= */}
        {isAddClassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsAddClassModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <School size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add New Class</h3>
                  <p className="text-xs text-gray-500">Create grade level & initial sections</p>
                </div>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Class Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 11 or LKG or UKG"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Numeric Sort Order
                    </label>
                    <input
                      type="number"
                      required
                      value={newClassOrder}
                      onChange={(e) => setNewClassOrder(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Default Capacity
                    </label>
                    <input
                      type="number"
                      required
                      value={newClassCapacity}
                      onChange={(e) => setNewClassCapacity(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Initial Sections (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newClassSections}
                    onChange={(e) => setNewClassSections(e.target.value)}
                    placeholder="A, B, C"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Separate section names by comma, e.g. &ldquo;A, B, C&rdquo;
                  </p>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddClassModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. MODAL: ADD SECTION TO EXISTING CLASS                                   */}
        {/* ========================================================================= */}
        {isAddSectionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsAddSectionModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Section</h3>
                  <p className="text-xs text-gray-500">Create a new section & assign teacher</p>
                </div>
              </div>

              <form onSubmit={handleCreateSection} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Select Target Class *
                  </label>
                  <select
                    value={selectedClassForSection}
                    onChange={(e) => setSelectedClassForSection(e.target.value)}
                    required
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        Class {cls.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Section Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. C or D"
                      value={newSectionName}
                      onChange={(e) => setNewSectionName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Student Capacity
                    </label>
                    <input
                      type="number"
                      required
                      value={newSectionCapacity}
                      onChange={(e) => setNewSectionCapacity(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assign Class Teacher (Optional)
                  </label>
                  <select
                    value={newSectionTeacherId}
                    onChange={(e) => setNewSectionTeacherId(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="">-- No Class Teacher Assigned --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.employeeId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsAddSectionModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Add Section
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
