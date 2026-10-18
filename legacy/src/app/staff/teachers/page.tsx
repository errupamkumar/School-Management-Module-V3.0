'use client';

import { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import {
  GraduationCap,
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Award,
  BookOpen,
  Calendar,
  Building2,
  CheckCircle2,
  X,
  AlertCircle,
  Briefcase
} from 'lucide-react';

interface TeacherItem {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  gender: string;
  qualification: string;
  experience?: number;
  salary?: number;
  joiningDate?: string;
  isActive: boolean;
  user?: {
    email: string;
    phone?: string;
  };
  section?: {
    id: string;
    name: string;
    class: { name: string };
  } | null;
  _count?: {
    teacherSubjects: number;
  };
}

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [qualification, setQualification] = useState('');
  const [experience, setExperience] = useState('5');
  const [salary, setSalary] = useState('35000');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/teachers');
      const data = await res.json();
      if (data.success) setTeachers(data.data);
    } catch (err) {
      console.error('Failed to load teachers', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Filtered teachers
  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
      const query = search.toLowerCase();
      return (
        fullName.includes(query) ||
        t.employeeId.toLowerCase().includes(query) ||
        t.qualification?.toLowerCase().includes(query)
      );
    });
  }, [teachers, search]);

  // Summary Stats
  const stats = useMemo(() => {
    const total = teachers.length;
    const male = teachers.filter((t) => t.gender === 'MALE').length;
    const female = teachers.filter((t) => t.gender === 'FEMALE').length;
    const classTeachers = teachers.filter((t) => Boolean(t.section)).length;
    return { total, male, female, classTeachers };
  }, [teachers]);

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
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <GraduationCap size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Teaching Faculty</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Qualified educators, assigned grade teachers, and contact directory
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <Plus size={15} />
            <span>Add New Teacher</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS OVERVIEW                                                         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Teachers</p>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.total}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Teaching Faculty</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Class Incharges</p>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Building2 size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.classTeachers}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Assigned Class Teachers</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Male Teachers</p>
              <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                <Briefcase size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.male}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0}% of faculty
            </p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Female Teachers</p>
              <div className="w-7 h-7 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center">
                <Award size={15} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.female}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              {stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0}% of faculty
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SEARCH TOOLBAR                                                         */}
        {/* ========================================================================= */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by teacher name, ID, or qualification..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <span className="text-xs text-gray-500">
            Showing <strong>{filteredTeachers.length}</strong> teachers
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 4. TEACHERS GRID                                                          */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading faculty directory...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <GraduationCap size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No teachers found</h3>
            <p className="text-xs text-gray-400 mt-1">No faculty records match your search criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTeachers.map((t) => (
              <div
                key={t.id}
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  {/* Top: Avatar & Name */}
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-base shadow-sm flex-shrink-0 ${
                        t.gender === 'FEMALE'
                          ? 'bg-gradient-to-br from-pink-500 to-rose-600'
                          : 'bg-gradient-to-br from-blue-500 to-indigo-600'
                      }`}
                    >
                      {t.firstName[0]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md">
                          {t.employeeId}
                        </span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500" title="Active Teacher" />
                      </div>
                      <h3 className="text-base font-bold text-gray-900 mt-1 truncate">
                        {t.firstName} {t.lastName}
                      </h3>
                      <p className="text-xs text-purple-700 font-semibold">{t.qualification}</p>
                    </div>
                  </div>

                  {/* Class Teacher Badge */}
                  <div className="mt-4 pt-3 border-t border-gray-50">
                    {t.section ? (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-purple-50/80 border border-purple-100 text-xs">
                        <span className="text-gray-500">Class Incharge:</span>
                        <span className="font-bold text-purple-700">
                          Class {t.section.class.name} - {t.section.name}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50 text-xs text-gray-400">
                        <span>Class Incharge:</span>
                        <span className="italic">Subject Specialist</span>
                      </div>
                    )}
                  </div>

                  {/* Contact info */}
                  <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-400 flex-shrink-0" />
                      <span className="truncate">{t.user?.email || `${t.firstName.toLowerCase()}@vidyalaya.com`}</span>
                    </div>
                    {t.user?.phone && (
                      <div className="flex items-center gap-2">
                        <Phone size={13} className="text-gray-400 flex-shrink-0" />
                        <span>{t.user.phone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                  <span>
                    Experience: <strong>{t.experience || 5} Years</strong>
                  </span>
                  <span className="font-bold text-emerald-600">
                    {formatCurrency(t.salary || 35000)}/mo
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. MODAL: ADD TEACHER                                                     */}
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
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Faculty Member</h3>
                  <p className="text-xs text-gray-500">Create teacher record & login credentials</p>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  showNotification('success', `Teacher ${firstName} ${lastName} enrolled successfully!`);
                  setIsAddModalOpen(false);
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      First Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Arun"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sharma"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="teacher@vidyalaya.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Qualification *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. M.Sc Mathematics, B.Ed"
                      value={qualification}
                      onChange={(e) => setQualification(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Gender
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Monthly Salary (₹)
                    </label>
                    <input
                      type="number"
                      value={salary}
                      onChange={(e) => setSalary(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
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
                    Create Teacher Record
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
