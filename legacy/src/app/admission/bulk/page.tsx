'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import * as XLSX from 'xlsx';
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  X,
  FileText,
  User,
  Users,
  Search,
  Filter,
  GraduationCap,
  Calendar,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Shield,
  CreditCard,
  Award,
  Check,
  RotateCcw,
  Eye,
  Building,
  Printer,
  ChevronRight,
  TrendingUp,
  BarChart3,
  BookOpen,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import toast from 'react-hot-toast';

export interface ParsedStudentRow {
  index: number;
  selected: boolean;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  bloodGroup: string;
  category: string;
  className: string;
  sectionName: string;
  session: string;
  fatherName: string;
  fatherPhone: string;
  motherName: string;
  address: string;
  isValid: boolean;
  validationError?: string;
}

export interface AdmittedStudent {
  id: string;
  admissionNo: string;
  rollNo?: string;
  firstName: string;
  lastName: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string;
  bloodGroup?: string;
  category?: string;
  admissionDate: string;
  session: string;
  className: string;
  sectionName: string;
  fatherName?: string;
  fatherPhone?: string;
  motherName?: string;
  address?: string;
  isActive: boolean;
  academicScore?: number;
  attendanceRate?: number;
  feeStatus?: 'PAID' | 'PARTIAL' | 'PENDING';
  remarks?: string;
  createdAt: string;
}

const SAMPLE_DEMO_ROWS = [
  {
    firstName: 'Aarav',
    lastName: 'Sharma',
    gender: 'MALE',
    dob: '2011-05-14',
    bloodGroup: 'O+',
    category: 'General',
    fatherName: 'Mr. Ramesh Sharma',
    fatherPhone: '+91 98765 00001',
    motherName: 'Mrs. Suman Sharma',
    address: 'B-14, Civil Lines, Near Green Park',
  },
  {
    firstName: 'Diya',
    lastName: 'Verma',
    gender: 'FEMALE',
    dob: '2011-08-22',
    bloodGroup: 'B+',
    category: 'OBC',
    fatherName: 'Mr. Sanjay Verma',
    fatherPhone: '+91 98765 00002',
    motherName: 'Mrs. Meena Verma',
    address: 'Plot 45, Indira Nagar Sector 3',
  },
  {
    firstName: 'Kabir',
    lastName: 'Gupta',
    gender: 'MALE',
    dob: '2011-03-10',
    bloodGroup: 'A+',
    category: 'General',
    fatherName: 'Mr. Anil Gupta',
    fatherPhone: '+91 98765 00003',
    motherName: 'Mrs. Rekha Gupta',
    address: 'Flat 302, Royal Residency, Gomti Nagar',
  },
  {
    firstName: 'Ananya',
    lastName: 'Patel',
    gender: 'FEMALE',
    dob: '2011-11-18',
    bloodGroup: 'AB+',
    category: 'General',
    fatherName: 'Mr. Suresh Patel',
    fatherPhone: '+91 98765 00004',
    motherName: 'Mrs. Geeta Patel',
    address: 'House 88, Cantt Road',
  },
  {
    firstName: 'Ishan',
    lastName: 'Malhotra',
    gender: 'MALE',
    dob: '2011-07-09',
    bloodGroup: 'O+',
    category: 'General',
    fatherName: 'Mr. Rajesh Malhotra',
    fatherPhone: '+91 98765 00006',
    motherName: 'Mrs. Pooja Malhotra',
    address: '56-A, Model Town',
  },
];

