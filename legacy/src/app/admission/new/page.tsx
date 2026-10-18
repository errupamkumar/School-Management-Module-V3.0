'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/ui';
import {
  Save,
  Upload,
  UserPlus,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Phone,
  User,
  BookOpen,
  MapPin,
  ArrowRight,
  HelpCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { INDIAN_STATES, CLASS_NAMES, SECTION_NAMES } from '@/utils/helpers';

function NewAdmissionContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'student' | 'parent' | 'academic' | 'address'>('student');
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Inquiry Conversion metadata from URL params
  const [inquiryId, setInquiryId] = useState<string | null>(null);
  const [inquiryNotes, setInquiryNotes] = useState<string | null>(null);
  const [inquiryLeadName, setInquiryLeadName] = useState<string | null>(null);
  const [targetClassQuery, setTargetClassQuery] = useState<string | null>(null);

  const [form, setForm] = useState({
    // Student Info
    firstName: '',
    lastName: '',
    gender: '',
    dob: '',
    bloodGroup: '',
    religion: '',
    caste: '',
    category: '',
    nationality: 'Indian',
    aadhaarNo: '',
    photo: null as File | null,
    signatureHindi: null as File | null,
    signatureEnglish: null as File | null,
    // Parent Info
    fatherName: '',
    fatherIdCard: '',
    fatherEmail: '',
    fatherPhone: '',
    motherName: '',
    motherPhone: '',
    religion_parent: '',
    fatherOccupation: '',
    motherOccupation: '',
    annualIncome: '',
    // Academic Info
    campusId: '',
    classId: '',
    sectionId: '',
    session: '2025-26',
    previousSchool: '',
    tcNumber: '',
    // Address
    streetAddress: '',
    village: '',
    post: '',
    policeStation: '',
    city: '',
    district: '',
    state: 'Uttar Pradesh',
    pincode: '',
  });

  const [campuses, setCampuses] = useState<Array<{ id: string; name: string }>>([]);
  const [classes, setClasses] = useState<
    Array<{ id: string; name: string; sections: Array<{ id: string; name: string; capacity?: number }> }>
  >([]);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [capacityStatus, setCapacityStatus] = useState<{ availableSeats: number; maxCapacity: number } | null>(null);
  const [admittedStudent, setAdmittedStudent] = useState<any>(null);

  // Read URL query parameters on mount to prefill inquiry details
  useEffect(() => {
    if (!searchParams) return;

    const inq = searchParams.get('inquiryId');
    if (inq) setInquiryId(inq);

    const notes = searchParams.get('notes');
    if (notes) setInquiryNotes(notes);

    // Student Names
    const rawFirst = searchParams.get('firstName');
    const rawLast = searchParams.get('lastName');
    const rawChildName = searchParams.get('childName');

    let fName = '';
    let lName = '';
    if (rawFirst || rawLast) {
      fName = rawFirst || '';
      lName = rawLast || '';
    } else if (rawChildName) {
      const parts = rawChildName.trim().split(/\s+/);
      fName = parts[0] || '';
      lName = parts.slice(1).join(' ') || '';
    }
    if (rawChildName || fName) {
      setInquiryLeadName(rawChildName || `${fName} ${lName}`.trim());
    }

    // Parent details
    const pName = searchParams.get('parentName') || searchParams.get('fatherName') || '';
    const phone = searchParams.get('phone') || searchParams.get('fatherPhone') || '';
    const email = searchParams.get('email') || searchParams.get('fatherEmail') || '';

    // Demographics
    const rawGender = (searchParams.get('gender') || '').toUpperCase();
    const gender = ['MALE', 'FEMALE', 'OTHER'].includes(rawGender) ? rawGender : '';

    let dob = searchParams.get('dob') || '';
    if (dob && dob.includes('T')) {
      dob = dob.split('T')[0];
    }

    const category = searchParams.get('category') || '';
    const address = searchParams.get('address') || searchParams.get('streetAddress') || '';
    const aadhaar = searchParams.get('aadhaarNo') || '';

    // Target Class & Academic
    const targetClass = searchParams.get('targetClass') || searchParams.get('classId') || '';
    if (targetClass) setTargetClassQuery(targetClass);

    const cId = searchParams.get('campusId') || '';
    const sId = searchParams.get('sectionId') || '';

    setForm((prev) => ({
      ...prev,
      firstName: fName || prev.firstName,
      lastName: lName || prev.lastName,
      fatherName: pName || prev.fatherName,
      fatherPhone: phone || prev.fatherPhone,
      fatherEmail: email || prev.fatherEmail,
      gender: gender || prev.gender,
      dob: dob || prev.dob,
      category: category || prev.category,
      streetAddress: address || prev.streetAddress,
      aadhaarNo: aadhaar || prev.aadhaarNo,
      campusId: cId || prev.campusId,
      sectionId: sId || prev.sectionId,
    }));
  }, [searchParams]);

  // Load campuses and classes
  useEffect(() => {
    fetch('/api/campus')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          setCampuses(d.data);
          setForm((prev) => ({
            ...prev,
            campusId: prev.campusId || d.data[0].id,
          }));
        }
      })
      .catch(() => {});

    fetch('/api/classes')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data && d.data.length > 0) {
          setClasses(d.data);

          // Resolve class from query if available
          setForm((prev) => {
            let selectedClass = d.data[0];

            if (targetClassQuery) {
              const cleanedQuery = targetClassQuery.replace(/class/i, '').trim().toLowerCase();
              const found = d.data.find(
                (c: any) =>
                  c.id === targetClassQuery ||
                  c.name.toLowerCase() === targetClassQuery.toLowerCase() ||
                  c.name.toLowerCase() === cleanedQuery ||
                  targetClassQuery.toLowerCase().includes(c.name.toLowerCase())
              );
              if (found) selectedClass = found;
            }

            const currentClassId = prev.classId || selectedClass.id;
            const activeClassObj = d.data.find((c: any) => c.id === currentClassId) || selectedClass;
            const firstSectionId = activeClassObj.sections?.[0]?.id || '';

            return {
              ...prev,
              classId: currentClassId,
              sectionId: prev.sectionId || firstSectionId,
            };
          });
        }
      })
      .catch(() => {});
  }, [targetClassQuery]);

  // Check section capacity whenever class or section changes
  useEffect(() => {
    if (!form.classId) return;
    const q = new URLSearchParams({
      action: 'check-capacity',
      classId: form.classId,
      ...(form.sectionId ? { sectionId: form.sectionId } : {}),
    });
    fetch(`/api/admission?${q.toString()}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCapacityStatus(res.data);
        }
      })
      .catch(() => {});
  }, [form.classId, form.sectionId]);

  // Duplicate identity check helper
  const checkDuplicates = async () => {
    if ((form.aadhaarNo && form.aadhaarNo.length === 12) || (form.fatherPhone && form.fatherPhone.length === 10)) {
      try {
        const q = new URLSearchParams({
          action: 'check-duplicate',
          aadhaarNo: form.aadhaarNo || '',
          phone: form.fatherPhone || '',
          firstName: form.firstName || '',
          lastName: form.lastName || '',
        });
        const res = await fetch(`/api/admission?${q.toString()}`);
        const data = await res.json();
        if (data.success && data.isDuplicate && data.matches?.length > 0) {
          setDuplicateWarning(`Warning: ${data.matches[0].description}`);
        } else {
          setDuplicateWarning(null);
        }
      } catch {}
    }
  };

  const update = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  // Live Required Fields Checklist & Validation Rules
  const requiredFields = useMemo(() => {
    return [
      {
        id: 'firstName',
        label: 'First Name',
        tab: 'student' as const,
        isComplete: Boolean(form.firstName.trim()),
      },
      {
        id: 'lastName',
        label: 'Last Name',
        tab: 'student' as const,
        isComplete: Boolean(form.lastName.trim()),
      },
      {
        id: 'gender',
        label: 'Gender',
        tab: 'student' as const,
        isComplete: Boolean(form.gender),
      },
      {
        id: 'dob',
        label: 'Date of Birth',
        tab: 'student' as const,
        isComplete: Boolean(form.dob),
      },
      {
        id: 'fatherName',
        label: 'Father / Guardian Name',
        tab: 'parent' as const,
        isComplete: Boolean(form.fatherName.trim()),
      },
      {
        id: 'fatherPhone',
        label: 'Father Phone (10 digits)',
        tab: 'parent' as const,
        isComplete: Boolean(form.fatherPhone.replace(/\D/g, '').length >= 10),
      },
      {
        id: 'campusId',
        label: 'Campus',
        tab: 'academic' as const,
        isComplete: Boolean(form.campusId),
      },
      {
        id: 'classId',
        label: 'Class',
        tab: 'academic' as const,
        isComplete: Boolean(form.classId),
      },
      {
        id: 'sectionId',
        label: 'Section',
        tab: 'academic' as const,
        isComplete: Boolean(form.sectionId),
      },
    ];
  }, [form]);

  const missingFields = useMemo(() => requiredFields.filter((f) => !f.isComplete), [requiredFields]);
  const completedFields = useMemo(() => requiredFields.filter((f) => f.isComplete), [requiredFields]);

  const missingStudent = useMemo(() => missingFields.filter((f) => f.tab === 'student'), [missingFields]);
  const missingParent = useMemo(() => missingFields.filter((f) => f.tab === 'parent'), [missingFields]);
  const missingAcademic = useMemo(() => missingFields.filter((f) => f.tab === 'academic'), [missingFields]);

  // Jump to specific field across tabs
  const jumpToField = (field: { id: string; tab: 'student' | 'parent' | 'academic' }) => {
    setActiveTab(field.tab);
    setTimeout(() => {
      const el = document.getElementById(`input-${field.id}`);
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAttemptedSubmit(true);

    // Gating check: if any required field is missing, prevent submission and prompt the user
    if (missingFields.length > 0) {
      const firstMissing = missingFields[0];
      jumpToField(firstMissing);

      const tabTitle =
        firstMissing.tab === 'student'
          ? 'Student Information'
          : firstMissing.tab === 'parent'
          ? 'Parent Information'
          : 'Academic Information';

      toast.error(
        `Please complete required fields before admitting: ${missingFields.map((f) => f.label).join(', ')}`,
        { duration: 5000, id: 'missing-fields-error' }
      );
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        inquiryId: inquiryId || undefined,
      };

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Student admitted! Admission No: ${data.data.admissionNo}`, { duration: 6000 });
        setAdmittedStudent(data.data);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        toast.error(data.error || 'Failed to admit student');
      }
    } catch {
      toast.error('Something went wrong during admission');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { key: 'student', label: 'Student Information', missingCount: missingStudent.length },
    { key: 'parent', label: 'Parent Information', missingCount: missingParent.length },
    { key: 'academic', label: 'Academic Information', missingCount: missingAcademic.length },
    { key: 'address', label: 'Student Address', missingCount: 0 },
  ];

  return (
    <DashboardLayout>
      <PageHeader
        title="New Student Admission"
        subtitle="Register a new student in the School Information System (SIS)"
        actions={
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
          >
            <UserPlus size={16} />
            <span>{loading ? 'Submitting Details...' : 'Submit Details'}</span>
          </button>
        }
      />

      {/* Inquiry Lead Conversion Banner */}
      {inquiryId && (
        <div className="mb-6 rounded-3xl bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 text-white shadow-xl border border-indigo-500/20 animate-in fade-in-50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md text-amber-300 flex items-center justify-center shadow-inner">
                <Sparkles size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-amber-950">
                    CRM Inquiry Conversion
                  </span>
                  <span className="text-xs font-mono text-purple-200">Ref: #{inquiryId}</span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white mt-1">
                  Converting Lead: {inquiryLeadName || `${form.firstName} ${form.lastName}` || 'Prospective Student'}
                </h3>
                {inquiryNotes && (
                  <p className="text-xs text-purple-200/90 mt-0.5 line-clamp-1">
                    <span className="font-semibold text-amber-200">Counselor Notes:</span> {inquiryNotes}
                  </p>
                )}
              </div>
            </div>

            {/* Completion Meter */}
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-sm px-4 py-3 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-purple-200 tracking-wider">Required Readiness</p>
                <p className="text-sm font-black text-white font-mono">
                  {completedFields.length} / {requiredFields.length} Fields
                </p>
              </div>
              <div className="w-24 bg-white/10 rounded-full h-3 p-0.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    missingFields.length === 0 ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-400 to-emerald-400'
                  }`}
                  style={{ width: `${(completedFields.length / requiredFields.length) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Real-time Required Fields Status Checklist */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200">
                Required Fields Checklist:
              </span>
              <span className="text-[11px] text-purple-300">
                Click any pending field to jump directly to it and fill it
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {requiredFields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => jumpToField(field)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    field.isComplete
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-200 border border-amber-400/50 hover:bg-amber-500/30 animate-pulse'
                  }`}
                >
                  {field.isComplete ? (
                    <CheckCircle2 size={13} className="text-emerald-300" />
                  ) : (
                    <AlertTriangle size={13} className="text-amber-300" />
                  )}
                  <span>{field.label}</span>
                  {!field.isComplete && <span className="text-[10px] underline ml-0.5">(Fill)</span>}
                </button>
              ))}
            </div>

            {/* Dynamic Status Alert */}
            {missingFields.length > 0 ? (
              <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-100 flex items-start gap-2.5 text-xs">
                <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-200">
                    Action Required ({missingFields.length} field{missingFields.length > 1 ? 's' : ''} missing):
                  </span>{' '}
                  The selected inquiry is missing{' '}
                  <span className="font-semibold text-white">{missingFields.map((f) => f.label).join(', ')}</span>.
                  Please complete these required fields across the tabs below before finalizing admission.
                </div>
              </div>
            ) : (
              <div className="mt-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 flex items-center gap-2 text-xs font-semibold">
                <CheckCircle2 size={16} className="text-emerald-300 shrink-0" />
                <span>All mandatory admission details are complete and ready for enrollment submission!</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Duplicate Warning Alert */}
      {duplicateWarning && (
        <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-semibold flex items-center justify-between">
          <span>{duplicateWarning}</span>
          <button type="button" onClick={() => setDuplicateWarning(null)} className="text-amber-700 underline font-bold">
            Dismiss
          </button>
        </div>
      )}

      {/* Admitted Student Success Card */}
      {admittedStudent && (
        <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <h4 className="font-bold text-sm">Student Successfully Admitted &amp; Enrolled!</h4>
            </div>
            <p className="text-xs text-emerald-700 mt-1">
              Admission No: <span className="font-mono font-bold bg-emerald-100 px-2 py-0.5 rounded text-emerald-900">{admittedStudent.admissionNo}</span>
              <span className="mx-2">•</span>
              Student Name: <span className="font-bold">{admittedStudent.firstName} {admittedStudent.lastName}</span>
              {inquiryId && <span className="ml-2 font-mono text-[11px]">(Linked to Inquiry #{inquiryId})</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/students?search=${encodeURIComponent(admittedStudent.admissionNo)}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <span>View in Student Information</span>
              <ArrowRight size={14} />
            </a>
            <a
              href={`/fees/collect?admissionNo=${admittedStudent.admissionNo}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <span>Collect Fee</span>
              <ArrowRight size={14} />
            </a>
          </div>
        </div>
      )}

      {/* Cross-Tab Navigation Bar */}
      <div className="flex gap-2 mb-6 bg-gray-100/90 p-1.5 rounded-2xl border border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.key
                ? 'bg-white text-indigo-700 shadow-sm border border-indigo-100'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>{tab.label}</span>
            {tab.missingCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                {tab.missingCount} missing
              </span>
            ) : (
              tab.key !== 'address' && (
                <span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px]">
                  ✓
                </span>
              )
            )}
          </button>
        ))}
      </div>

      {/* Main Multi-Tab Admission Form */}
      <form id="admission-form" onSubmit={handleSubmit} noValidate>
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          {/* TAB 1: Student Information */}
          {activeTab === 'student' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <User size={18} className="text-indigo-600" />
                  <span>Student Demographic Information</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Core student identity, gender, DOB, and credentials</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="form-label">
                    First Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="input-firstName"
                    type="text"
                    value={form.firstName}
                    onChange={(e) => update('firstName', e.target.value)}
                    placeholder="e.g. Aanya"
                    className={`form-input ${
                      attemptedSubmit && !form.firstName.trim()
                        ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100'
                        : ''
                    }`}
                  />
                  {attemptedSubmit && !form.firstName.trim() && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> First Name is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Last Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="input-lastName"
                    type="text"
                    value={form.lastName}
                    onChange={(e) => update('lastName', e.target.value)}
                    placeholder="e.g. Saxena"
                    className={`form-input ${
                      attemptedSubmit && !form.lastName.trim()
                        ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100'
                        : ''
                    }`}
                  />
                  {attemptedSubmit && !form.lastName.trim() && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Last Name is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Gender <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    id="input-gender"
                    value={form.gender}
                    onChange={(e) => update('gender', e.target.value)}
                    className={`form-select ${
                      attemptedSubmit && !form.gender ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100' : ''
                    }`}
                  >
                    <option value="">Select Gender</option>
                    <option value="MALE">Male / पुरुष</option>
                    <option value="FEMALE">Female / महिला</option>
                    <option value="OTHER">Other / अन्य</option>
                  </select>
                  {attemptedSubmit && !form.gender && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Gender is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Date of Birth <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="input-dob"
                    type="date"
                    value={form.dob}
                    onChange={(e) => update('dob', e.target.value)}
                    className={`form-input ${
                      attemptedSubmit && !form.dob ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100' : ''
                    }`}
                  />
                  {attemptedSubmit && !form.dob && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Date of Birth is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">Blood Group</label>
                  <select
                    value={form.bloodGroup}
                    onChange={(e) => update('bloodGroup', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Religion</label>
                  <select
                    value={form.religion}
                    onChange={(e) => update('religion', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select</option>
                    {['Hindu', 'Muslim', 'Christian', 'Sikh', 'Buddhist', 'Jain', 'Other'].map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Caste</label>
                  <input
                    type="text"
                    value={form.caste}
                    onChange={(e) => update('caste', e.target.value)}
                    placeholder="e.g. Brahmin, Rajput, etc."
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <select
                    value={form.category}
                    onChange={(e) => update('category', e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Category</option>
                    {['General', 'OBC', 'SC', 'ST', 'EWS'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Aadhaar Number (12 Digits)</label>
                  <input
                    type="text"
                    value={form.aadhaarNo}
                    onChange={(e) => update('aadhaarNo', e.target.value)}
                    onBlur={checkDuplicates}
                    className="form-input font-mono"
                    maxLength={12}
                    placeholder="12-digit Aadhaar"
                  />
                </div>

                <div>
                  <label className="form-label">Student Photo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => update('photo', e.target.files?.[0])}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Signature (Hindi)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => update('signatureHindi', e.target.files?.[0])}
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Signature (English)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => update('signatureEnglish', e.target.files?.[0])}
                    className="form-input"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Parent Information */}
          {activeTab === 'parent' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Phone size={18} className="text-purple-600" />
                  <span>Parent & Guardian Information</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Emergency contacts, guardian credentials for portal login & SMS updates
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="form-label">
                    Father / Guardian Name <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="input-fatherName"
                    type="text"
                    value={form.fatherName}
                    onChange={(e) => update('fatherName', e.target.value)}
                    placeholder="e.g. Deepak Saxena"
                    className={`form-input ${
                      attemptedSubmit && !form.fatherName.trim()
                        ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100'
                        : ''
                    }`}
                  />
                  {attemptedSubmit && !form.fatherName.trim() && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Father Name is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Father Phone No <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <input
                    id="input-fatherPhone"
                    type="tel"
                    value={form.fatherPhone}
                    onChange={(e) => update('fatherPhone', e.target.value)}
                    onBlur={checkDuplicates}
                    className={`form-input font-mono ${
                      attemptedSubmit && form.fatherPhone.replace(/\D/g, '').length < 10
                        ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100'
                        : ''
                    }`}
                    maxLength={10}
                    placeholder="10-digit mobile number"
                  />
                  {attemptedSubmit && form.fatherPhone.replace(/\D/g, '').length < 10 && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Valid 10-digit phone number is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">Father Email (Portal Login)</label>
                  <input
                    type="email"
                    value={form.fatherEmail}
                    onChange={(e) => update('fatherEmail', e.target.value)}
                    placeholder="father@example.com"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Father ID Card (Aadhaar/PAN)</label>
                  <input
                    type="text"
                    value={form.fatherIdCard}
                    onChange={(e) => update('fatherIdCard', e.target.value)}
                    placeholder="ID card number"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Mother Name</label>
                  <input
                    type="text"
                    value={form.motherName}
                    onChange={(e) => update('motherName', e.target.value)}
                    placeholder="Mother's name"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Mother Phone No</label>
                  <input
                    type="tel"
                    value={form.motherPhone}
                    onChange={(e) => update('motherPhone', e.target.value)}
                    className="form-input font-mono"
                    maxLength={10}
                    placeholder="10-digit mobile"
                  />
                </div>

                <div>
                  <label className="form-label">Father Occupation</label>
                  <input
                    type="text"
                    value={form.fatherOccupation}
                    onChange={(e) => update('fatherOccupation', e.target.value)}
                    placeholder="e.g. Government Service, Business"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Mother Occupation</label>
                  <input
                    type="text"
                    value={form.motherOccupation}
                    onChange={(e) => update('motherOccupation', e.target.value)}
                    placeholder="e.g. Homemaker, Teacher"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Annual Income (₹)</label>
                  <input
                    type="number"
                    value={form.annualIncome}
                    onChange={(e) => update('annualIncome', e.target.value)}
                    placeholder="e.g. 500000"
                    className="form-input font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Academic Information */}
          {activeTab === 'academic' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen size={18} className="text-teal-600" />
                  <span>Academic Enrollment Information</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Campus branch, Class, and Section capacity assignment
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="form-label">
                    Campus Branch <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    id="input-campusId"
                    value={form.campusId}
                    onChange={(e) => update('campusId', e.target.value)}
                    className={`form-select ${
                      attemptedSubmit && !form.campusId ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100' : ''
                    }`}
                  >
                    <option value="">Select Campus</option>
                    {campuses.map((camp) => (
                      <option key={camp.id} value={camp.id}>
                        {camp.name}
                      </option>
                    ))}
                  </select>
                  {attemptedSubmit && !form.campusId && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Campus is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Class <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    id="input-classId"
                    value={form.classId}
                    onChange={(e) => {
                      const newClassId = e.target.value;
                      update('classId', newClassId);
                      const selected = classes.find((c) => c.id === newClassId);
                      if (selected && selected.sections?.length > 0) {
                        update('sectionId', selected.sections[0].id);
                      } else {
                        update('sectionId', '');
                      }
                    }}
                    className={`form-select ${
                      attemptedSubmit && !form.classId ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100' : ''
                    }`}
                  >
                    <option value="">Select Class</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        Class {c.name}
                      </option>
                    ))}
                  </select>
                  {attemptedSubmit && !form.classId && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Class is required
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="form-label !mb-0">
                      Section <span className="text-rose-500 font-bold">*</span>
                    </label>
                    {capacityStatus && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        {capacityStatus.availableSeats} / {capacityStatus.maxCapacity} Seats Available
                      </span>
                    )}
                  </div>
                  <select
                    id="input-sectionId"
                    value={form.sectionId}
                    onChange={(e) => update('sectionId', e.target.value)}
                    className={`form-select ${
                      attemptedSubmit && !form.sectionId ? 'border-rose-400 bg-rose-50/20 ring-2 ring-rose-100' : ''
                    }`}
                  >
                    <option value="">Select Section</option>
                    {(classes.find((c) => c.id === form.classId)?.sections || []).map((s) => (
                      <option key={s.id} value={s.id}>
                        Section {s.name}
                      </option>
                    ))}
                  </select>
                  {attemptedSubmit && !form.sectionId && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle size={12} /> Section is required
                    </p>
                  )}
                </div>

                <div>
                  <label className="form-label">
                    Academic Session <span className="text-rose-500 font-bold">*</span>
                  </label>
                  <select
                    id="input-session"
                    value={form.session}
                    onChange={(e) => update('session', e.target.value)}
                    className="form-select font-semibold"
                  >
                    <option value="2025-26">2025-26 (Current Academic Session)</option>
                    <option value="2026-27">2026-27 (Upcoming Session)</option>
                    <option value="2024-25">2024-25 (Previous Session)</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Previous School</label>
                  <input
                    type="text"
                    value={form.previousSchool}
                    onChange={(e) => update('previousSchool', e.target.value)}
                    placeholder="Name of last school attended"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Transfer Certificate (TC) Number</label>
                  <input
                    type="text"
                    value={form.tcNumber}
                    onChange={(e) => update('tcNumber', e.target.value)}
                    placeholder="TC No."
                    className="form-input font-mono"
                  />
                </div>

                <div>
                  <label className="form-label">TC & Supporting Documents</label>
                  <input type="file" multiple className="form-input" />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Student Address */}
          {activeTab === 'address' && (
            <div className="space-y-6">
              <div className="border-b border-gray-100 pb-3">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <MapPin size={18} className="text-amber-600" />
                  <span>Residential Address</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">Permanent residential details and postal zone</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-3">
                  <label className="form-label">Street Address / House No.</label>
                  <input
                    type="text"
                    value={form.streetAddress}
                    onChange={(e) => update('streetAddress', e.target.value)}
                    placeholder="e.g. 12/48, Civil Lines"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Village / Mohalla</label>
                  <input
                    type="text"
                    value={form.village}
                    onChange={(e) => update('village', e.target.value)}
                    placeholder="Village or locality"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Post Office</label>
                  <input
                    type="text"
                    value={form.post}
                    onChange={(e) => update('post', e.target.value)}
                    placeholder="Post Office name"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">Police Station / थाना</label>
                  <input
                    type="text"
                    value={form.policeStation}
                    onChange={(e) => update('policeStation', e.target.value)}
                    placeholder="Local police station"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">City</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="City"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">District / जिला</label>
                  <input
                    type="text"
                    value={form.district}
                    onChange={(e) => update('district', e.target.value)}
                    placeholder="District"
                    className="form-input"
                  />
                </div>

                <div>
                  <label className="form-label">State</label>
                  <select
                    value={form.state}
                    onChange={(e) => update('state', e.target.value)}
                    className="form-select"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Pin Code</label>
                  <input
                    type="text"
                    value={form.pincode}
                    onChange={(e) => update('pincode', e.target.value)}
                    className="form-input font-mono"
                    maxLength={6}
                    placeholder="6-digit PIN"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Form Navigation Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={() => {
                const order = ['student', 'parent', 'academic', 'address'];
                const idx = order.indexOf(activeTab);
                if (idx > 0) setActiveTab(order[idx - 1] as any);
              }}
              className="btn-secondary w-full sm:w-auto"
              disabled={activeTab === 'student'}
            >
              Previous Section
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {activeTab !== 'address' && (
                <button
                  type="button"
                  onClick={() => {
                    const order = ['student', 'parent', 'academic', 'address'];
                    const idx = order.indexOf(activeTab);
                    if (idx < order.length - 1) setActiveTab(order[idx + 1] as any);
                  }}
                  className="btn-secondary w-full sm:w-auto"
                >
                  <span>Next Section</span>
                  <ArrowRight size={14} className="ml-1" />
                </button>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full sm:w-auto shadow-md shadow-indigo-100"
              >
                {loading ? (
                  'Submitting...'
                ) : (
                  <>
                    <Save size={16} />
                    <span>Submit & Admit Student</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </DashboardLayout>
  );
}

export default function NewAdmissionPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="p-8 text-center text-sm font-semibold text-gray-500 animate-pulse">
            Loading Admission Portal...
          </div>
        </DashboardLayout>
      }
    >
      <NewAdmissionContent />
    </Suspense>
  );
}
