'use client';
import { useState } from 'react';
import {
  CalendarOff, Plus, Search, Filter, CheckCircle2, XCircle, Clock,
  User, Check, X, Calendar, AlertCircle, FileText
} from 'lucide-react';

interface LeaveItem {
  id: string;
  applicantName: string;
  roleType: 'TEACHER' | 'STAFF' | 'STUDENT';
  subText: string; // e.g. "PGT Physics" or "Class 10-A (Roll 14)"
  leaveType: 'CASUAL' | 'SICK' | 'EARNED' | 'MATERNITY' | 'FAMILY';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  appliedDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  actionNote?: string;
}

const initialLeaves: LeaveItem[] = [
  {
    id: '1',
    applicantName: 'Dr. Rajesh Khanna',
    roleType: 'TEACHER',
    subText: 'Senior PGT Physics',
    leaveType: 'CASUAL',
    startDate: '2026-09-23',
    endDate: '2026-09-24',
    days: 2,
    reason: 'Attending National CBSE Science Curriculum Workshop in Chandigarh',
    appliedDate: '2026-09-21',
    status: 'PENDING',
  },
  {
    id: '2',
    applicantName: 'Aarav Sharma',
    roleType: 'STUDENT',
    subText: 'Class 10-A (Roll 01)',
    leaveType: 'SICK',
    startDate: '2026-09-22',
    endDate: '2026-09-23',
    days: 2,
    reason: 'Viral fever and prescribed doctor rest (Medical slip submitted to class teacher)',
    appliedDate: '2026-09-21',
    status: 'PENDING',
  },
  {
    id: '3',
    applicantName: 'Sunita Sharma',
    roleType: 'TEACHER',
    subText: 'TGT Mathematics',
    leaveType: 'FAMILY',
    startDate: '2026-09-18',
    endDate: '2026-09-19',
    days: 2,
    reason: 'Brother marriage ceremony in Jaipur',
    appliedDate: '2026-09-14',
    status: 'APPROVED',
  },
  {
    id: '4',
    applicantName: 'Ramesh Gupta',
    roleType: 'STAFF',
    subText: 'Chief Accountant',
    leaveType: 'CASUAL',
    startDate: '2026-09-15',
    endDate: '2026-09-15',
    days: 1,
    reason: 'Personal banking and registrar verification work',
    appliedDate: '2026-09-13',
    status: 'APPROVED',
  },
  {
    id: '5',
    applicantName: 'Rohan Gupta',
    roleType: 'STUDENT',
    subText: 'Class 10-A (Roll 03)',
    leaveType: 'FAMILY',
    startDate: '2026-09-12',
    endDate: '2026-09-13',
    days: 2,
    reason: 'Out of town family function',
    appliedDate: '2026-09-11',
    status: 'REJECTED',
    actionNote: 'Clashing with scheduled mid-term practical evaluation',
  },
];

