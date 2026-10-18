'use client';
import { useState } from 'react';
import {
  Award, FileText, Plus, Search, Filter, Printer, Download,
  CheckCircle2, AlertCircle, Calendar, User, BookOpen, X, Star
} from 'lucide-react';

interface CertificateRecord {
  id: string;
  serialNo: string;
  studentName: string;
  admissionNo: string;
  className: string;
  certificateType: 'BONAFIDE' | 'CHARACTER' | 'TRANSFER' | 'MERIT' | 'SPORTS';
  issueDate: string;
  purpose: string;
  status: 'ISSUED' | 'PENDING';
  conduct: string;
}

const initialCertificates: CertificateRecord[] = [
  { id: '1', serialNo: 'CERT-2026-042', studentName: 'Aarav Sharma', admissionNo: 'ADM2026001', className: 'Class 10-A', certificateType: 'BONAFIDE', issueDate: '2026-09-20', purpose: 'Passport Application', status: 'ISSUED', conduct: 'Exemplary' },
  { id: '2', serialNo: 'CERT-2026-043', studentName: 'Rohan Gupta', admissionNo: 'ADM2026014', className: 'Class 12-B', certificateType: 'CHARACTER', issueDate: '2026-09-18', purpose: 'College Admission & Counseling', status: 'ISSUED', conduct: 'Good' },
  { id: '3', serialNo: 'CERT-2026-044', studentName: 'Priya Verma', admissionNo: 'ADM2026008', className: 'Class 9-A', certificateType: 'TRANSFER', issueDate: '2026-09-15', purpose: 'Father Transferred to Pune', status: 'ISSUED', conduct: 'Satisfactory' },
  { id: '4', serialNo: 'CERT-2026-045', studentName: 'Simran Kaur', admissionNo: 'ADM2026022', className: 'Class 10-B', certificateType: 'MERIT', issueDate: '2026-09-12', purpose: 'Inter-School Science Olympiad 1st Rank', status: 'ISSUED', conduct: 'Outstanding' },
  { id: '5', serialNo: 'CERT-2026-046', studentName: 'Aditya Singh', admissionNo: 'ADM2026031', className: 'Class 8-A', certificateType: 'SPORTS', issueDate: '2026-09-10', purpose: 'District Athletics 400m Gold Medalist', status: 'ISSUED', conduct: 'Disciplined' },
];

