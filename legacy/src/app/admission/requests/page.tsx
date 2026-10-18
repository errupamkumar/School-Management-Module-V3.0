'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  X,
  Phone,
  Mail,
  UserCheck
} from 'lucide-react';

interface AdmissionRequestItem {
  id: string;
  applicantName: string;
  gender: string;
  appliedClass: string;
  fatherName: string;
  phone: string;
  email: string;
  appliedDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

const initialRequests: AdmissionRequestItem[] = [
  { id: 'req-1', applicantName: 'Shaurya Pratap Singh', gender: 'MALE', appliedClass: 'Class 6', fatherName: 'Vikram Singh', phone: '9876511111', email: 'vikram.singh@gmail.com', appliedDate: '2026-09-20', status: 'PENDING' },
  { id: 'req-2', applicantName: 'Riya Gupta', gender: 'FEMALE', appliedClass: 'Class 1', fatherName: 'Rajesh Gupta', phone: '9876522222', email: 'rajesh.g@gmail.com', appliedDate: '2026-09-21', status: 'PENDING' },
  { id: 'req-3', applicantName: 'Atharv Sharma', gender: 'MALE', appliedClass: 'Nursery', fatherName: 'Manoj Sharma', phone: '9876533333', email: 'manoj.sharma@gmail.com', appliedDate: '2026-09-22', status: 'PENDING' },
  { id: 'req-4', applicantName: 'Prisha Tiwari', gender: 'FEMALE', appliedClass: 'Class 8', fatherName: 'Ashok Tiwari', phone: '9876544444', email: 'ashok.t@gmail.com', appliedDate: '2026-09-18', status: 'APPROVED' },
  { id: 'req-5', applicantName: 'Rohan Verma', gender: 'MALE', appliedClass: 'Class 11', fatherName: 'Sunil Verma', phone: '9876555555', email: 'sunil.v@gmail.com', appliedDate: '2026-09-17', status: 'REJECTED' },
];

export default function AdmissionRequestsPage() {
  const [requests, setRequests] = useState<AdmissionRequestItem[]>(initialRequests);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [notification, setNotification] = useState<string | null>(null);

  const handleUpdateStatus = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setRequests((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
    setNotification(
      newStatus === 'APPROVED'
        ? 'Application approved! Student enrolled and credentials dispatched to parent.'
        : 'Application rejected.'
    );
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const q = search.toLowerCase();
      const matchSearch =
        r.applicantName.toLowerCase().includes(q) ||
        r.fatherName.toLowerCase().includes(q) ||
        r.phone.includes(q);
      const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, statusFilter]);

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
                <ClipboardList size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Online Admission Requests</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Review and approve prospective student applications received through the online admissions portal
            </p>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by applicant or parent name..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  statusFilter === s
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6">Applicant Name</th>
                  <th className="py-3.5 px-6">Applied Grade</th>
                  <th className="py-3.5 px-6">Guardian Info</th>
                  <th className="py-3.5 px-6">Submission Date</th>
                  <th className="py-3.5 px-6">Application Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredRequests.map((r) => (
                  <tr key={r.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6">
                      <p className="font-bold text-gray-900">{r.applicantName}</p>
                      <p className="text-[10px] text-gray-400 font-semibold">{r.gender}</p>
                    </td>

                    <td className="py-4 px-6">
                      <span className="font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100 text-[11px]">
                        {r.appliedClass}
                      </span>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-semibold text-gray-900">{r.fatherName}</p>
                      <p className="text-[11px] text-gray-500 font-mono">{r.phone}</p>
                    </td>

                    <td className="py-4 px-6 text-gray-500">{r.appliedDate}</td>

                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] px-2.5 py-1 rounded-full ${
                          r.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-700'
                            : r.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td className="py-4 px-6 text-right">
                      {r.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'APPROVED')}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-xs"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(r.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-[11px]">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