export default function LeaveManagementPage() {
  const [leaves, setLeaves] = useState<LeaveItem[]>(initialLeaves);
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'TEACHER' | 'STAFF' | 'STUDENT'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    applicantName: '',
    roleType: 'TEACHER' as LeaveItem['roleType'],
    subText: '',
    leaveType: 'CASUAL' as LeaveItem['leaveType'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    days: 1,
    reason: '',
  });

  const pendingCount = leaves.filter(l => l.status === 'PENDING').length;
  const approvedCount = leaves.filter(l => l.status === 'APPROVED').length;

  const filteredLeaves = leaves.filter(l => {
    if (roleFilter !== 'ALL' && l.roleType !== roleFilter) return false;
    if (statusFilter !== 'ALL' && l.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        l.applicantName.toLowerCase().includes(q) ||
        l.subText.toLowerCase().includes(q) ||
        l.reason.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleStatusUpdate = (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    setLeaves(leaves.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.applicantName || !formData.reason) return;

    const newLeave: LeaveItem = {
      id: String(Date.now()),
      applicantName: formData.applicantName,
      roleType: formData.roleType,
      subText: formData.subText || (formData.roleType === 'STUDENT' ? 'Student' : 'Staff Member'),
      leaveType: formData.leaveType,
      startDate: formData.startDate,
      endDate: formData.endDate,
      days: Number(formData.days) || 1,
      reason: formData.reason,
      appliedDate: new Date().toISOString().split('T')[0],
      status: 'PENDING',
    };

    setLeaves([newLeave, ...leaves]);
    setShowApplyModal(false);
    setFormData({
      applicantName: '',
      roleType: 'TEACHER',
      subText: '',
      leaveType: 'CASUAL',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      days: 1,
      reason: '',
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
              <CalendarOff size={16} />
              <span>Absence Management • अवकाश प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Staff & Student Leave Approvals
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Track statutory teacher leave quotas (Casual, Sick, Earned) and process student absence parent slips with instant notification updates.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowApplyModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Submit Leave Request</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending Action</span>
          <p className="text-2xl font-black text-amber-600 mt-2">{pendingCount}</p>
          <p className="text-xs text-gray-400 mt-1">Awaiting principal or class teacher sign</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Approved Leaves</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{approvedCount}</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">This academic month</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Currently on Leave</span>
          <p className="text-2xl font-black text-purple-700 mt-2">2 Staff • 1 Student</p>
          <p className="text-xs text-gray-400 mt-1">Absence sync to attendance log</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quota Health</span>
          <p className="text-2xl font-black text-gray-900 mt-2">Normal</p>
          <p className="text-xs text-gray-400 mt-1">Avg 1.2 leaves taken per employee</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-2xl">
            {(['ALL', 'TEACHER', 'STAFF', 'STUDENT'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  roleFilter === r
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {r === 'ALL' ? 'All Roles' : r === 'TEACHER' ? 'Teachers' : r === 'STAFF' ? 'Non-Teaching' : 'Students'}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === s
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="relative w-full lg:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search applicant name, reason..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Leave Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider text-[11px] font-bold border-b border-gray-100">
              <tr>
                <th className="px-5 py-3.5">Applicant Details</th>
                <th className="px-5 py-3.5">Category</th>
                <th className="px-5 py-3.5">Leave Type</th>
                <th className="px-5 py-3.5">Duration & Dates</th>
                <th className="px-5 py-3.5">Reason / Justification</th>
                <th className="px-5 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
              {filteredLeaves.map((item) => (
                <tr key={item.id} className="hover:bg-purple-50/20 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{item.applicantName}</div>
                    <div className="text-[11px] text-gray-400">{item.subText}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-gray-100 text-gray-700 text-[11px] font-bold">
                      {item.roleType}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                      item.leaveType === 'SICK' ? 'bg-rose-50 text-rose-700' :
                      item.leaveType === 'CASUAL' ? 'bg-blue-50 text-blue-700' :
                      item.leaveType === 'MATERNITY' ? 'bg-pink-50 text-pink-700' :
                      'bg-purple-50 text-purple-700'
                    }`}>
                      {item.leaveType}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-gray-900">{item.days} Day{item.days > 1 ? 's' : ''}</div>
                    <div className="text-[11px] text-gray-400">{item.startDate} to {item.endDate}</div>
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-gray-800 line-clamp-2">{item.reason}</p>
                    {item.actionNote && (
                      <p className="text-[11px] text-rose-600 mt-1 italic">Note: {item.actionNote}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {item.status === 'APPROVED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={11} /> Approved
                      </span>
                    ) : item.status === 'REJECTED' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                        <XCircle size={11} /> Rejected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        <Clock size={11} /> Pending
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    {item.status === 'PENDING' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'APPROVED')}
                          title="Approve Leave"
                          className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl transition-colors"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(item.id, 'REJECTED')}
                          title="Reject Leave"
                          className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-semibold">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <CalendarOff size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Submit Leave Application</h3>
                  <p className="text-xs text-gray-400">Request formal leave approval</p>
                </div>
              </div>
              <button
                onClick={() => setShowApplyModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 mt-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Applicant Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sunil Verma"
                    value={formData.applicantName}
                    onChange={(e) => setFormData({ ...formData, applicantName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Role Type *</label>
                  <select
                    value={formData.roleType}
                    onChange={(e) => setFormData({ ...formData, roleType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="TEACHER">Teacher / Faculty</option>
                    <option value="STAFF">Administrative Staff</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Designation / Class *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. TGT Hindi or Class 10-A"
                    value={formData.subText}
                    onChange={(e) => setFormData({ ...formData, subText: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Leave Type *</label>
                  <select
                    value={formData.leaveType}
                    onChange={(e) => setFormData({ ...formData, leaveType: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="CASUAL">Casual Leave (CL)</option>
                    <option value="SICK">Medical / Sick Leave (ML)</option>
                    <option value="EARNED">Earned / Privilege Leave</option>
                    <option value="FAMILY">Family Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">From Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">To Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Days</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.days}
                    onChange={(e) => setFormData({ ...formData, days: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Leave *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the circumstances or medical reason..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
