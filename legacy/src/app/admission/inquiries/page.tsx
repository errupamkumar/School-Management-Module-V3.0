'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  HelpCircle,
  Plus,
  Search,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowLeft,
  X,
  Send,
  MessageSquare
} from 'lucide-react';

interface InquiryItem {
  id: string;
  parentName: string;
  childName: string;
  targetClass: string;
  phone: string;
  email?: string;
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  dob?: string;
  category?: string;
  address?: string;
  inquiryDate: string;
  stage: 'NEW' | 'CONTACTED' | 'CAMPUS_TOUR' | 'REGISTERED' | 'DROPPED';
  notes: string;
}

const initialInquiries: InquiryItem[] = [
  { id: 'inq-1', parentName: 'Deepak Saxena', childName: 'Aanya Saxena', targetClass: 'Class 1', phone: '9876599901', email: 'deepak.saxena@gmail.com', gender: 'FEMALE', dob: '2020-04-12', inquiryDate: '2026-09-22', stage: 'NEW', notes: 'Walk-in inquiry. Interested in CBSE curriculum & transport.' },
  { id: 'inq-2', parentName: 'Sunil Bajpai', childName: 'Kunal Bajpai', targetClass: 'Class 9', phone: '9876599902', inquiryDate: '2026-09-21', stage: 'CAMPUS_TOUR', notes: 'Scheduled campus tour for Saturday 11 AM.' },
  { id: 'inq-3', parentName: 'Meena Srivastava', childName: 'Aryan Srivastava', targetClass: 'Class 11', phone: '9876599903', email: 'meena.srivastava@yahoo.com', gender: 'MALE', dob: '2010-08-15', inquiryDate: '2026-09-20', stage: 'CONTACTED', notes: 'Counselor shared fee structure and lab details over WhatsApp.' },
  { id: 'inq-4', parentName: 'Anil Agarwal', childName: 'Nandini Agarwal', targetClass: 'Class 1', phone: '9876599904', gender: 'FEMALE', inquiryDate: '2026-09-19', stage: 'REGISTERED', notes: 'Admission form collected and token fee paid.' },
];

export default function InquiriesPage() {
  const [inquiries, setInquiries] = useState<InquiryItem[]>(initialInquiries);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State
  const [parentName, setParentName] = useState('');
  const [childName, setChildName] = useState('');
  const [targetClass, setTargetClass] = useState('Class 1');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [notification, setNotification] = useState<string | null>(null);

  const handleAddInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !phone.trim()) return;

    const newInq: InquiryItem = {
      id: `inq-${Date.now()}`,
      parentName,
      childName,
      targetClass,
      phone,
      inquiryDate: new Date().toISOString().split('T')[0],
      stage: 'NEW',
      notes,
    };

    setInquiries([newInq, ...inquiries]);
    setNotification(`Inquiry registered for ${parentName}!`);
    setIsAddModalOpen(false);
    setParentName('');
    setChildName('');
    setPhone('');
    setNotes('');
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredInquiries = useMemo(() => {
    return inquiries.filter((inq) => {
      const q = search.toLowerCase();
      return (
        inq.parentName.toLowerCase().includes(q) ||
        inq.childName.toLowerCase().includes(q) ||
        inq.phone.includes(q)
      );
    });
  }, [inquiries, search]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Toast */}
        {notification && (
          <div className="fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold animate-in slide-in-from-top-2">
            <CheckCircle2 size={18} className="text-emerald-600" />
            <span>{notification}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link
              href="/admission"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors mb-2"
            >
              <ArrowLeft size={14} />
              <span>Back to Admission Hub</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <HelpCircle size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Admission Inquiries CRM</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Lead pipeline, parent inquiries, counseling follow-ups, and campus visit scheduling
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
          >
            <Plus size={15} />
            <span>Record New Inquiry</span>
          </button>
        </div>

        {/* Search */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by parent name, child name, or phone..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <span className="text-xs text-gray-500">
            <strong>{filteredInquiries.length}</strong> active leads
          </span>
        </div>

        {/* Inquiries Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInquiries.map((inq) => (
            <div
              key={inq.id}
              className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{inq.parentName}</h3>
                    <p className="text-xs text-purple-700 font-semibold">
                      Ward: {inq.childName} &bull; Seeking {inq.targetClass}
                    </p>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      inq.stage === 'REGISTERED'
                        ? 'bg-emerald-50 text-emerald-700'
                        : inq.stage === 'CAMPUS_TOUR'
                        ? 'bg-blue-50 text-blue-700'
                        : inq.stage === 'CONTACTED'
                        ? 'bg-purple-50 text-purple-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {inq.stage.replace('_', ' ')}
                  </span>
                </div>

                <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  &ldquo;{inq.notes}&rdquo;
                </p>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <a href={`tel:${inq.phone}`} className="inline-flex items-center gap-1 font-mono font-semibold text-gray-800 hover:text-purple-600">
                    <Phone size={12} className="text-gray-400" />
                    <span>{inq.phone}</span>
                  </a>
                  <span className="text-gray-400 text-[11px]">Logged: {inq.inquiryDate}</span>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between">
                <a
                  href={`https://wa.me/${inq.phone.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 hover:underline"
                >
                  <MessageSquare size={13} />
                  <span>WhatsApp Follow-up</span>
                </a>

                <Link
                  href={`/admission/new?inquiryId=${encodeURIComponent(inq.id)}&childName=${encodeURIComponent(inq.childName)}&parentName=${encodeURIComponent(inq.parentName)}&phone=${encodeURIComponent(inq.phone)}&targetClass=${encodeURIComponent(inq.targetClass)}&notes=${encodeURIComponent(inq.notes || '')}${inq.gender ? `&gender=${encodeURIComponent(inq.gender)}` : ''}${inq.dob ? `&dob=${encodeURIComponent(inq.dob)}` : ''}${inq.email ? `&email=${encodeURIComponent(inq.email)}` : ''}${inq.category ? `&category=${encodeURIComponent(inq.category)}` : ''}${inq.address ? `&address=${encodeURIComponent(inq.address)}` : ''}`}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Convert to Admission</span>
                  <span>&rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Modal: Add Inquiry */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <HelpCircle size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Record Parent Inquiry</h3>
                  <p className="text-xs text-gray-500">Add walk-in lead to counselor pipeline</p>
                </div>
              </div>

              <form onSubmit={handleAddInquiry} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Parent / Guardian Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Child Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Aarav"
                      value={childName}
                      onChange={(e) => setChildName(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Target Grade
                    </label>
                    <select
                      value={targetClass}
                      onChange={(e) => setTargetClass(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      {['Nursery', 'LKG', 'UKG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Contact Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Inquiry Notes & Preferences
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Transport requirements, previous school details, counselor observations..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
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
                    Save Lead
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