export default function CertificationPage() {
  const [certificates, setCertificates] = useState<CertificateRecord[]>(initialCertificates);
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [previewCert, setPreviewCert] = useState<CertificateRecord | null>(null);

  // New Certificate Form
  const [formData, setFormData] = useState({
    studentName: '',
    admissionNo: '',
    className: 'Class 10-A',
    certificateType: 'BONAFIDE' as CertificateRecord['certificateType'],
    purpose: '',
    conduct: 'Exemplary',
    issueDate: new Date().toISOString().split('T')[0],
  });

  const filteredCertificates = certificates.filter(c => {
    if (typeFilter !== 'ALL' && c.certificateType !== typeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.studentName.toLowerCase().includes(q) ||
        c.admissionNo.toLowerCase().includes(q) ||
        c.serialNo.toLowerCase().includes(q) ||
        c.purpose.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.studentName || !formData.admissionNo) return;

    const newRecord: CertificateRecord = {
      id: String(Date.now()),
      serialNo: `CERT-${new Date().getFullYear()}-${String(Math.floor(100 + Math.random() * 900))}`,
      studentName: formData.studentName,
      admissionNo: formData.admissionNo,
      className: formData.className,
      certificateType: formData.certificateType,
      issueDate: formData.issueDate,
      purpose: formData.purpose || 'Official Documentation',
      status: 'ISSUED',
      conduct: formData.conduct,
    };

    setCertificates([newRecord, ...certificates]);
    setShowCreateModal(false);
    setPreviewCert(newRecord);
    setFormData({
      studentName: '',
      admissionNo: '',
      className: 'Class 10-A',
      certificateType: 'BONAFIDE',
      purpose: '',
      conduct: 'Exemplary',
      issueDate: new Date().toISOString().split('T')[0],
    });
  };

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Award size={16} />
              <span>Document Verification • प्रमाण पत्र प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Official Certificate Generator
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Issue and authenticate Bonafide, Character, Transfer (TC), Academic Merit, and Sports certificates with digital verification QR codes.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Issue New Certificate</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2.5 bg-white/10 hover:bg-white/20 text-white font-medium rounded-2xl text-xs backdrop-blur-sm border border-white/20 transition-all"
            >
              <Printer size={15} />
              <span className="hidden sm:inline">Print Register</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Certificates Issued</span>
          <p className="text-2xl font-black text-gray-900 mt-2">{certificates.length}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">Academic Year 2026-27</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bonafide & Character</span>
          <p className="text-2xl font-black text-blue-600 mt-2">
            {certificates.filter(c => c.certificateType === 'BONAFIDE' || c.certificateType === 'CHARACTER').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Visa, Bank & College purposes</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Transfer Certificates (TC)</span>
          <p className="text-2xl font-black text-amber-600 mt-2">
            {certificates.filter(c => c.certificateType === 'TRANSFER').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Verified with Counter-Sign</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Merit & Achievements</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">
            {certificates.filter(c => c.certificateType === 'MERIT' || c.certificateType === 'SPORTS').length}
          </p>
          <p className="text-xs text-gray-400 mt-1">Competitions & Olympiads</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          {['ALL', 'BONAFIDE', 'CHARACTER', 'TRANSFER', 'MERIT', 'SPORTS'].map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                typeFilter === type
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type === 'ALL' ? 'All Types' : type}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student, adm no, serial..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Certificates Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Serial No & Date</th>
                <th className="px-5 py-3.5">Student Particulars</th>
                <th className="px-5 py-3.5">Class / Section</th>
                <th className="px-5 py-3.5">Certificate Type</th>
                <th className="px-5 py-3.5">Purpose / Subject</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{cert.serialNo}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{cert.issueDate}</div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{cert.studentName}</div>
                    <div className="text-[11px] text-gray-400">{cert.admissionNo}</div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-800">{cert.className}</td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                      cert.certificateType === 'BONAFIDE' ? 'bg-blue-50 text-blue-700' :
                      cert.certificateType === 'CHARACTER' ? 'bg-purple-50 text-purple-700' :
                      cert.certificateType === 'TRANSFER' ? 'bg-amber-50 text-amber-700' :
                      'bg-emerald-50 text-emerald-700'
                    }`}>
                      {cert.certificateType}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="text-gray-900">{cert.purpose}</div>
                    <div className="text-[11px] text-gray-400">Conduct: {cert.conduct}</div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 size={11} /> {cert.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => setPreviewCert(cert)}
                      className="px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      <span>View & Print</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue Certificate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Issue Student Certificate</h3>
                  <p className="text-xs text-gray-400">Create an authenticated official credential</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Student Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={formData.studentName}
                    onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Admission Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADM2026001"
                    value={formData.admissionNo}
                    onChange={(e) => setFormData({ ...formData, admissionNo: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Class & Section *</label>
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="Class 10-A">Class 10-A</option>
                    <option value="Class 10-B">Class 10-B</option>
                    <option value="Class 9-A">Class 9-A</option>
                    <option value="Class 12-A">Class 12-A</option>
                    <option value="Class 12-B">Class 12-B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Certificate Type *</label>
                  <select
                    value={formData.certificateType}
                    onChange={(e) => setFormData({ ...formData, certificateType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="BONAFIDE">Bonafide Certificate</option>
                    <option value="CHARACTER">Character Certificate</option>
                    <option value="TRANSFER">School Leaving / Transfer (TC)</option>
                    <option value="MERIT">Academic Excellence Award</option>
                    <option value="SPORTS">Sports Achievement Certificate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Purpose / Justification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Passport application, Higher education or Olympiad"
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">General Conduct</label>
                  <select
                    value={formData.conduct}
                    onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="Exemplary">Exemplary</option>
                    <option value="Outstanding">Outstanding</option>
                    <option value="Good">Good</option>
                    <option value="Satisfactory">Satisfactory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date of Issue</label>
                  <input
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Generate & Authenticate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Certificate Modal */}
      {previewCert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border-8 border-double border-purple-900/30 relative">
            <button
              onClick={() => setPreviewCert(null)}
              className="absolute right-4 top-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
            >
              <X size={18} />
            </button>

            {/* Certificate Header */}
            <div className="text-center pb-4 border-b-2 border-purple-200">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-700 to-indigo-700 text-white flex items-center justify-center font-bold text-2xl shadow-md mb-2">
                V
              </div>
              <h1 className="text-2xl font-black text-purple-950 uppercase tracking-wider font-serif">
                VIDYALAYA SENIOR SECONDARY SCHOOL
              </h1>
              <p className="text-xs text-gray-600">Affiliated to CBSE, New Delhi • Affiliation No: 2130894</p>
              <p className="text-[11px] text-gray-400">Institutional Area, Sector 14, New Delhi - 110001</p>
              
              <div className="mt-4 inline-block px-6 py-1.5 bg-gradient-to-r from-purple-800 to-indigo-800 text-white font-serif font-black text-sm tracking-widest rounded-full uppercase shadow">
                {previewCert.certificateType === 'BONAFIDE' ? 'BONAFIDE CERTIFICATE' :
                 previewCert.certificateType === 'CHARACTER' ? 'CHARACTER & CONDUCT CERTIFICATE' :
                 previewCert.certificateType === 'TRANSFER' ? 'SCHOOL LEAVING / TRANSFER CERTIFICATE' :
                 'CERTIFICATE OF EXCELLENCE & MERIT'}
              </div>
            </div>

            {/* Certificate Serial & Date */}
            <div className="flex justify-between items-center text-xs text-gray-500 py-3 border-b border-gray-100 font-mono">
              <span>Ref No: <strong className="text-purple-900 font-bold">{previewCert.serialNo}</strong></span>
              <span>Issue Date: <strong className="text-gray-900">{previewCert.issueDate}</strong></span>
            </div>

            {/* Certificate Body Text */}
            <div className="py-6 text-sm text-gray-800 leading-relaxed font-serif text-justify space-y-4">
              <p>
                This is to certify that Master / Kumari{' '}
                <strong className="text-purple-950 text-base font-sans underline decoration-purple-400 font-bold">
                  {previewCert.studentName}
                </strong>
                , bearing Admission Number{' '}
                <strong className="text-purple-950 font-sans font-bold">{previewCert.admissionNo}</strong>, is / was a bona fide student of this institution studying in{' '}
                <strong className="text-purple-950 font-sans font-bold">{previewCert.className}</strong> during the academic session 2026–2027.
              </p>

              <p>
                To the best of our knowledge and school records, his / her general conduct and moral character have been{' '}
                <strong className="text-purple-950 font-sans font-bold uppercase">{previewCert.conduct}</strong>.
              </p>

              <p>
                This certificate is being granted upon request for the specific purpose of{' '}
                <span className="italic font-bold text-gray-900">"{previewCert.purpose}"</span>. We wish him / her all the very best in future endeavors.
              </p>
            </div>

            {/* Signatures & Seal */}
            <div className="pt-10 flex justify-between items-end text-xs text-gray-700">
              <div className="text-center">
                <div className="w-24 h-1 bg-gray-300 mx-auto mb-1"></div>
                <p className="font-bold">Class Teacher</p>
                <p className="text-[10px] text-gray-400">Verified By</p>
              </div>

              <div className="text-center">
                <div className="w-16 h-16 rounded-full border-2 border-dashed border-purple-300 mx-auto flex items-center justify-center text-[10px] text-purple-400 font-bold uppercase rotate-12">
                  Official Seal
                </div>
              </div>

              <div className="text-center">
                <div className="w-28 h-1 bg-purple-600 mx-auto mb-1"></div>
                <p className="font-bold text-purple-950">Principal</p>
                <p className="text-[10px] text-gray-400">Vidyalaya Public School</p>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => window.print()}
                className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all"
              >
                <Printer size={16} /> Print Official Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
