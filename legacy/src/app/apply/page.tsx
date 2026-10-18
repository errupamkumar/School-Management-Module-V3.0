'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  User,
  Users,
  BookOpen,
  MapPin,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Download,
  Save,
  Trash2,
  AlertCircle,
  Clock,
  Sparkles,
  Phone,
  Mail,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CampusOption {
  id: string;
  name: string;
  code: string;
  city: string;
}

interface ClassOption {
  id: string;
  name: string;
  campusId: string;
  sections: Array<{ id: string; name: string; capacity: number }>;
}

const STORAGE_KEY = 'vidyalaya_admission_draft';

export default function PublicApplyPortal() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<any>(null);

  // Dynamic Options
  const [campuses, setCampuses] = useState<CampusOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [capacityInfo, setCapacityInfo] = useState<{
    maxCapacity: number;
    enrolledCount: number;
    availableSeats: number;
    isHouseFull: boolean;
  } | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Student
    firstName: '',
    lastName: '',
    gender: 'MALE',
    dob: '',
    bloodGroup: '',
    category: 'GENERAL',
    aadhaarNo: '',
    nationality: 'Indian',

    // Step 2: Parent
    parentName: '',
    parentPhone: '',
    parentEmail: '',
    parentRelation: 'FATHER',
    parentAadhaar: '',
    parentOccupation: '',
    annualIncome: '',

    // Step 3: Academic
    campusId: '',
    classId: '',
    previousSchool: '',
    previousGrade: '',

    // Step 4: Address & Notes
    streetAddress: '',
    city: 'Varanasi',
    state: 'Uttar Pradesh',
    pincode: '',
    notes: '',
  });

  // Load classes and campuses
  useEffect(() => {
    fetch('/api/admission/public')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data) {
          setCampuses(d.data.campuses || []);
          setClasses(d.data.classes || []);

          // Set defaults if empty
          if (d.data.campuses?.length > 0 && !formData.campusId) {
            setFormData((prev) => ({ ...prev, campusId: d.data.campuses[0].id }));
          }
          if (d.data.classes?.length > 0 && !formData.classId) {
            setFormData((prev) => ({ ...prev, classId: d.data.classes[0].id }));
          }
        }
      })
      .catch((err) => console.error('Failed to load admission public data:', err));
  }, []);

  // Restore draft from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
        setLastSaved('Restored from draft');
      }
    } catch {}
  }, []);

  // Check seat capacity whenever classId changes
  useEffect(() => {
    if (!formData.classId) return;
    fetch(`/api/admission/public?action=check-capacity&classId=${formData.classId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data) {
          setCapacityInfo(res.data);
        }
      })
      .catch(() => {});
  }, [formData.classId]);

  // Handle field change with auto-save
  const handleChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } catch {}
      return updated;
    });
  };

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to clear your saved draft?')) {
      localStorage.removeItem(STORAGE_KEY);
      setFormData({
        firstName: '',
        lastName: '',
        gender: 'MALE',
        dob: '',
        bloodGroup: '',
        category: 'GENERAL',
        aadhaarNo: '',
        nationality: 'Indian',
        parentName: '',
        parentPhone: '',
        parentEmail: '',
        parentRelation: 'FATHER',
        parentAadhaar: '',
        parentOccupation: '',
        annualIncome: '',
        campusId: campuses[0]?.id || '',
        classId: classes[0]?.id || '',
        previousSchool: '',
        previousGrade: '',
        streetAddress: '',
        city: 'Varanasi',
        state: 'Uttar Pradesh',
        pincode: '',
        notes: '',
      });
      setLastSaved(null);
      setCurrentStep(1);
      toast.success('Draft cleared.');
    }
  };

  // Step Validation
  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        toast.error('Please enter student first and last name.');
        return false;
      }
      if (!formData.dob) {
        toast.error('Please select date of birth.');
        return false;
      }
      if (formData.aadhaarNo && !/^\d{12}$/.test(formData.aadhaarNo)) {
        toast.error('Aadhaar must be exactly 12 numeric digits.');
        return false;
      }
    } else if (step === 2) {
      if (!formData.parentName.trim()) {
        toast.error('Please enter parent or guardian name.');
        return false;
      }
      if (!/^[6-9]\d{9}$/.test(formData.parentPhone)) {
        toast.error('Please enter a valid 10-digit Indian mobile number.');
        return false;
      }
      if (formData.parentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
        toast.error('Please enter a valid email address.');
        return false;
      }
    } else if (step === 3) {
      if (!formData.campusId) {
        toast.error('Please select a campus.');
        return false;
      }
      if (!formData.classId) {
        toast.error('Please select target class.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Final Form Submission
  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admission/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (data.success) {
        setSubmissionResult(data.data);
        localStorage.removeItem(STORAGE_KEY);
        toast.success('Application submitted successfully!');
      } else {
        toast.error(data.error || 'Submission failed. Please check your details.');
      }
    } catch {
      toast.error('Connection error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Instant PDF Token Generation
  const downloadPdfSlip = () => {
    if (!submissionResult) return;

    const doc = new jsPDF();
    const primaryColor = [79, 70, 229]; // Indigo

    // Header banner
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, 210, 36, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('VIDYALAYA GROUP OF INSTITUTIONS', 105, 16, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('OFFICIAL ONLINE ADMISSION ACKNOWLEDGMENT SLIP (SESSION 2025-26)', 105, 26, { align: 'center' });

    // Application details box
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Applicant Credentials & Token', 14, 48);

    (doc as any).autoTable({
      startY: 52,
      head: [['Field / Attribute', 'Registered Details']],
      body: [
        ['Application Number', submissionResult.applicationNo],
        ['Security Token', submissionResult.token],
        ['Applicant Full Name', submissionResult.studentName || `${formData.firstName} ${formData.lastName}`],
        ['Gender / Date of Birth', `${formData.gender} | ${formData.dob}`],
        ['Target Class', submissionResult.className || 'Selected Class'],
        ['Campus Allotted', submissionResult.campusName || 'Main Campus'],
        ['Guardian Name', formData.parentName],
        ['Registered Phone', formData.parentPhone],
        ['Submission Timestamp', new Date().toLocaleString('en-IN')],
        ['Application Status', 'FORM_SUBMITTED (Document Verification Pending)'],
      ],
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      styles: { fontSize: 9, cellPadding: 4 },
      columnStyles: { 0: { fontStyle: 'bold', width: 65 } },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;

    // Instructions Box
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Instructions for Parents / Guardians:', 14, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const instructions = [
      '1. Please retain this acknowledgment slip and note your Security Token for future verification.',
      '2. The Admission Desk will contact you within 24 working hours for document verification scheduling.',
      '3. Required Documents at Desk: Original Birth Certificate, Transfer Certificate (TC), Aadhaar Card & 4 Photos.',
      '4. Final seat reservation is confirmed upon first installment fee settlement at the institutional counter.',
    ];
    let offset = finalY + 6;
    instructions.forEach((line) => {
      doc.text(line, 14, offset);
      offset += 6;
    });

    // Verification QR / Stamp Box
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.rect(14, offset + 6, 182, 24);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `DIGITALLY VERIFIED ONLINE APPLICATION • SYSTEM REF: ${submissionResult.token} • NO SIGNATURE REQUIRED`,
      105,
      offset + 20,
      { align: 'center' }
    );

    doc.save(`Vidyalaya_Admission_${submissionResult.applicationNo}.pdf`);
    toast.success('Official PDF Token Slip downloaded!');
  };

  const steps = [
    { number: 1, title: 'Student', icon: User, desc: 'Identity & Bio' },
    { number: 2, title: 'Parent', icon: Users, desc: 'Guardian Details' },
    { number: 3, title: 'Academic', icon: BookOpen, desc: 'Class & History' },
    { number: 4, title: 'Address', icon: MapPin, desc: 'Location & Notes' },
    { number: 5, title: 'Review', icon: CheckCircle2, desc: 'Confirm & Token' },
  ];

  const selectedClassName = classes.find((c) => c.id === formData.classId)?.name || 'Class';
  const selectedCampusName = campuses.find((c) => c.id === formData.campusId)?.name || 'Campus';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50/30 text-gray-800 antialiased pb-20">
      <Toaster position="top-right" />

      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="font-black text-lg text-gray-900 tracking-tight leading-tight">Vidyalaya ERP</h1>
              <p className="text-[11px] font-semibold text-indigo-600 uppercase tracking-wider">
                Online Admission Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {lastSaved && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Draft saved: {lastSaved}
              </span>
            )}
            <Link
              href="/login"
              className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-xl border border-gray-200 hover:border-indigo-300"
            >
              Staff Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
        {/* Hero Section */}
        <div className="mb-8 text-center sm:text-left sm:flex sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold mb-3">
              <Sparkles size={14} />
              <span>Academic Session 2025-26 Admissions Open</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Student Registration Portal
            </h2>
            <p className="text-sm text-gray-500 mt-1 max-w-xl">
              Complete the self-application wizard in 5 simple steps. Auto-saved locally with instant printable token
              receipt.
            </p>
          </div>

          {capacityInfo && (
            <div className="mt-4 sm:mt-0 p-4 rounded-2xl bg-white border border-indigo-100 shadow-sm inline-flex items-center gap-4 text-left">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
                {capacityInfo.availableSeats}
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Class {selectedClassName} Seats</p>
                <p className="text-sm font-black text-gray-900">
                  {capacityInfo.isHouseFull ? (
                    <span className="text-rose-600 font-bold">House Full (Waitlist)</span>
                  ) : (
                    <span>
                      <span className="text-emerald-600">{capacityInfo.availableSeats} Available</span> / {capacityInfo.maxCapacity}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Success Modal / Card if Submitted */}
        {submissionResult ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-100 shadow-xl shadow-emerald-50 text-center max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
            <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-inner">
              <CheckCircle2 size={42} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              Application Registered Successfully
            </div>

            <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Welcome to Vidyalaya Family!
            </h3>
            <p className="text-sm text-gray-500 mt-2">
              Your application has been logged into the SIS Lead Pipeline. Download your official acknowledgment token
              below.
            </p>

            {/* Token Badge */}
            <div className="my-6 p-5 rounded-2xl bg-slate-50 border border-gray-200 text-left grid grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Application No</p>
                <p className="text-lg font-black text-indigo-600 font-mono mt-0.5">{submissionResult.applicationNo}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Security Token</p>
                <p className="text-lg font-black text-purple-600 font-mono mt-0.5">{submissionResult.token}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Student Name</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{submissionResult.studentName}</p>
              </div>
              <div>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Class & Campus</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  Class {submissionResult.className} • {submissionResult.campusName}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={downloadPdfSlip}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
              >
                <Download size={18} />
                <span>Download Official PDF Token Slip</span>
              </button>

              <button
                onClick={() => {
                  setSubmissionResult(null);
                  setCurrentStep(1);
                }}
                className="w-full sm:w-auto px-5 py-3.5 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all"
              >
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-slate-100 overflow-hidden">
            {/* Stepper Progress Bar */}
            <div className="border-b border-gray-100 bg-slate-50/70 p-4 sm:p-6">
              <div className="grid grid-cols-5 gap-2 max-w-3xl mx-auto">
                {steps.map((s) => {
                  const Icon = s.icon;
                  const isActive = currentStep === s.number;
                  const isCompleted = currentStep > s.number;

                  return (
                    <button
                      key={s.number}
                      type="button"
                      onClick={() => s.number < currentStep && setCurrentStep(s.number)}
                      disabled={s.number > currentStep}
                      className={`flex flex-col items-center text-center transition-all ${
                        isActive
                          ? 'text-indigo-600'
                          : isCompleted
                          ? 'text-emerald-600 cursor-pointer'
                          : 'text-gray-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-black transition-all mb-1 ${
                          isActive
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 shadow-md'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                      </div>
                      <span className="text-[11px] font-bold tracking-tight hidden sm:block">{s.title}</span>
                      <span className="text-[9px] text-gray-400 hidden sm:block">{s.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step Form Body */}
            <div className="p-6 sm:p-10">
              {/* STEP 1: Student Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Step 1: Student Personal Details</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the student&apos;s full legal identity as stated in Birth Certificate or Aadhaar.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        First Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Aarav"
                        value={formData.firstName}
                        onChange={(e) => handleChange('firstName', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Sharma"
                        value={formData.lastName}
                        onChange={(e) => handleChange('lastName', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Gender *
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => handleChange('gender', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="MALE">Male / पुरुष</option>
                        <option value="FEMALE">Female / महिला</option>
                        <option value="OTHER">Other / अन्य</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        value={formData.dob}
                        onChange={(e) => handleChange('dob', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Student Aadhaar Number (12 Digits)
                      </label>
                      <input
                        type="text"
                        maxLength={12}
                        placeholder="123456789012"
                        value={formData.aadhaarNo}
                        onChange={(e) => handleChange('aadhaarNo', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Blood Group
                      </label>
                      <select
                        value={formData.bloodGroup}
                        onChange={(e) => handleChange('bloodGroup', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="">Select Blood Group</option>
                        <option value="A+">A+ Positive</option>
                        <option value="A-">A- Negative</option>
                        <option value="B+">B+ Positive</option>
                        <option value="B-">B- Negative</option>
                        <option value="AB+">AB+ Positive</option>
                        <option value="AB-">AB- Negative</option>
                        <option value="O+">O+ Positive</option>
                        <option value="O-">O- Negative</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Category
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => handleChange('category', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="GENERAL">General</option>
                        <option value="OBC">OBC (Other Backward Class)</option>
                        <option value="SC">SC (Scheduled Caste)</option>
                        <option value="ST">ST (Scheduled Tribe)</option>
                        <option value="EWS">EWS (Economically Weaker Section)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Parent / Guardian Information */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Step 2: Parent / Guardian Information</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Primary contact details for SMS alerts, NextAuth parent portal credentials, and billing.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Guardian Full Name *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Rajesh Sharma"
                        value={formData.parentName}
                        onChange={(e) => handleChange('parentName', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Mobile Number * (For SMS & Login)
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-3.5 text-xs font-bold text-gray-400">+91</span>
                        <input
                          type="tel"
                          maxLength={10}
                          placeholder="9876543210"
                          value={formData.parentPhone}
                          onChange={(e) => handleChange('parentPhone', e.target.value.replace(/\D/g, ''))}
                          className="w-full pl-12 pr-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Email Address
                      </label>
                      <input
                        type="email"
                        placeholder="rajesh.sharma@gmail.com"
                        value={formData.parentEmail}
                        onChange={(e) => handleChange('parentEmail', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Relationship to Student
                      </label>
                      <select
                        value={formData.parentRelation}
                        onChange={(e) => handleChange('parentRelation', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                      >
                        <option value="FATHER">Father / पिता</option>
                        <option value="MOTHER">Mother / माता</option>
                        <option value="GUARDIAN">Legal Guardian / अभिभावक</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Occupation
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Government Service / Business"
                        value={formData.parentOccupation}
                        onChange={(e) => handleChange('parentOccupation', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Annual Household Income (₹)
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 600000"
                        value={formData.annualIncome}
                        onChange={(e) => handleChange('annualIncome', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: Academic Preferences & History */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Step 3: Academic Details & Target Class</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Choose institutional campus, class for admission, and prior schooling background.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Select Campus *
                      </label>
                      <select
                        value={formData.campusId}
                        onChange={(e) => handleChange('campusId', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium"
                      >
                        {campuses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.city})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Applying For Class *
                      </label>
                      <select
                        value={formData.classId}
                        onChange={(e) => handleChange('classId', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white font-medium"
                      >
                        {classes.map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            Class {cls.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Previous School Attended (If any)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. St. Xavier Convent School"
                        value={formData.previousSchool}
                        onChange={(e) => handleChange('previousSchool', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Last Grade / Percentage Obtained
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 88.5% or A Grade"
                        value={formData.previousGrade}
                        onChange={(e) => handleChange('previousGrade', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Seat capacity badge */}
                  {capacityInfo && (
                    <div
                      className={`p-4 rounded-2xl flex items-center justify-between text-xs font-semibold ${
                        capacityInfo.isHouseFull
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <ShieldCheck size={18} />
                        <span>
                          {capacityInfo.isHouseFull
                            ? 'Warning: This class is currently full. Your application will be placed on priority waitlist.'
                            : `Seats available in Class ${selectedClassName}! Admissions are processed on first-come-first-served basis.`}
                        </span>
                      </div>
                      <span className="font-bold">
                        {capacityInfo.availableSeats} / {capacityInfo.maxCapacity} Seats Open
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 4: Address & Special Notes */}
              {currentStep === 4 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Step 4: Residential Address & Remarks</h3>
                    <p className="text-xs text-gray-500 mt-1">Permanent residential address for school transport & records.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Street Address / Village / Flat
                      </label>
                      <input
                        type="text"
                        placeholder="Flat 302, Royal Enclave, Kabir Nagar"
                        value={formData.streetAddress}
                        onChange={(e) => handleChange('streetAddress', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">City</label>
                      <input
                        type="text"
                        value={formData.city}
                        onChange={(e) => handleChange('city', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">State</label>
                      <input
                        type="text"
                        value={formData.state}
                        onChange={(e) => handleChange('state', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Pincode (6 Digits)
                      </label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="221005"
                        value={formData.pincode}
                        onChange={(e) => handleChange('pincode', e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                        Special Instructions / Transport Request / Medical Notes
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Mention transport requirement route or any allergies/medical conditions..."
                        value={formData.notes}
                        onChange={(e) => handleChange('notes', e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border border-gray-200 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 5: Review & Submit */}
              {currentStep === 5 && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                  <div className="border-b border-gray-100 pb-4">
                    <h3 className="text-xl font-bold text-gray-900">Step 5: Review & Final Confirmation</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Please review your application summary carefully before submitting.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Summary Card 1 */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-gray-200">
                      <h4 className="text-xs font-black uppercase tracking-wider text-indigo-700 mb-3 flex items-center gap-1.5">
                        <User size={15} /> Student & Academic Details
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Student Name:</span>
                          <span className="font-bold text-gray-900">
                            {formData.firstName} {formData.lastName}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Gender / DOB:</span>
                          <span className="font-bold text-gray-900">
                            {formData.gender} • {formData.dob}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Target Class:</span>
                          <span className="font-bold text-indigo-600">Class {selectedClassName}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Campus:</span>
                          <span className="font-bold text-gray-900">{selectedCampusName}</span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Aadhaar No:</span>
                          <span className="font-mono text-gray-900">{formData.aadhaarNo || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Summary Card 2 */}
                    <div className="bg-slate-50 rounded-2xl p-5 border border-gray-200">
                      <h4 className="text-xs font-black uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
                        <Users size={15} /> Parent & Contact Details
                      </h4>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Parent / Guardian:</span>
                          <span className="font-bold text-gray-900">
                            {formData.parentName} ({formData.parentRelation})
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Mobile Number:</span>
                          <span className="font-bold font-mono text-gray-900">+91 {formData.parentPhone}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Email:</span>
                          <span className="text-gray-900">{formData.parentEmail || 'Not provided'}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-200">
                          <span className="text-gray-500">Location:</span>
                          <span className="text-gray-900">
                            {formData.city}, {formData.state}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-gray-500">Occupation:</span>
                          <span className="text-gray-900">{formData.parentOccupation || 'Not provided'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                    <AlertCircle size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-800 leading-relaxed">
                      By submitting this form, you verify that the information provided is accurate and authentic. You
                      will receive an official Application Token upon submission.
                    </p>
                  </div>
                </div>
              )}

              {/* Form Navigation Controls */}
              <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between gap-3">
                <div>
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={handlePrev}
                      className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-all"
                    >
                      <ArrowLeft size={16} />
                      <span>Back</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleClearDraft}
                    title="Clear saved draft"
                    className="p-2.5 rounded-2xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
                  >
                    <Trash2 size={16} />
                  </button>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={handleNext}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-indigo-100 transition-all transform active:scale-95"
                    >
                      <span>Continue to {steps[currentStep].title}</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-sm font-black rounded-2xl shadow-lg shadow-emerald-100 transition-all transform active:scale-95 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Generating Token...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={18} />
                          <span>Submit & Generate Token</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
