'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  BookOpen,
  Plus,
  Search,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  FileText,
  Paperclip,
  Upload,
  Sparkles,
  Users,
  Download,
  Edit3,
  Trash2,
  Send,
  Bell,
  BarChart2,
  Eye,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface HomeworkItem {
  id: string;
  title: string;
  description: string;
  className: string;
  subjectName: string;
  dueDate: string;
  assignedDate: string;
  totalStudents: number;
  submittedCount: number;
  attachmentName?: string;
  isSubmittedByStudent?: boolean;
  grade?: string;
}

const initialHomeworkList: HomeworkItem[] = [
  {
    id: 'hw-1',
    title: 'Quadratic Equations Practice Set 4.2',
    description: 'Solve questions 1 to 15 from Chapter 4 in your Maths notebook. Show all steps clearly.',
    className: 'Class 10',
    subjectName: 'Mathematics',
    dueDate: '2026-09-24',
    assignedDate: '2026-09-22',
    totalStudents: 38,
    submittedCount: 29,
    attachmentName: 'maths-ch4-worksheet.pdf',
    isSubmittedByStudent: true,
    grade: 'A',
  },
  {
    id: 'hw-2',
    title: 'Light Reflection & Refraction Diagram Drawing',
    description: 'Draw ray diagrams for concave and convex mirrors for all 6 object positions with labels.',
    className: 'Class 10',
    subjectName: 'Science',
    dueDate: '2026-09-25',
    assignedDate: '2026-09-22',
    totalStudents: 38,
    submittedCount: 22,
    attachmentName: 'ray-diagrams-guide.pdf',
    isSubmittedByStudent: false,
  },
  {
    id: 'hw-3',
    title: 'Formal Letter to Municipal Commissioner',
    description: 'Write a formal complaint letter about irregular garbage disposal in your locality (120 words).',
    className: 'Class 9',
    subjectName: 'English',
    dueDate: '2026-09-23',
    assignedDate: '2026-09-21',
    totalStudents: 40,
    submittedCount: 36,
    isSubmittedByStudent: true,
    grade: 'B+',
  },
  {
    id: 'hw-4',
    title: 'HTML & CSS Web Page Layout Assignment',
    description: 'Create a simple 2-page static website about Renewable Energy using HTML5 semantic tags.',
    className: 'Class 8',
    subjectName: 'Computer Science',
    dueDate: '2026-09-26',
    assignedDate: '2026-09-22',
    totalStudents: 35,
    submittedCount: 14,
    isSubmittedByStudent: false,
  },
];

