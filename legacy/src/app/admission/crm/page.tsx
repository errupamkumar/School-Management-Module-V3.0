'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Kanban,
  UserPlus,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  FileCheck,
  Award,
  CreditCard,
  UserCheck,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Phone,
  Mail,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
  Eye,
  X,
  FileText,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { AdmissionStatus } from '@prisma/client';

interface InquiryItem {
  id: string;
  applicationNo: string;
  token: string;
  firstName: string;
  lastName: string;
  gender: string;
  dob: string;
  aadhaarNo?: string | null;
  parentName: string;
  parentPhone: string;
  parentEmail?: string | null;
  status: AdmissionStatus;
  priority: string;
  source: string;
  notes?: string | null;
  createdAt: string;
  campusId: string;
  classId: string;
  sectionId?: string | null;
  class: { id: string; name: string };
  section?: { id: string; name: string; capacity: number } | null;
  campus: { id: string; name: string };
  student?: { id: string; admissionNo: string; rollNo?: string } | null;
}

const PIPELINE_COLUMNS: Array<{
  id: AdmissionStatus;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  icon: any;
}> = [
  { id: 'INQUIRY', title: '1. Inquiries', subtitle: 'Initial Leads', color: 'border-blue-400 text-blue-700', badgeBg: 'bg-blue-100 text-blue-800', icon: Clock },
  { id: 'FORM_SUBMITTED', title: '2. Submitted', subtitle: 'Form Completed', color: 'border-indigo-400 text-indigo-700', badgeBg: 'bg-indigo-100 text-indigo-800', icon: FileText },
  { id: 'DOCS_VERIFIED', title: '3. Docs Verified', subtitle: 'TC & Identity OK', color: 'border-purple-400 text-purple-700', badgeBg: 'bg-purple-100 text-purple-800', icon: FileCheck },
  { id: 'SEAT_OFFERED', title: '4. Seat Offered', subtitle: 'Provisional Offer', color: 'border-amber-400 text-amber-700', badgeBg: 'bg-amber-100 text-amber-800', icon: Award },
  { id: 'FEES_PAID', title: '5. Fees Paid', subtitle: 'Deposit Settled', color: 'border-emerald-400 text-emerald-700', badgeBg: 'bg-emerald-100 text-emerald-800', icon: CreditCard },
  { id: 'ENROLLED', title: '6. Enrolled SIS', subtitle: 'Student Provisioned', color: 'border-teal-500 text-teal-800', badgeBg: 'bg-teal-100 text-teal-900', icon: UserCheck },
];

