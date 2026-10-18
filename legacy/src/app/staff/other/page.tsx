'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import {
  UserCog,
  Plus,
  Search,
  Phone,
  Mail,
  Briefcase,
  Building2,
  CheckCircle2,
  X,
  ArrowLeft
} from 'lucide-react';

interface StaffMember {
  id: string;
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  phone: string;
  salary: number;
  joiningDate: string;
  isActive: boolean;
}

const initialOtherStaff: StaffMember[] = [
  { id: 'stf-1', employeeId: 'EMP3001', name: 'Manoj Bajpai', designation: 'Head Accountant', department: 'Accounts & Finance', phone: '9876566001', salary: 32000, joiningDate: '2021-06-01', isActive: true },
  { id: 'stf-2', employeeId: 'EMP3002', name: 'Sarita Trivedi', designation: 'Senior Librarian', department: 'Library', phone: '9876566002', salary: 28000, joiningDate: '2022-04-15', isActive: true },
  { id: 'stf-3', employeeId: 'EMP3003', name: 'Ramesh Kumar', designation: 'Senior Bus Driver', department: 'Transport', phone: '9876500001', salary: 22000, joiningDate: '2020-08-10', isActive: true },
  { id: 'stf-4', employeeId: 'EMP3004', name: 'Gopal Krishna', designation: 'Physics Lab Assistant', department: 'Science Labs', phone: '9876566004', salary: 20000, joiningDate: '2023-01-10', isActive: true },
  { id: 'stf-5', employeeId: 'EMP3005', name: 'Surendra Singh', designation: 'Head Guard & Security', department: 'Security', phone: '9876566005', salary: 18000, joiningDate: '2019-11-01', isActive: true },
  { id: 'stf-6', employeeId: 'EMP3006', name: 'Radha Mohan', designation: 'Office Clerk & Registrar', department: 'Administration', phone: '9876566006', salary: 24000, joiningDate: '2022-09-01', isActive: true },
];

export default function OtherStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>(initialOtherStaff);
  const [search, setSearch] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [department, setDepartment] = useState('Administration');
  const [phone, setPhone] = useState('');
  const [salary, setSalary] = useState('22000');
  const [notification, setNotification] = useState<string | null>(null);

  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newStaff: StaffMember = {
      id: `stf-${Date.now()}`,
      employeeId: `EMP300${staffList.length + 1}`,
      name,
      designation,
      department,
      phone,
      salary: Number(salary) || 20000,
      joiningDate: new Date().toISOString().split('T')[0],
      isActive: true,
    };

    setStaffList([newStaff, ...staffList]);
    setNotification(`Staff member "${name}" registered successfully!`);
    setIsAddModalOpen(false);
    setName('');
    setDesignation('');
    setPhone('');
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.designation.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.employeeId.toLowerCase().includes(q)
      );
    });
  }, [staffList, search]);

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
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <UserCog size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Non-Teaching Staff</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Accountants, librarians, administrative clerks, drivers, security, and support staff
            </p>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus size={15} />
            <span>Add Staff Member</span>
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
              placeholder="Search by name, employee ID, or role..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <span className="text-xs text-gray-500">
            <strong>{filteredStaff.length}</strong> staff records
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                  <th className="py-3.5 px-6">Emp ID</th>
                  <th className="py-3.5 px-6">Staff Name</th>
                  <th className="py-3.5 px-6">Designation</th>
                  <th className="py-3.5 px-6">Department</th>
                  <th className="py-3.5 px-6">Contact Phone</th>
                  <th className="py-3.5 px-6 text-right">Salary</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                {filteredStaff.map((s) => (
                  <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="py-4 px-6 font-mono font-bold text-gray-800">{s.employeeId}</td>
                    <td className="py-4 px-6 font-bold text-gray-900">{s.name}</td>
                    <td className="py-4 px-6 font-semibold text-purple-700">{s.designation}</td>
                    <td className="py-4 px-6 text-gray-600">{s.department}</td>
                    <td className="py-4 px-6 font-mono">{s.phone}</td>
                    <td className="py-4 px-6 text-right font-black text-emerald-600">
                      {formatCurrency(s.salary)}/mo
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal: Add Staff */}
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
                  <UserCog size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Add Staff Member</h3>
                  <p className="text-xs text-gray-500">Register administrative or support employee</p>
                </div>
              </div>

              <form onSubmit={handleAddStaff} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Designation *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Accountant"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Department
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                    >
                      <option>Administration</option>
                      <option>Accounts & Finance</option>
                      <option>Library</option>
                      <option>Transport</option>
                      <option>Science Labs</option>
                      <option>Security</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Phone Number *
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
                    Save Employee
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