export default function HomeworkPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';

  // ─── ENTERPRISE RBAC PERMISSIONS ───
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
  const isTeacher = userRole === 'TEACHER';
  const isStudent = userRole === 'STUDENT';
  const isParent = userRole === 'PARENT';

  // All features accessible without permissions lockouts
  const canAssign = true;
  const canEdit = true;
  const canDelete = true;
  const canGrade = true;
  const canSubmit = true;
  const canSendReminder = true;
  const canExport = true;
  const canViewAnalytics = true;

  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>(initialHomeworkList);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState<string | null>(null);
  const [showGradeModal, setShowGradeModal] = useState<string | null>(null);
  const [editingHw, setEditingHw] = useState<HomeworkItem | null>(null);
  const [activeTab, setActiveTab] = useState<'LIST' | 'ANALYTICS'>('LIST');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [className, setClassName] = useState('Class 10');
  const [subjectName, setSubjectName] = useState('Mathematics');
  const [dueDate, setDueDate] = useState('2026-09-25');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleOpenEditModal = (hw: HomeworkItem) => {
    setEditingHw({ ...hw });
  };

  const handleSaveEditHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHw) return;
    setHomeworkList(homeworkList.map(h => h.id === editingHw.id ? editingHw : h));
    toast.success('Homework details updated and deadline revised!');
    setEditingHw(null);
  };

  const handleCreateHomework = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const newHw: HomeworkItem = {
      id: `hw-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      className,
      subjectName,
      dueDate,
      assignedDate: new Date().toISOString().split('T')[0],
      totalStudents: 40,
      submittedCount: 0,
      isSubmittedByStudent: false,
    };

    setHomeworkList([newHw, ...homeworkList]);
    showNotification('success', `Homework assigned to ${className} successfully!`);
    setIsAddModalOpen(false);
    setTitle('');
    setDescription('');
  };

  const handleDeleteHomework = (id: string) => {
    setHomeworkList(homeworkList.filter(hw => hw.id !== id));
    toast.success('Homework deleted.');
  };

  const handleSubmitHomework = (id: string) => {
    setHomeworkList(homeworkList.map(hw =>
      hw.id === id ? { ...hw, isSubmittedByStudent: true, submittedCount: hw.submittedCount + 1 } : hw
    ));
    toast.success('Homework submitted successfully!');
    setShowSubmitModal(null);
  };

  const handleGradeHomework = (id: string, grade: string) => {
    setHomeworkList(homeworkList.map(hw =>
      hw.id === id ? { ...hw, grade } : hw
    ));
    toast.success(`Grade "${grade}" assigned.`);
    setShowGradeModal(null);
  };

  const handleSendReminder = (hw: HomeworkItem) => {
    const pending = hw.totalStudents - hw.submittedCount;
    toast.success(`Reminder sent to ${pending} students with pending submissions.`);
  };

  const handleExportReport = () => {
    const rows = ['Title,Class,Subject,Due Date,Submitted,Total,Rate'];
    homeworkList.forEach(hw => {
      rows.push(`"${hw.title}","${hw.className}","${hw.subjectName}","${hw.dueDate}",${hw.submittedCount},${hw.totalStudents},${Math.round(hw.submittedCount / hw.totalStudents * 100)}%`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'homework_report.csv';
    link.click();
    toast.success('Homework report exported!');
  };

  const filteredList = useMemo(() => {
    return homeworkList.filter((hw) => {
      const q = search.toLowerCase();
      const matchSearch = hw.title.toLowerCase().includes(q) || hw.className.toLowerCase().includes(q) || hw.subjectName.toLowerCase().includes(q);
      const matchClass = classFilter === 'ALL' || hw.className === classFilter;
      return matchSearch && matchClass;
    });
  }, [homeworkList, search, classFilter]);

  // Analytics data
  const totalAssignments = homeworkList.length;
  const avgSubmissionRate = Math.round(homeworkList.reduce((sum, hw) => sum + (hw.submittedCount / hw.totalStudents * 100), 0) / Math.max(1, homeworkList.length));
  const pendingSubmissions = homeworkList.filter(hw => !hw.isSubmittedByStudent).length;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast */}
        {notification && (
          <div
            className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* 1. Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <BookOpen size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Daily Homework</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin
                ? 'Full control — Assign, edit, delete homework. View all classes. Track submissions & export reports.'
                : isTeacher
                ? 'Assign homework, grade submissions, send reminders, and track class completion.'
                : isParent
                ? "Track your ward's homework assignments, submission status, and grades."
                : 'View your homework assignments, submit work, and check your grades.'}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAssign && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
              >
                <Plus size={15} />
                <span>Assign Homework</span>
              </button>
            )}
            {canExport && (
              <button
                onClick={handleExportReport}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white text-gray-700 hover:bg-gray-50 text-xs font-bold rounded-xl border border-gray-200 shadow-sm"
              >
                <Download size={14} />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
          <button onClick={() => setActiveTab('LIST')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'LIST' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
            <BookOpen size={14} /> Assignments
          </button>
          {canViewAnalytics && (
            <button onClick={() => setActiveTab('ANALYTICS')} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'ANALYTICS' ? 'bg-purple-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
              <BarChart2 size={14} /> {isParent ? "Ward's Progress" : 'Analytics'}
            </button>
          )}
        </div>

        {/* Analytics Tab */}
        {activeTab === 'ANALYTICS' && canViewAnalytics && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center"><FileText size={24} /></div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">{isParent ? "Ward's Assignments" : 'Total Assignments'}</p>
                  <p className="text-xl font-black text-gray-900">{totalAssignments}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={24} /></div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">{isParent || isStudent ? 'Submitted' : 'Avg Submission'}</p>
                  <p className="text-xl font-black text-gray-900">
                    {isParent || isStudent
                      ? `${homeworkList.filter(hw => hw.isSubmittedByStudent).length} / ${totalAssignments}`
                      : `${avgSubmissionRate}%`}
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><Clock size={24} /></div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Pending</p>
                  <p className="text-xl font-black text-gray-900">{isParent || isStudent ? pendingSubmissions : homeworkList.reduce((s, h) => s + (h.totalStudents - h.submittedCount), 0)}</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center"><Star size={24} /></div>
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">{isParent ? "Ward's Avg Grade" : 'Best Subject'}</p>
                  <p className="text-xl font-black text-gray-900">{isParent || isStudent ? 'A' : 'Mathematics'}</p>
                </div>
              </div>
            </div>

            {(isParent || isStudent) && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h3 className="text-sm font-bold text-gray-900 mb-4">{isParent ? "Ward's Submission Status" : 'Your Submission Status'}</h3>
                <div className="space-y-3">
                  {homeworkList.map(hw => (
                    <div key={hw.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        {hw.isSubmittedByStudent ? (
                          <CheckCircle2 size={18} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={18} className="text-amber-500" />
                        )}
                        <div>
                          <p className="text-xs font-bold text-gray-900">{hw.title}</p>
                          <p className="text-[10px] text-gray-500">{hw.subjectName} • Due: {hw.dueDate}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        {hw.isSubmittedByStudent ? (
                          <div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Submitted</span>
                            {hw.grade && <p className="text-xs font-black text-purple-700 mt-0.5">Grade: {hw.grade}</p>}
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">Pending</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignments List Tab */}
        {activeTab === 'LIST' && (
          <>
            {/* 2. Search & Filter Toolbar */}
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search homework by subject or title..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-purple-500/20 outline-none"
                  />
                </div>

                {canAssign && (
                  <div className="flex items-center gap-1.5">
                    {['ALL', 'Class 8', 'Class 9', 'Class 10'].map(cls => (
                      <button key={cls} onClick={() => setClassFilter(cls)} className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${classFilter === cls ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        {cls === 'ALL' ? 'All Classes' : cls}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <span className="text-xs text-gray-500">
                Showing <strong>{filteredList.length}</strong> assignments
              </span>
            </div>

            {/* 3. Homework Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredList.map((hw) => {
                const submissionRate = Math.round((hw.submittedCount / hw.totalStudents) * 100);
                const isDueSoon = new Date(hw.dueDate) <= new Date(Date.now() + 86400000);

                return (
                  <div
                    key={hw.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100">
                            {hw.className}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
                            {hw.subjectName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${isDueSoon ? 'text-rose-600 bg-rose-50' : 'text-amber-600 bg-amber-50'}`}>
                            <Clock size={12} />
                            <span>Due: {hw.dueDate}</span>
                          </div>

                          {/* Student submission status badge */}
                          {(isStudent || isParent) && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${hw.isSubmittedByStudent ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {hw.isSubmittedByStudent ? '✓ Submitted' : '⏳ Pending'}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 mt-3 leading-snug">
                        {hw.title}
                      </h3>
                      <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                        {hw.description}
                      </p>

                      {hw.attachmentName && (
                        <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-gray-50 border border-gray-200/80 text-[11px] font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition">
                          <Paperclip size={12} className="text-purple-600" />
                          <span>{hw.attachmentName}</span>
                          <Download size={11} className="text-gray-400 ml-1" />
                        </div>
                      )}

                      {/* Grade display for student/parent */}
                      {(isStudent || isParent) && hw.grade && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                          <Star size={14} className="text-purple-600" />
                          <span className="text-xs font-bold text-purple-800">Grade: {hw.grade}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer with RBAC actions */}
                    <div className="mt-5 pt-4 border-t border-gray-100">
                      {/* Submission Progress (Admin/Teacher view) */}
                      {canAssign && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="text-gray-500 font-medium">Student Submissions</span>
                            <span className="font-bold text-gray-800">
                              {hw.submittedCount} / {hw.totalStudents} ({submissionRate}%)
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${submissionRate}%` }}
                              className={`h-full rounded-full transition-all ${submissionRate >= 80 ? 'bg-emerald-500' : submissionRate >= 50 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] text-gray-400">Assigned: {hw.assignedDate}</span>

                        <div className="flex items-center gap-1.5">
                          {/* Student: Submit Homework */}
                          {canSubmit && !hw.isSubmittedByStudent && (
                            <button
                              onClick={() => setShowSubmitModal(hw.id)}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                              <Upload size={12} className="inline mr-1" /> Submit
                            </button>
                          )}
                          {canSubmit && hw.isSubmittedByStudent && (
                            <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold border border-emerald-200">
                              ✓ Submitted
                            </span>
                          )}

                          {/* Teacher/Admin: Grade */}
                          {canGrade && (
                            <button
                              onClick={() => setShowGradeModal(hw.id)}
                              className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-xl text-xs font-bold hover:bg-purple-100 border border-purple-200"
                            >
                              <Star size={12} className="inline mr-1" /> Grade
                            </button>
                          )}

                          {/* Teacher/Admin: Send Reminder */}
                          {canSendReminder && hw.submittedCount < hw.totalStudents && (
                            <button
                              onClick={() => handleSendReminder(hw)}
                              className="p-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                              title={`Send reminder to ${hw.totalStudents - hw.submittedCount} students`}
                            >
                              <Bell size={14} />
                            </button>
                          )}

                          {/* Teacher/Admin: Edit / Extend Deadline */}
                          {canEdit && (
                            <button
                              onClick={() => handleOpenEditModal(hw)}
                              className="p-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                              title="Edit / Extend Deadline"
                            >
                              <Edit3 size={14} />
                            </button>
                          )}

                          {/* Admin: Delete */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteHomework(hw.id)}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                              title="Delete homework"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}

                          {/* Parent: View-only indicator */}
                          {isParent && (
                            <span className="text-[10px] text-gray-400 flex items-center gap-1">
                              <Eye size={11} /> Monitoring
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* 4. Modal: Assign Homework (Admin/Teacher) */}
        {isAddModalOpen && canAssign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <BookOpen size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Assign Daily Homework</h3>
                  <p className="text-xs text-gray-500">Post instructions and submission deadline</p>
                </div>
              </div>

              <form onSubmit={handleCreateHomework} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Grade Class
                    </label>
                    <select
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Subject
                    </label>
                    <select
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      {['Mathematics', 'Science', 'English', 'Hindi', 'Social Science', 'Computer Science'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Assignment Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Chapter 4 Practice Questions"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Instructions & Description *
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Explain the assignment tasks..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Submission Due Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
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
                    Assign to Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Submit Modal (Student) */}
        {showSubmitModal && canSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowSubmitModal(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><Upload size={20} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Submit Homework</h3>
                  <p className="text-xs text-gray-500">Upload your assignment</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center hover:border-emerald-400 transition cursor-pointer">
                  <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-xs text-gray-500 font-medium">Drag and drop your file here or click to browse</p>
                  <p className="text-[10px] text-gray-400 mt-1">Supports: PDF, DOC, DOCX, Images (Max 10MB)</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Notes (Optional)</label>
                  <textarea rows={2} placeholder="Any additional notes for teacher..." className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 resize-none outline-none focus:ring-2 focus:ring-emerald-500/20" />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2 border-t border-gray-100 mt-4">
                <button onClick={() => setShowSubmitModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                <button onClick={() => handleSubmitHomework(showSubmitModal)} className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">Submit</button>
              </div>
            </div>
          </div>
        )}

        {/* Grade Modal (Teacher/Admin) */}
        {showGradeModal && canGrade && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-xs w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowGradeModal(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center"><Star size={20} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Grade Homework</h3>
                  <p className="text-xs text-gray-500">Assign grade to student</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D'].map(g => (
                  <button key={g} onClick={() => handleGradeHomework(showGradeModal, g)} className="py-2.5 rounded-xl text-xs font-bold bg-gray-50 border border-gray-200 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition">{g}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {/* Edit Homework Modal (Teacher/Admin) */}
        {editingHw && canEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setEditingHw(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Edit3 size={20} /></div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit / Extend Deadline</h3>
                  <p className="text-xs text-gray-500">Update instructions or extend due date</p>
                </div>
              </div>

              <form onSubmit={handleSaveEditHomework} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Homework Title</label>
                  <input type="text" required value={editingHw.title} onChange={e => setEditingHw({ ...editingHw, title: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Class</label>
                    <input type="text" value={editingHw.className} onChange={e => setEditingHw({ ...editingHw, className: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Due Date (Deadline)</label>
                    <input type="date" required value={editingHw.dueDate} onChange={e => setEditingHw({ ...editingHw, dueDate: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 font-bold text-purple-700" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Instructions / Description</label>
                  <textarea rows={3} required value={editingHw.description} onChange={e => setEditingHw({ ...editingHw, description: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 resize-none" />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t">
                  <button type="button" onClick={() => setEditingHw(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">Update & Save</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