export default function AdmissionCRMPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryItem | null>(null);

  // Live duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Enrollment Modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({
    inquiryId: '',
    campusId: '',
    classId: '',
    sectionId: '',
    rollNo: '',
  });
  const [enrolling, setEnrolling] = useState(false);

  // Dynamic Class/Section options for seat counter
  const [classes, setClasses] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [resInq, resClasses] = await Promise.all([
        fetch('/api/admission'),
        fetch('/api/classes'),
      ]);

      const dataInq = await resInq.json();
      if (dataInq.success) {
        setInquiries(dataInq.data || []);
        setStats(dataInq.stats || {});
      }

      const dataClasses = await resClasses.json();
      if (dataClasses.success) {
        setClasses(dataClasses.data || []);
      }
    } catch {
      toast.error('Failed to refresh CRM data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick duplicate check on inquiry select
  const handleSelectInquiry = async (item: InquiryItem) => {
    setSelectedInquiry(item);
    setDuplicateWarning(null);

    try {
      const q = new URLSearchParams({
        action: 'check-duplicate',
        aadhaarNo: item.aadhaarNo || '',
        phone: item.parentPhone || '',
        firstName: item.firstName || '',
        lastName: item.lastName || '',
        dob: item.dob ? new Date(item.dob).toISOString().split('T')[0] : '',
      });
      const res = await fetch(`/api/admission?${q.toString()}`);
      const data = await res.json();
      if (data.success && data.isDuplicate) {
        setDuplicateWarning(data.matches);
      }
    } catch {}
  };

  // Status stage transition
  const handleStatusChange = async (inquiryId: string, newStatus: AdmissionStatus) => {
    if (newStatus === 'ENROLLED') {
      const inq = inquiries.find((i) => i.id === inquiryId);
      if (inq) {
        openEnrollModal(inq);
      }
      return;
    }

    try {
      const res = await fetch('/api/admission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquiryId, status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Applicant moved to ${newStatus}`);
        setInquiries((prev) =>
          prev.map((i) => (i.id === inquiryId ? { ...i, status: newStatus } : i))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch {
      toast.error('Network error updating status');
    }
  };

  // Open atomic enrollment dialog
  const openEnrollModal = (inq: InquiryItem) => {
    const cls = classes.find((c) => c.id === inq.classId) || classes[0];
    const defaultSec = cls?.sections?.[0]?.id || inq.sectionId || '';
    setEnrollForm({
      inquiryId: inq.id,
      campusId: inq.campusId,
      classId: inq.classId,
      sectionId: defaultSec,
      rollNo: '',
    });
    setIsEnrollModalOpen(true);
  };

  // Execute atomic enrollment
  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollForm.sectionId) {
      toast.error('Please select an active section');
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch('/api/admission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll',
          ...enrollForm,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `Student enrolled! Adm No: ${data.data.admissionNo}, Roll No: ${data.data.rollNo}`
        );
        setIsEnrollModalOpen(false);
        loadData();
      } else {
        toast.error(data.error || 'Failed to complete atomic enrollment');
      }
    } catch {
      toast.error('Failed to execute enrollment transaction');
    } finally {
      setEnrolling(false);
    }
  };

  // Filtered Leads
  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const q = search.toLowerCase();
      const matchSearch =
        inq.firstName.toLowerCase().includes(q) ||
        inq.lastName.toLowerCase().includes(q) ||
        inq.applicationNo.toLowerCase().includes(q) ||
        inq.parentPhone.includes(q) ||
        inq.parentName.toLowerCase().includes(q);

      const matchClass = classFilter === 'ALL' || inq.classId === classFilter;
      return matchSearch && matchClass;
    });
  }, [inquiries, search, classFilter]);

  return (
    <DashboardLayout>
      <Toaster position="top-right" />

      <div className="space-y-6 pb-16">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shadow-sm">
                <Kanban size={20} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admission CRM Pipeline</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Lead nurturing pipeline, atomic class capacity tracking, duplicate verification & SIS enrollment
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
              title="Refresh Pipeline"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>

            <Link
              href="/apply"
              target="_blank"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all"
            >
              <ExternalLink size={15} />
              <span>Public Portal (/apply)</span>
            </Link>

            <Link
              href="/admission/new"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition-all transform active:scale-95"
            >
              <UserPlus size={15} />
              <span>Direct New Entry</span>
            </Link>
          </div>
        </div>

        {/* Global Duplicate Identity Warning Banner */}
        {duplicateWarning && duplicateWarning.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-900 shadow-sm animate-in slide-in-from-top-2">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-amber-600 mt-0.5 flex-shrink-0" size={20} />
              <div className="flex-1">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                  Instant Duplicate Identity Verification Alert
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  The selected inquiry matches existing records in the database:
                </p>
                <div className="mt-2 space-y-1">
                  {duplicateWarning.map((m: any, idx: number) => (
                    <div key={idx} className="text-xs font-medium text-amber-950 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{m.description}</span>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setDuplicateWarning(null)} className="text-amber-600 hover:text-amber-800">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Class Capacity Ribbon */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Live Class Capacity Monitor (Seats Available / Max Capacity)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-gray-400">Academic Year 2025-26</span>
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
            {classes.slice(0, 10).map((cls) => {
              const totalCap = cls.sections?.reduce((sum: number, s: any) => sum + (s.capacity || 40), 0) || 40;
              return (
                <div
                  key={cls.id}
                  className="flex-shrink-0 min-w-[130px] p-3 rounded-xl bg-slate-50 border border-gray-100 hover:border-indigo-200 transition-all text-center"
                >
                  <p className="text-xs font-bold text-gray-800">Class {cls.name}</p>
                  <div className="mt-1 flex items-center justify-center gap-1">
                    <span className="text-xs font-mono font-bold text-emerald-600">
                      {cls.sections?.length || 1} Sec
                    </span>
                    <span className="text-xs text-gray-300">•</span>
                    <span className="text-xs font-mono font-bold text-gray-600">{totalCap} Max</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, app no, phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
              <Filter size={14} /> Filter Class:
            </span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-medium focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="ALL">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  Class {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Kanban Board Container */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 overflow-x-auto min-h-[600px]">
          {PIPELINE_COLUMNS.map((col) => {
            const Icon = col.icon;
            const itemsInCol = filteredInquiries.filter((i) => i.status === col.id);

            return (
              <div
                key={col.id}
                className="bg-slate-50/80 rounded-2xl border border-gray-200/80 flex flex-col h-full min-w-[240px]"
              >
                {/* Column Header */}
                <div className={`p-3.5 border-b border-gray-200 bg-white rounded-t-2xl border-t-4 ${col.color}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Icon size={15} />
                      <h3 className="font-black text-xs text-gray-900 tracking-tight">{col.title}</h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${col.badgeBg}`}>
                      {itemsInCol.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">{col.subtitle}</p>
                </div>

                {/* Column Body / Cards */}
                <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[700px]">
                  {itemsInCol.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs italic">No applicants in stage</div>
                  ) : (
                    itemsInCol.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleSelectInquiry(item)}
                        className={`bg-white rounded-xl p-3.5 border transition-all cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-300 relative group ${
                          selectedInquiry?.id === item.id ? 'ring-2 ring-indigo-500 border-indigo-400' : 'border-gray-200'
                        }`}
                      >
                        {/* Top row: App No & Class */}
                        <div className="flex items-center justify-between text-[11px] mb-1.5">
                          <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {item.applicationNo}
                          </span>
                          <span className="font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                            Class {item.class?.name}
                          </span>
                        </div>

                        {/* Student Name */}
                        <h4 className="font-black text-sm text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {item.firstName} {item.lastName}
                        </h4>

                        {/* Guardian Info */}
                        <div className="mt-2 space-y-1 text-[11px] text-gray-500">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-gray-400" />
                            <span className="truncate">{item.parentName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <Phone size={12} className="text-gray-400" />
                            <span>{item.parentPhone}</span>
                          </div>
                        </div>

                        {/* If already enrolled: Show Admission No */}
                        {item.student && (
                          <div className="mt-2 p-1.5 rounded-lg bg-teal-50 border border-teal-200 text-[10px] font-bold text-teal-800 flex items-center justify-between">
                            <span>Adm: {item.student.admissionNo}</span>
                            <span>Roll: #{item.student.rollNo || '-'}</span>
                          </div>
                        )}

                        {/* Quick action bar */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between gap-1 text-[10px]">
                          {/* If FEES_PAID or SEAT_OFFERED, offer fee billing shortcut */}
                          {item.status === 'FEES_PAID' || item.status === 'SEAT_OFFERED' ? (
                            <Link
                              href={`/fees/collect?admissionNo=${item.student?.admissionNo || item.applicationNo}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
                            >
                              <CreditCard size={12} />
                              <span>Collect Fee</span>
                            </Link>
                          ) : (
                            <span className="text-gray-400">{new Date(item.createdAt).toLocaleDateString()}</span>
                          )}

                          {/* Stage Advance Trigger */}
                          {item.status !== 'ENROLLED' && (
                            <div className="flex items-center gap-1">
                              <Link
                                href={`/admission/new?inquiryId=${encodeURIComponent(item.id)}&firstName=${encodeURIComponent(item.firstName || '')}&lastName=${encodeURIComponent(item.lastName || '')}&childName=${encodeURIComponent(`${item.firstName || ''} ${item.lastName || ''}`.trim())}&parentName=${encodeURIComponent(item.parentName || '')}&phone=${encodeURIComponent(item.parentPhone || '')}&email=${encodeURIComponent(item.parentEmail || '')}&gender=${encodeURIComponent(item.gender || '')}&dob=${encodeURIComponent(item.dob ? new Date(item.dob).toISOString().split('T')[0] : '')}&targetClass=${encodeURIComponent(item.class?.name || '')}&classId=${encodeURIComponent(item.classId || '')}&campusId=${encodeURIComponent(item.campusId || '')}${item.sectionId ? `&sectionId=${encodeURIComponent(item.sectionId)}` : ''}${item.aadhaarNo ? `&aadhaarNo=${encodeURIComponent(item.aadhaarNo)}` : ''}${item.notes ? `&notes=${encodeURIComponent(item.notes)}` : ''}`}
                                onClick={(e) => e.stopPropagation()}
                                className="p-1 rounded hover:bg-purple-50 text-purple-600"
                                title="Convert in Full Admission Form"
                              >
                                <UserPlus size={13} />
                              </Link>
                              {item.status === 'FEES_PAID' ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEnrollModal(item);
                                  }}
                                  className="px-2 py-0.5 rounded bg-teal-600 hover:bg-teal-700 text-white font-bold text-[10px] shadow-sm"
                                >
                                  Enroll SIS
                                </button>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIdx = PIPELINE_COLUMNS.findIndex((c) => c.id === item.status) + 1;
                                    if (nextIdx < PIPELINE_COLUMNS.length) {
                                      handleStatusChange(item.id, PIPELINE_COLUMNS[nextIdx].id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-indigo-50 text-indigo-600"
                                  title="Advance Stage"
                                >
                                  <ChevronRight size={14} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Inquiry Detail Drawer / Modal */}
        {selectedInquiry && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-md">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {selectedInquiry.firstName[0]}
                  {selectedInquiry.lastName[0]}
                </div>
                <div>
                  <h3 className="text-lg font-black text-gray-900">
                    {selectedInquiry.firstName} {selectedInquiry.lastName}
                  </h3>
                  <p className="text-xs text-gray-400 font-mono">
                    Application #{selectedInquiry.applicationNo} • Token: {selectedInquiry.token}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Direct handoff to /fees/collect */}
                <Link
                  href={`/fees/collect?admissionNo=${selectedInquiry.student?.admissionNo || selectedInquiry.applicationNo}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold border border-emerald-200 transition-colors"
                >
                  <CreditCard size={14} />
                  <span>Single-Click: Collect First Fee</span>
                </Link>

                {selectedInquiry.status !== 'ENROLLED' && (
                  <Link
                    href={`/admission/new?inquiryId=${encodeURIComponent(selectedInquiry.id)}&firstName=${encodeURIComponent(selectedInquiry.firstName || '')}&lastName=${encodeURIComponent(selectedInquiry.lastName || '')}&childName=${encodeURIComponent(`${selectedInquiry.firstName || ''} ${selectedInquiry.lastName || ''}`.trim())}&parentName=${encodeURIComponent(selectedInquiry.parentName || '')}&phone=${encodeURIComponent(selectedInquiry.parentPhone || '')}&email=${encodeURIComponent(selectedInquiry.parentEmail || '')}&gender=${encodeURIComponent(selectedInquiry.gender || '')}&dob=${encodeURIComponent(selectedInquiry.dob ? new Date(selectedInquiry.dob).toISOString().split('T')[0] : '')}&targetClass=${encodeURIComponent(selectedInquiry.class?.name || '')}&classId=${encodeURIComponent(selectedInquiry.classId || '')}&campusId=${encodeURIComponent(selectedInquiry.campusId || '')}${selectedInquiry.sectionId ? `&sectionId=${encodeURIComponent(selectedInquiry.sectionId)}` : ''}${selectedInquiry.aadhaarNo ? `&aadhaarNo=${encodeURIComponent(selectedInquiry.aadhaarNo)}` : ''}${selectedInquiry.notes ? `&notes=${encodeURIComponent(selectedInquiry.notes)}` : ''}`}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-bold border border-purple-200 transition-colors shadow-sm"
                  >
                    <UserPlus size={14} />
                    <span>Convert in Full Admission Form</span>
                  </Link>
                )}

                {selectedInquiry.status !== 'ENROLLED' && (
                  <button
                    onClick={() => openEnrollModal(selectedInquiry)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-bold shadow-sm"
                  >
                    <UserCheck size={14} />
                    <span>Complete Enrollment</span>
                  </button>
                )}

                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-xl"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 text-xs">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 uppercase font-bold text-[10px]">Guardian</p>
                <p className="font-bold text-gray-900 mt-1">{selectedInquiry.parentName}</p>
                <p className="text-gray-600 font-mono mt-0.5">{selectedInquiry.parentPhone}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 uppercase font-bold text-[10px]">Class & Campus</p>
                <p className="font-bold text-indigo-700 mt-1">Class {selectedInquiry.class?.name}</p>
                <p className="text-gray-600 mt-0.5">{selectedInquiry.campus?.name}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 uppercase font-bold text-[10px]">Aadhaar / Identity</p>
                <p className="font-bold font-mono text-gray-900 mt-1">
                  {selectedInquiry.aadhaarNo || 'Not Provided'}
                </p>
                <p className="text-gray-600 mt-0.5">DOB: {new Date(selectedInquiry.dob).toLocaleDateString()}</p>
              </div>

              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-gray-400 uppercase font-bold text-[10px]">Pipeline Stage Switcher</p>
                <select
                  value={selectedInquiry.status}
                  onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value as AdmissionStatus)}
                  className="mt-1 w-full p-1.5 rounded-lg border border-gray-200 font-bold text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  {PIPELINE_COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                  <option value="REJECTED">Reject Application</option>
                  <option value="WITHDRAWN">Withdrawn by Parent</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Atomic Enrollment Dialog */}
        {isEnrollModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in-50">
            <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Atomic Student SIS Enrollment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Locks section capacity, assigns roll number & provisions NextAuth accounts.
                  </p>
                </div>
                <button
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleEnrollSubmit} className="space-y-4 mt-5">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Section *</label>
                  <select
                    value={enrollForm.sectionId}
                    onChange={(e) => setEnrollForm((prev) => ({ ...prev, sectionId: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    required
                  >
                    {classes
                      .find((c) => c.id === enrollForm.classId)
                      ?.sections?.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          Section {s.name} (Max Capacity: {s.capacity || 40})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Roll Number (Optional - Auto-assigned if empty)
                  </label>
                  <input
                    type="text"
                    placeholder="Auto sequential (e.g. 1, 2, 3...)"
                    value={enrollForm.rollNo}
                    onChange={(e) => setEnrollForm((prev) => ({ ...prev, rollNo: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-[11px] text-teal-900 leading-relaxed">
                  ✓ Wrapped in atomic <code className="font-mono font-bold">prisma.$transaction</code> with optimistic
                  locking on <code className="font-mono font-bold">ClassCapacity</code> table to prevent concurrent
                  overbooking.
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsEnrollModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={enrolling}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-md shadow-teal-100 disabled:opacity-50"
                  >
                    {enrolling ? 'Provisioning SIS...' : 'Execute Enrollment'}
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