export default function BulkAdmissionPage() {
  // Target class/section defaults
  const [targetClass, setTargetClass] = useState('Class 10');
  const [targetSection, setTargetSection] = useState('Section A');
  const [targetSession, setTargetSession] = useState('2025-26');
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().split('T')[0]);

  // Upload & Review state
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedStudentRow[]>([]);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Admitted directory state
  const [admittedStudents, setAdmittedStudents] = useState<AdmittedStudent[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(false);

  // Filters for admitted list
  const [directorySearch, setDirectorySearch] = useState('');
  const [directoryClassFilter, setDirectoryClassFilter] = useState('ALL');
  const [directorySectionFilter, setDirectorySectionFilter] = useState('ALL');
  const [directorySessionFilter, setDirectorySessionFilter] = useState('ALL');

  // Student 360 View Drawer / Modal state
  const [selected360Student, setSelected360Student] = useState<AdmittedStudent | null>(null);
  const [active360Tab, setActive360Tab] = useState<'ACADEMIC' | 'ATTENDANCE' | 'PERSONAL' | 'FEES' | 'PASTORAL'>('ACADEMIC');
  const [is360FullScreen, setIs360FullScreen] = useState(false);

  // Fetch bulk admitted students directory
  const fetchAdmittedStudents = async () => {
    try {
      setLoadingDirectory(true);
      const res = await fetch('/api/students/bulk');
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setAdmittedStudents(data.data);
      }
    } catch (err) {
      console.error('Failed to load admitted students:', err);
    } finally {
      setLoadingDirectory(false);
    }
  };

  useEffect(() => {
    fetchAdmittedStudents();
  }, []);

  // Handle Excel / CSV File Parsing with XLSX
  const handleFileUpload = (file: File) => {
    setIsProcessingFile(true);
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rawJson: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawJson.length === 0) {
          toast.error('Uploaded sheet appears to be empty.');
          setIsProcessingFile(false);
          return;
        }

        const formattedRows: ParsedStudentRow[] = rawJson.map((row, idx) => {
          // Normalize names
          const rawName = row['Student Name'] || row['Name'] || row['Full Name'] || '';
          let fName = (row['First Name'] || row['FirstName'] || '').trim();
          let lName = (row['Last Name'] || row['LastName'] || '').trim();

          if (!fName && rawName) {
            const parts = rawName.trim().split(' ');
            fName = parts[0];
            lName = parts.slice(1).join(' ');
          }
          if (!fName) fName = `Student-${idx + 1}`;
          if (!lName) lName = 'Candidate';

          // Gender
          const gRaw = (row['Gender'] || row['Sex'] || 'MALE').toString().toUpperCase().trim();
          const gender = gRaw.startsWith('F') ? 'FEMALE' : gRaw.startsWith('O') ? 'OTHER' : 'MALE';

          // DOB
          let dob = '2011-06-15';
          if (row['DOB'] || row['Date of Birth']) {
            const parsedDob = new Date(row['DOB'] || row['Date of Birth']);
            if (!isNaN(parsedDob.getTime())) {
              dob = parsedDob.toISOString().split('T')[0];
            }
          }

          const fPhone = row['Father Phone'] || row['Phone Number'] || row['Phone'] || row['Mobile'] || '+91 98765 00000';
          const fNameParent = row['Father Name'] || row['Father'] || row['Guardian Name'] || 'Parent';

          return {
            index: idx + 1,
            selected: true,
            firstName: fName,
            lastName: lName,
            gender: gender as any,
            dob,
            bloodGroup: row['Blood Group'] || 'O+',
            category: row['Category'] || 'General',
            className: row['Class'] || targetClass,
            sectionName: row['Section'] || targetSection,
            session: row['Session'] || targetSession,
            fatherName: fNameParent,
            fatherPhone: fPhone,
            motherName: row['Mother Name'] || row['Mother'] || 'Mother',
            address: row['Address'] || 'Civil Lines, School District',
            isValid: true,
          };
        });

        setParsedRows(formattedRows);
        toast.success(`Parsed ${formattedRows.length} student records from ${file.name}. Review and confirm enrollment below!`);
      } catch (err: any) {
        toast.error('Failed to parse file: ' + (err.message || 'Invalid format'));
      } finally {
        setIsProcessingFile(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  // Quick Demo Sample loader for testing
  const handleLoadDemoSample = () => {
    const demo: ParsedStudentRow[] = SAMPLE_DEMO_ROWS.map((s, idx) => ({
      index: idx + 1,
      selected: true,
      firstName: s.firstName,
      lastName: s.lastName,
      gender: s.gender as any,
      dob: s.dob,
      bloodGroup: s.bloodGroup,
      category: s.category,
      className: targetClass,
      sectionName: targetSection,
      session: targetSession,
      fatherName: s.fatherName,
      fatherPhone: s.fatherPhone,
      motherName: s.motherName,
      address: s.address,
      isValid: true,
    }));
    setParsedRows(demo);
    setUploadedFileName('sample_class10_admissions.xlsx (Demo Roster)');
    toast.success('Loaded 5 sample students for instant verification!');
  };

  // Toggle selection for individual row
  const toggleRowSelection = (index: number) => {
    setParsedRows((prev) =>
      prev.map((r) => (r.index === index ? { ...r, selected: !r.selected } : r))
    );
  };

  // Select / Deselect all
  const toggleSelectAll = (select: boolean) => {
    setParsedRows((prev) => prev.map((r) => ({ ...r, selected: select })));
  };

  // Confirm and Execute Bulk Enrollment
  const handleProceedAdmission = async () => {
    const selectedRows = parsedRows.filter((r) => r.selected);
    if (selectedRows.length === 0) {
      toast.error('Please select at least one student row to admit.');
      return;
    }

    try {
      setIsEnrolling(true);
      const res = await fetch('/api/students/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: selectedRows,
          targetClass,
          targetSection,
          targetSession,
          admissionDate,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          `🎉 Enrolled ${data.count} students! Unique Admission Numbers generated successfully.`,
          { duration: 5000 }
        );
        setParsedRows([]);
        setUploadedFileName(null);
        fetchAdmittedStudents();
      } else {
        toast.error(data.error || 'Failed to complete bulk enrollment');
      }
    } catch {
      toast.error('Network error during bulk admission.');
    } finally {
      setIsEnrolling(false);
    }
  };

  // Download Sample Template
  const downloadSampleTemplate = () => {
    const headers = [
      'First Name',
      'Last Name',
      'Gender',
      'DOB',
      'Blood Group',
      'Category',
      'Father Name',
      'Father Phone',
      'Mother Name',
      'Address',
    ];
    const rows = [
      ['Aarav', 'Sharma', 'MALE', '2011-05-14', 'O+', 'General', 'Mr. Ramesh Sharma', '+91 98765 00001', 'Mrs. Suman Sharma', 'Civil Lines, Lucknow'],
      ['Diya', 'Verma', 'FEMALE', '2011-08-22', 'B+', 'OBC', 'Mr. Sanjay Verma', '+91 98765 00002', 'Mrs. Meena Verma', 'Indira Nagar, Sector 3'],
      ['Kabir', 'Gupta', 'MALE', '2011-03-10', 'A+', 'General', 'Mr. Anil Gupta', '+91 98765 00003', 'Mrs. Rekha Gupta', 'Gomti Nagar, Lucknow'],
      ['Ananya', 'Patel', 'FEMALE', '2011-11-18', 'AB+', 'General', 'Mr. Suresh Patel', '+91 98765 00004', 'Mrs. Geeta Patel', 'Cantt Road, Lucknow'],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students_Roster');
    XLSX.writeFile(workbook, 'vidyalaya_student_bulk_admission_template.xlsx');
    toast.success('Sample Excel template downloaded!');
  };

  // Filtered Admitted Students for Table
  const filteredAdmittedStudents = useMemo(() => {
    return admittedStudents.filter((s) => {
      if (directoryClassFilter !== 'ALL' && !s.className.toLowerCase().includes(directoryClassFilter.toLowerCase())) {
        return false;
      }
      if (directorySectionFilter !== 'ALL' && !s.sectionName.toLowerCase().includes(directorySectionFilter.toLowerCase())) {
        return false;
      }
      if (directorySessionFilter !== 'ALL' && s.session !== directorySessionFilter) {
        return false;
      }
      if (directorySearch.trim()) {
        const q = directorySearch.toLowerCase();
        const matches =
          s.firstName.toLowerCase().includes(q) ||
          s.lastName.toLowerCase().includes(q) ||
          s.admissionNo.toLowerCase().includes(q) ||
          (s.fatherName && s.fatherName.toLowerCase().includes(q)) ||
          (s.fatherPhone && s.fatherPhone.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [admittedStudents, directoryClassFilter, directorySectionFilter, directorySessionFilter, directorySearch]);

  // Selected student mock academic performance data for 360 chart
  const academicChartData = [
    { subject: 'Mathematics', score: 94, classAvg: 78, max: 100 },
    { subject: 'Physics & Science', score: 91, classAvg: 74, max: 100 },
    { subject: 'English & Lit', score: 88, classAvg: 80, max: 100 },
    { subject: 'Social Studies', score: 86, classAvg: 72, max: 100 },
    { subject: 'Hindi', score: 92, classAvg: 82, max: 100 },
    { subject: 'Computer Science', score: 98, classAvg: 84, max: 100 },
  ];

  const attendanceTrendData = [
    { month: 'Apr', attendance: 96 },
    { month: 'May', attendance: 94 },
    { month: 'Jul', attendance: 98 },
    { month: 'Aug', attendance: 92 },
    { month: 'Sep', attendance: 95 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* ========================================================================= */}
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admission"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-400 hover:underline mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Admission Hub</span>
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-600/20">
                <Upload size={18} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Bulk Student Admission
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Upload Excel (.xlsx/.xls) or CSV rosters, preview and validate candidate records, and assign unique admission numbers automatically.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLoadDemoSample}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-2xl border border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors"
            >
              <Sparkles size={14} className="text-amber-500" />
              <span>Load 5 Demo Candidates</span>
            </button>

            <button
              onClick={downloadSampleTemplate}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 hover:bg-purple-100 font-bold text-xs rounded-2xl border border-purple-200 dark:border-purple-800 transition-colors"
            >
              <Download size={14} />
              <span>Download Excel Template</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. ENROLLMENT CONFIGURATION & DROPZONE                                    */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm space-y-6">
          <div className="border-b dark:border-gray-700 pb-4">
            <h2 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-black">1</span>
              <span>Enrollment Batch Configuration</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Specify the default grade, section, session, and admission date for this roster import batch
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Target Grade Class
              </label>
              <select
                value={targetClass}
                onChange={(e) => setTargetClass(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              >
                {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Target Section
              </label>
              <select
                value={targetSection}
                onChange={(e) => setTargetSection(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              >
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Academic Session
              </label>
              <select
                value={targetSession}
                onChange={(e) => setTargetSession(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              >
                <option value="2024-25">Session 2024-25</option>
                <option value="2025-26">Session 2025-26</option>
                <option value="2026-27">Session 2026-27</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Admission Date
              </label>
              <input
                type="date"
                value={admissionDate}
                onChange={(e) => setAdmissionDate(e.target.value)}
                className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
              />
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div className="border-2 border-dashed border-purple-200 dark:border-purple-800 hover:border-purple-400 bg-purple-50/40 dark:bg-purple-950/10 rounded-3xl p-8 text-center transition-colors relative">
            <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center mx-auto mb-3 shadow-inner">
              <FileSpreadsheet size={28} />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">
              {uploadedFileName ? `Loaded: ${uploadedFileName}` : 'Choose or Drag Excel File (.xlsx, .xls, .csv)'}
            </h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              Supports multi-column spreadsheets with student personal details, father & mother contacts, blood group, and category.
            </p>

            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              disabled={isProcessingFile}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="mt-4 text-xs font-semibold text-purple-700 cursor-pointer file:mr-3 file:py-2.5 file:px-5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-600 file:text-white hover:file:bg-purple-700 shadow-sm"
            />

            {isProcessingFile && (
              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-purple-700">
                <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <span>Reading spreadsheet columns...</span>
              </div>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REVIEW & VERIFICATION PREVIEW TABLE                                    */}
        {/* ========================================================================= */}
        {parsedRows.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-7 border border-purple-200 dark:border-purple-800 shadow-lg space-y-5 animate-in fade-in-50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-gray-700 pb-4">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black">2</span>
                  <span>Review Candidate Roster Before Enrollment</span>
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Inspect candidate records. Deselect any rows you do not wish to admit right now.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300">
                  <button
                    onClick={() => toggleSelectAll(true)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleSelectAll(false)}
                    className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200"
                  >
                    Deselect All
                  </button>
                </div>

                <button
                  onClick={handleProceedAdmission}
                  disabled={isEnrolling || parsedRows.filter((r) => r.selected).length === 0}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 size={16} />
                  <span>
                    {isEnrolling
                      ? 'Generating Admission Numbers...'
                      : `Proceed & Admit ${parsedRows.filter((r) => r.selected).length} Students`}
                  </span>
                </button>
              </div>
            </div>

            {/* Preview Table */}
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-500 border-b dark:border-gray-700">
                    <th className="py-3 px-3 w-10 text-center">Include</th>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Gender</th>
                    <th className="py-3 px-4">Date of Birth</th>
                    <th className="py-3 px-4">Grade & Section</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Father Name & Contact</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
                  {parsedRows.map((r) => (
                    <tr
                      key={r.index}
                      className={`hover:bg-purple-50/30 dark:hover:bg-purple-950/20 transition-colors ${
                        !r.selected ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/50' : ''
                      }`}
                    >
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          onChange={() => toggleRowSelection(r.index)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {r.firstName} {r.lastName}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            r.gender === 'FEMALE' ? 'bg-pink-50 text-pink-700' : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {r.gender}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-gray-600 dark:text-gray-300">{r.dob}</td>
                      <td className="py-3 px-4 font-bold text-purple-700 dark:text-purple-300">
                        {r.className} - {r.sectionName}
                      </td>
                      <td className="py-3 px-4 font-mono">{r.session}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold">{r.fatherName}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{r.fatherPhone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check size={11} /> Ready
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <span>Total Parsed: {parsedRows.length} candidates</span>
              <button
                onClick={() => {
                  setParsedRows([]);
                  setUploadedFileName(null);
                }}
                className="text-gray-500 hover:text-red-600 font-semibold"
              >
                Clear / Cancel Import
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. ADMITTED STUDENTS DIRECTORY (Shown directly below bulk upload)        */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-7 border border-gray-100 dark:border-gray-700 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b dark:border-gray-700 pb-4">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black">3</span>
                <span>Admitted Students Directory (Portal Records)</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Students admitted via bulk upload or regular enrollment. Click on any row to open the complete Student 360° Academic &amp; Pastoral View.
              </p>
            </div>

            <span className="text-xs font-bold text-gray-500 bg-gray-50 dark:bg-gray-700 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-600">
              Total Enrolled: {admittedStudents.length} Students
            </span>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search student, admission no, parent..."
                value={directorySearch}
                onChange={(e) => setDirectorySearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
              />
            </div>

            <div>
              <select
                value={directoryClassFilter}
                onChange={(e) => setDirectoryClassFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
              >
                <option value="ALL">All Classes</option>
                {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <select
                value={directorySectionFilter}
                onChange={(e) => setDirectorySectionFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
              >
                <option value="ALL">All Sections</option>
                <option value="Section A">Section A</option>
                <option value="Section B">Section B</option>
                <option value="Section C">Section C</option>
              </select>
            </div>

            <div>
              <select
                value={directorySessionFilter}
                onChange={(e) => setDirectorySessionFilter(e.target.value)}
                className="w-full py-2 px-3 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
              >
                <option value="ALL">All Sessions</option>
                <option value="2024-25">Session 2024-25</option>
                <option value="2025-26">Session 2025-26</option>
                <option value="2026-27">Session 2026-27</option>
              </select>
            </div>
          </div>

          {/* Admitted Students Table */}
          {loadingDirectory ? (
            <div className="p-16 text-center text-gray-400">Loading admitted student records...</div>
          ) : filteredAdmittedStudents.length === 0 ? (
            <div className="p-12 text-center bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <User size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm font-bold text-gray-700 dark:text-gray-300">No student records found</p>
              <p className="text-xs text-gray-400">Try adjusting your search criteria or upload candidates above.</p>
            </div>
          ) : (
            <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 text-[10px] uppercase font-bold text-gray-500 border-b dark:border-gray-700">
                    <th className="py-3 px-4">Admission No</th>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Class &amp; Section</th>
                    <th className="py-3 px-4">Session</th>
                    <th className="py-3 px-4">Adm Date</th>
                    <th className="py-3 px-4">Parent / Contact</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">360° View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-gray-700 dark:text-gray-200">
                  {filteredAdmittedStudents.map((st) => (
                    <tr
                      key={st.id}
                      onClick={() => setSelected360Student(st)}
                      className="hover:bg-purple-50/50 dark:hover:bg-purple-950/20 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-black text-xs text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-800">
                          {st.admissionNo}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-xs ${
                              st.gender === 'FEMALE' ? 'bg-pink-600' : 'bg-blue-600'
                            }`}
                          >
                            {st.firstName[0]}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 dark:text-white group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                              {st.firstName} {st.lastName}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              Roll: {st.rollNo || 'N/A'} • {st.gender}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-bold text-gray-800 dark:text-gray-200">
                        {st.className} - {st.sectionName}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-600 dark:text-gray-400">
                        {st.session}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-gray-500">
                        {st.admissionDate}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{st.fatherName || 'Parent'}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{st.fatherPhone}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Active Enrolled
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected360Student(st);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-[11px] rounded-xl shadow-sm hover:from-purple-700 hover:to-indigo-700 transition"
                        >
                          <Eye size={13} />
                          <span>360° View</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 5. STUDENT 360° DOSSIER MODAL WITH CHARTS, DIAGRAMS & PERFORMANCE       */}
        {/* ========================================================================= */}
        {selected360Student && (
          <div
            className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-300 ${
              is360FullScreen ? 'p-0 m-0 overflow-hidden' : 'p-3 sm:p-5 overflow-y-auto'
            }`}
          >
            <div
              className={`bg-white dark:bg-gray-800 overflow-hidden flex flex-col transition-all duration-300 ${
                is360FullScreen
                  ? 'w-full h-full max-w-none max-h-none rounded-none border-none shadow-none'
                  : 'rounded-3xl max-w-4xl w-full shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[92vh] my-4'
              }`}
            >
              {/* Modal Top Header */}
              <div className="p-6 bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white relative flex-shrink-0">
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIs360FullScreen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm transition-all shadow-sm border border-white/10 active:scale-95"
                    title={is360FullScreen ? 'Exit Full Screen' : 'Full Screen View'}
                  >
                    {is360FullScreen ? (
                      <>
                        <Minimize2 size={14} className="text-amber-300" />
                        <span className="hidden sm:inline">Exit Fullscreen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 size={14} className="text-amber-300" />
                        <span className="hidden sm:inline">Full Screen</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelected360Student(null);
                      setIs360FullScreen(false);
                    }}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
                    title="Close"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-16 h-16 rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-lg ${
                        selected360Student.gender === 'FEMALE'
                          ? 'bg-gradient-to-tr from-pink-500 to-rose-600'
                          : 'bg-gradient-to-tr from-blue-500 to-indigo-600'
                      }`}
                    >
                      {selected360Student.firstName[0]}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-[10px] font-bold text-purple-200 mb-1">
                        <Sparkles size={12} className="text-amber-400" />
                        <span>Student 360° Comprehensive Profile</span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                        {selected360Student.firstName} {selected360Student.lastName}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-purple-200">
                        <span className="font-mono font-bold bg-white/20 px-2 py-0.5 rounded-md">
                          {selected360Student.admissionNo}
                        </span>
                        <span>•</span>
                        <span>
                          {selected360Student.className} - {selected360Student.sectionName}
                        </span>
                        <span>•</span>
                        <span>Session {selected360Student.session}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      Active Enrolled
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700 flex-shrink-0">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Academic Average</p>
                  <p className="text-lg font-black text-purple-600 mt-0.5">
                    {selected360Student.academicScore || 92.5}%
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600">Grade A1 (Top 5%)</span>
                </div>

                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Attendance Rate</p>
                  <p className="text-lg font-black text-blue-600 mt-0.5">
                    {selected360Student.attendanceRate || 96}%
                  </p>
                  <span className="text-[10px] font-bold text-gray-400">182 / 190 Days</span>
                </div>

                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Fee Status</p>
                  <p className="text-lg font-black text-emerald-600 mt-0.5">
                    {selected360Student.feeStatus === 'PAID' ? '₹36,000' : '₹18,000'}
                  </p>
                  <span className="text-[10px] font-bold text-emerald-600">
                    {selected360Student.feeStatus === 'PAID' ? 'Paid in Full' : 'Partial Paid'}
                  </span>
                </div>

                <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-500 uppercase">Pastoral Conduct</p>
                  <p className="text-lg font-black text-amber-600 mt-0.5">Exemplary</p>
                  <span className="text-[10px] font-bold text-amber-600">3 Merit Badges</span>
                </div>
              </div>

              {/* 360 Tabs Navigation */}
              <div className="flex items-center gap-2 px-6 pt-3 border-b dark:border-gray-700 overflow-x-auto flex-shrink-0">
                {[
                  { id: 'ACADEMIC', label: 'Academic & Diagrams', icon: BarChart3 },
                  { id: 'ATTENDANCE', label: 'Attendance Trend', icon: TrendingUp },
                  { id: 'PERSONAL', label: 'Personal & Family Dossier', icon: User },
                  { id: 'FEES', label: 'Fee Ledger', icon: CreditCard },
                  { id: 'PASTORAL', label: 'Pastoral & Badges', icon: Award },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = active360Tab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActive360Tab(tab.id as any)}
                      className={`pb-3 px-3 text-xs font-bold transition flex items-center gap-1.5 whitespace-nowrap border-b-2 ${
                        isActive
                          ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                          : 'border-transparent text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Tab Content Area (Scrollable) */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* TAB 1: ACADEMIC PERFORMANCE & DIAGRAMS */}
                {active360Tab === 'ACADEMIC' && (
                  <div className="space-y-6">
                    {/* Recharts Subject Mastery Diagram */}
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h4 className="text-sm font-black text-gray-900 dark:text-white">
                            Subject Mastery & Benchmark Diagram
                          </h4>
                          <p className="text-xs text-gray-500">Student score vs Class average across core subjects</p>
                        </div>
                        <span className="text-[11px] font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
                          Term Assessment 2025-26
                        </span>
                      </div>

                      <div className={`w-full ${is360FullScreen ? 'h-80 lg:h-96' : 'h-64'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={academicChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="subject" tick={{ fontSize: 11 }} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Bar dataKey="score" fill="#7c3aed" radius={[6, 6, 0, 0]} name="Student Score" />
                            <Bar dataKey="classAvg" fill="#cbd5e1" radius={[6, 6, 0, 0]} name="Class Average" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Examination Records Table */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Recent Exam Breakdown
                      </h4>
                      <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900 text-[10px] font-bold text-gray-500 uppercase">
                              <th className="py-2.5 px-4">Examination</th>
                              <th className="py-2.5 px-4">Marks Obtained</th>
                              <th className="py-2.5 px-4">Max Marks</th>
                              <th className="py-2.5 px-4">Percentage</th>
                              <th className="py-2.5 px-4">Grade</th>
                              <th className="py-2.5 px-4">Remarks</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {[
                              { exam: 'Unit Test 1', marks: 92, max: 100, pct: '92%', grade: 'A1', remarks: 'Exceptional math speed' },
                              { exam: 'Half Yearly Examination', marks: 88, max: 100, pct: '88%', grade: 'A1', remarks: 'Excellent physics numericals' },
                              { exam: 'Unit Test 2', marks: 93, max: 100, pct: '93%', grade: 'A1', remarks: 'Consistent performance' },
                              { exam: 'Pre-Board Practice Exam', marks: 91, max: 100, pct: '91%', grade: 'A1', remarks: 'CBSE board ready' },
                            ].map((row, i) => (
                              <tr key={i}>
                                <td className="py-2.5 px-4 font-bold text-gray-900 dark:text-white">{row.exam}</td>
                                <td className="py-2.5 px-4 font-bold text-purple-700">{row.marks}</td>
                                <td className="py-2.5 px-4 text-gray-500">{row.max}</td>
                                <td className="py-2.5 px-4 font-mono font-bold">{row.pct}</td>
                                <td className="py-2.5 px-4 font-bold text-emerald-600">{row.grade}</td>
                                <td className="py-2.5 px-4 text-gray-500">{row.remarks}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: ATTENDANCE TREND */}
                {active360Tab === 'ATTENDANCE' && (
                  <div className="space-y-6">
                    <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-3xl border border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-black text-gray-900 dark:text-white mb-1">
                        Monthly Attendance Trend Chart
                      </h4>
                      <p className="text-xs text-gray-500 mb-4">Five-month attendance percentage continuity</p>

                      <div className={`w-full ${is360FullScreen ? 'h-72 lg:h-80' : 'h-56'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="attdGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                            <YAxis domain={[80, 100]} tick={{ fontSize: 11 }} />
                            <Tooltip />
                            <Area type="monotone" dataKey="attendance" stroke="#2563eb" strokeWidth={3} fill="url(#attdGrad)" name="Attendance %" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-900 text-xs">
                        <p className="font-bold">Total Present Days</p>
                        <p className="text-xl font-black mt-1">182 Days</p>
                      </div>
                      <div className="p-3 bg-amber-50 rounded-2xl text-amber-900 text-xs">
                        <p className="font-bold">Excused Leave</p>
                        <p className="text-xl font-black mt-1">5 Days</p>
                      </div>
                      <div className="p-3 bg-rose-50 rounded-2xl text-rose-900 text-xs">
                        <p className="font-bold">Unexcused Absent</p>
                        <p className="text-xl font-black mt-1">3 Days</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: PERSONAL & FAMILY DOSSIER */}
                {active360Tab === 'PERSONAL' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2.5">
                      <h4 className="font-bold text-gray-500 uppercase text-[10px]">Personal Demographics</h4>
                      <div className="flex justify-between"><span className="text-gray-500">Date of Birth:</span> <span className="font-bold">{selected360Student.dob}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Gender:</span> <span className="font-bold">{selected360Student.gender}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Blood Group:</span> <span className="font-bold">{selected360Student.bloodGroup || 'O+'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Category:</span> <span className="font-bold">{selected360Student.category || 'General'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Nationality:</span> <span className="font-bold">Indian</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Admission Date:</span> <span className="font-bold">{selected360Student.admissionDate}</span></div>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-2.5">
                      <h4 className="font-bold text-gray-500 uppercase text-[10px]">Family &amp; Guardian</h4>
                      <div className="flex justify-between"><span className="text-gray-500">Father Name:</span> <span className="font-bold">{selected360Student.fatherName || 'Not recorded'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Father Phone:</span> <span className="font-bold font-mono text-purple-600">{selected360Student.fatherPhone || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Mother Name:</span> <span className="font-bold">{selected360Student.motherName || 'Not recorded'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Residential Address:</span> <span className="font-semibold text-right max-w-[200px]">{selected360Student.address || 'Civil Lines, Lucknow'}</span></div>
                    </div>
                  </div>
                )}

                {/* TAB 4: FEE LEDGER */}
                {active360Tab === 'FEES' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-emerald-900">Annual Tuition &amp; Composite Fee Cleared</p>
                        <p className="text-[11px] text-emerald-700">Receipt No: REC2604812 • Verified by Accounts Office</p>
                      </div>
                      <span className="text-base font-black text-emerald-800">₹36,000 Paid</span>
                    </div>

                    <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900 text-[10px] text-gray-500 uppercase font-bold">
                          <tr>
                            <th className="py-2 px-3">Component</th>
                            <th className="py-2 px-3">Term</th>
                            <th className="py-2 px-3">Amount</th>
                            <th className="py-2 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          <tr><td className="py-2 px-3">Tuition Fee</td><td className="py-2 px-3">Quarter 1 &amp; 2</td><td className="py-2 px-3 font-bold">₹24,000</td><td className="py-2 px-3 text-emerald-600 font-bold">PAID</td></tr>
                          <tr><td className="py-2 px-3">Computer Lab &amp; Smart Class</td><td className="py-2 px-3">Annual</td><td className="py-2 px-3 font-bold">₹6,000</td><td className="py-2 px-3 text-emerald-600 font-bold">PAID</td></tr>
                          <tr><td className="py-2 px-3">Examination &amp; Assessment</td><td className="py-2 px-3">Annual</td><td className="py-2 px-3 font-bold">₹6,000</td><td className="py-2 px-3 text-emerald-600 font-bold">PAID</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 5: PASTORAL & BADGES */}
                {active360Tab === 'PASTORAL' && (
                  <div className="space-y-4 text-xs">
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl border border-purple-200 dark:border-purple-800">
                      <h4 className="font-black text-purple-900 dark:text-purple-200 text-sm">
                        Class Mentor &amp; Faculty Remarks
                      </h4>
                      <p className="text-purple-950 dark:text-purple-300 mt-1 leading-relaxed">
                        &quot;{selected360Student.remarks || 'Demonstrates exceptional intellectual curiosity and leadership. Active contributor during interactive classroom physics practicals.'}&quot;
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Digital Merit Badges &amp; Clubs
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 flex items-center gap-2.5">
                          <Award size={20} className="text-amber-600" />
                          <div>
                            <p className="font-bold text-amber-900">Science Olympiad</p>
                            <p className="text-[10px] text-amber-700">Gold Ranker</p>
                          </div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 flex items-center gap-2.5">
                          <Sparkles size={20} className="text-blue-600" />
                          <div>
                            <p className="font-bold text-blue-900">Robotics Club</p>
                            <p className="text-[10px] text-blue-700">Active Member</p>
                          </div>
                        </div>
                        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2.5">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                          <div>
                            <p className="font-bold text-emerald-900">100% Attendance</p>
                            <p className="text-[10px] text-emerald-700">Term 1 Star</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.print();
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 border border-gray-200 dark:border-gray-700 text-xs font-bold rounded-xl transition-colors shadow-xs"
                  >
                    <Printer size={14} />
                    <span>Print Dossier</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIs360FullScreen((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors shadow-xs active:scale-95"
                    title={is360FullScreen ? 'Exit Full Screen' : 'View in Full Screen'}
                  >
                    {is360FullScreen ? (
                      <>
                        <Minimize2 size={14} className="text-purple-600" />
                        <span>Exit Full Screen</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 size={14} className="text-purple-600" />
                        <span>Full Screen</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href={`/students/${selected360Student.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow transition"
                  >
                    <span>Open Full Profile Page</span>
                    <ChevronRight size={14} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setSelected360Student(null);
                      setIs360FullScreen(false);
                    }}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-xl"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
