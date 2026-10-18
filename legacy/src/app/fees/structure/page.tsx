'use client';

import { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { formatCurrency } from '@/utils/helpers';
import { useCampus } from '@/components/providers/CampusProvider';
import {
  CreditCard,
  Plus,
  Search,
  School,
  Settings,
  Calendar,
  CheckCircle2,
  X,
  AlertCircle,
  Tag,
  Building2,
  Layers,
  UserCheck,
  Percent,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import toast from 'react-hot-toast';

interface FeeStructureItem {
  id: string;
  name: string;
  feeType: string;
  amount: number;
  frequency: string;
  academicYear: string;
  className: string;
}

interface FeeGroupItem {
  id: string;
  name: string;
  description?: string;
  academicYear: string;
  feeStructures: {
    id: string;
    name: string;
    amount: number;
    class?: { name: string };
  }[];
  _count?: {
    studentOverrides: number;
  };
}

interface StudentOverrideItem {
  id: string;
  student: {
    firstName: string;
    lastName: string;
    admissionNo: string;
    class?: { name: string };
  };
  feeGroup?: { name: string } | null;
  feeStructure?: { name: string; amount: number } | null;
  overrideAmount?: number | null;
  discount: number;
  reason: string;
  academicYear: string;
}

const initialStructures: FeeStructureItem[] = [
  { id: 'fs-1', name: 'Monthly Tuition Fee', feeType: 'TUITION', amount: 2500, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 10' },
  { id: 'fs-2', name: 'Computer Lab Fee', feeType: 'COMPUTER', amount: 500, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 10' },
  { id: 'fs-3', name: 'Half-Yearly Examination Fee', feeType: 'EXAM', amount: 1500, frequency: 'HALF_YEARLY', academicYear: '2025-26', className: 'Class 10' },
  { id: 'fs-4', name: 'Annual Development Charges', feeType: 'ANNUAL', amount: 5000, frequency: 'YEARLY', academicYear: '2025-26', className: 'Class 10' },

  { id: 'fs-5', name: 'Monthly Tuition Fee', feeType: 'TUITION', amount: 2200, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 9' },
  { id: 'fs-6', name: 'Computer Lab Fee', feeType: 'COMPUTER', amount: 500, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 9' },
  { id: 'fs-7', name: 'Annual Development Charges', feeType: 'ANNUAL', amount: 5000, frequency: 'YEARLY', academicYear: '2025-26', className: 'Class 9' },

  { id: 'fs-8', name: 'Primary Tuition Fee', feeType: 'TUITION', amount: 1800, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 5' },
  { id: 'fs-9', name: 'Activity & Sports Fee', feeType: 'ACTIVITY', amount: 300, frequency: 'MONTHLY', academicYear: '2025-26', className: 'Class 5' },
];

const initialGroups: FeeGroupItem[] = [
  {
    id: 'fg-1',
    name: 'Class 10 Comprehensive Annual Package',
    description: 'Includes tuition, computer lab, half-yearly exam, and annual development heads',
    academicYear: '2025-26',
    feeStructures: [
      { id: 'fs-1', name: 'Monthly Tuition Fee', amount: 2500 },
      { id: 'fs-2', name: 'Computer Lab Fee', amount: 500 },
      { id: 'fs-3', name: 'Half-Yearly Examination Fee', amount: 1500 },
      { id: 'fs-4', name: 'Annual Development Charges', amount: 5000 },
    ],
    _count: { studentOverrides: 2 },
  },
  {
    id: 'fg-2',
    name: 'Class 9 Standard Academic Group',
    description: 'Tuition and computer lab fee package',
    academicYear: '2025-26',
    feeStructures: [
      { id: 'fs-5', name: 'Monthly Tuition Fee', amount: 2200 },
      { id: 'fs-6', name: 'Computer Lab Fee', amount: 500 },
    ],
    _count: { studentOverrides: 1 },
  },
];

const initialOverrides: StudentOverrideItem[] = [
  {
    id: 'ov-1',
    student: { firstName: 'Aarav', lastName: 'Kumar', admissionNo: 'ADM251001', class: { name: '10' } },
    feeGroup: { name: 'Class 10 Comprehensive Annual Package' },
    overrideAmount: 7500,
    discount: 2000,
    reason: 'Sibling Concession (2nd child enrolled)',
    academicYear: '2025-26',
  },
  {
    id: 'ov-2',
    student: { firstName: 'Rohan', lastName: 'Verma', admissionNo: 'ADM251003', class: { name: '10' } },
    feeStructure: { name: 'Annual Development Charges', amount: 5000 },
    overrideAmount: 2500,
    discount: 2500,
    reason: 'Merit Scholarship Waiver (State Math Olympiad 1st Rank)',
    academicYear: '2025-26',
  },
];

export default function FeeStructurePage() {
  const { selectedCampusId } = useCampus();
  const [activeTab, setActiveTab] = useState<'heads' | 'groups' | 'overrides'>('heads');

  // Fee Heads State
  const [structures, setStructures] = useState<FeeStructureItem[]>(initialStructures);
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('ALL');
  const [isAddHeadModalOpen, setIsAddHeadModalOpen] = useState(false);

  // New Head Form State
  const [headName, setHeadName] = useState('');
  const [feeType, setFeeType] = useState('TUITION');
  const [headAmount, setHeadAmount] = useState('2500');
  const [frequency, setFrequency] = useState('MONTHLY');
  const [headClassName, setHeadClassName] = useState('Class 10');

  // SA-08 Fee Groups State
  const [groups, setGroups] = useState<FeeGroupItem[]>(initialGroups);
  const [isAddGroupModalOpen, setIsAddGroupModalOpen] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedStructureIds, setSelectedStructureIds] = useState<string[]>([]);

  // SA-08 Student Overrides State
  const [overrides, setOverrides] = useState<StudentOverrideItem[]>(initialOverrides);
  const [isAddOverrideModalOpen, setIsAddOverrideModalOpen] = useState(false);
  const [overrideStudentAdmNo, setOverrideStudentAdmNo] = useState('ADM251001');
  const [overrideTargetType, setOverrideTargetType] = useState<'GROUP' | 'HEAD'>('GROUP');
  const [overrideGroupId, setOverrideGroupId] = useState('fg-1');
  const [overrideStructureId, setOverrideStructureId] = useState('fs-1');
  const [overrideDiscount, setOverrideDiscount] = useState('1000');
  const [overrideReason, setOverrideReason] = useState('Staff Child Concession');

  // Load fee groups from backend if available
  useEffect(() => {
    fetch(`/api/fees/groups?campusId=${selectedCampusId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setGroups(data.data);
        }
      })
      .catch(() => {});
  }, [selectedCampusId]);

  // Load fee overrides from backend if available
  useEffect(() => {
    fetch('/api/fees/overrides')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setOverrides(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Filtered Structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
      const matchClass = classFilter === 'ALL' || s.className === classFilter;
      return matchSearch && matchClass;
    });
  }, [structures, search, classFilter]);

  const uniqueClasses = Array.from(new Set(structures.map((s) => s.className)));

  // Handlers
  const handleCreateStructure = (e: React.FormEvent) => {
    e.preventDefault();
    if (!headName.trim()) return;

    const newItem: FeeStructureItem = {
      id: `fs-${Date.now()}`,
      name: headName.trim(),
      feeType,
      amount: Number(headAmount) || 0,
      frequency,
      academicYear: '2025-26',
      className: headClassName,
    };

    setStructures([newItem, ...structures]);
    toast.success(`Fee head "${headName}" created for ${headClassName}`);
    setIsAddHeadModalOpen(false);
    setHeadName('');
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    const selectedHeads = structures.filter((s) => selectedStructureIds.includes(s.id));
    const newGroup: FeeGroupItem = {
      id: `fg-${Date.now()}`,
      name: groupName.trim(),
      description: groupDesc,
      academicYear: '2025-26',
      feeStructures: selectedHeads.map((h) => ({ id: h.id, name: h.name, amount: h.amount })),
      _count: { studentOverrides: 0 },
    };

    setGroups([newGroup, ...groups]);
    toast.success(`Fee group bundle "${groupName}" configured with ${selectedStructureIds.length} heads!`);
    setIsAddGroupModalOpen(false);
    setGroupName('');
    setGroupDesc('');
    setSelectedStructureIds([]);

    // Try posting to API in background
    try {
      await fetch('/api/fees/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: groupName.trim(),
          description: groupDesc,
          campusId: selectedCampusId,
          feeStructureIds: selectedStructureIds,
        }),
      });
    } catch (e) {}
  };

  const handleCreateOverride = async (e: React.FormEvent) => {
    e.preventDefault();

    const newOverride: StudentOverrideItem = {
      id: `ov-${Date.now()}`,
      student: { firstName: 'Student', lastName: `(${overrideStudentAdmNo})`, admissionNo: overrideStudentAdmNo },
      feeGroup: overrideTargetType === 'GROUP' ? groups.find((g) => g.id === overrideGroupId) || { name: 'Package' } : null,
      feeStructure: overrideTargetType === 'HEAD' ? structures.find((s) => s.id === overrideStructureId) || { name: 'Fee Head', amount: 2500 } : null,
      discount: Number(overrideDiscount) || 0,
      reason: overrideReason,
      academicYear: '2025-26',
    };

    setOverrides([newOverride, ...overrides]);
    toast.success(`Concession override applied for admission no ${overrideStudentAdmNo}`);
    setIsAddOverrideModalOpen(false);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* 1. Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <CreditCard size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Fee Structure &amp; Groups</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Configure base fee heads, bundle into fee groups, and manage student-level concession overrides (SA-08)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'heads' && (
              <button
                onClick={() => setIsAddHeadModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <Plus size={15} />
                <span>Add Fee Head</span>
              </button>
            )}

            {activeTab === 'groups' && (
              <button
                onClick={() => setIsAddGroupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <Layers size={15} />
                <span>Create Fee Group</span>
              </button>
            )}

            {activeTab === 'overrides' && (
              <button
                onClick={() => setIsAddOverrideModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                <Percent size={15} />
                <span>Add Student Override</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. SA-08 Navigation Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            type="button"
            onClick={() => setActiveTab('heads')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors ${
              activeTab === 'heads'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Tag size={15} />
            <span>Individual Fee Heads ({structures.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('groups')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors ${
              activeTab === 'groups'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers size={15} />
            <span>Fee Groups &amp; Bundles ({groups.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('overrides')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors ${
              activeTab === 'overrides'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <UserCheck size={15} />
            <span>Student Overrides &amp; Concessions ({overrides.length})</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: INDIVIDUAL FEE HEADS                                               */}
        {/* ========================================================================= */}
        {activeTab === 'heads' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-72">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search fee head..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="text-xs font-semibold px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                >
                  <option value="ALL">All Classes</option>
                  {uniqueClasses.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="py-3.5 px-6">Fee Head Name</th>
                    <th className="py-3.5 px-6">Target Class</th>
                    <th className="py-3.5 px-6">Fee Category</th>
                    <th className="py-3.5 px-6">Billing Frequency</th>
                    <th className="py-3.5 px-6 text-right">Base Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredStructures.map((s) => (
                    <tr key={s.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-900">{s.name}</td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 font-bold text-[11px]">
                          {s.className}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-[11px] font-semibold text-gray-600">{s.feeType}</span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">{s.frequency}</td>
                      <td className="py-4 px-6 text-right font-bold text-sm text-gray-900">
                        {formatCurrency(s.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SA-08 FEE GROUPS & PACKAGES                                        */}
        {/* ========================================================================= */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((g) => {
              const totalSum = g.feeStructures.reduce((acc, h) => acc + h.amount, 0);

              return (
                <div key={g.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase">
                        Group Bundle • {g.academicYear}
                      </span>
                      <span className="text-xs font-bold text-emerald-600">
                        Total: {formatCurrency(totalSum)}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-gray-900">{g.name}</h3>
                      {g.description && <p className="text-xs text-gray-500 mt-0.5">{g.description}</p>}
                    </div>

                    <div className="space-y-1.5 pt-2 border-t border-gray-50">
                      <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Bundled Fee Heads ({g.feeStructures.length})</p>
                      <div className="space-y-1">
                        {g.feeStructures.map((h) => (
                          <div key={h.id} className="flex items-center justify-between text-xs py-1 px-2.5 bg-gray-50 rounded-xl">
                            <span className="font-semibold text-gray-800">{h.name}</span>
                            <span className="font-mono text-gray-600 font-bold">{formatCurrency(h.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-gray-400 font-medium">
                      Overrides: <strong>{g._count?.studentOverrides || 0} students</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setOverrideGroupId(g.id);
                        setActiveTab('overrides');
                        setIsAddOverrideModalOpen(true);
                      }}
                      className="text-purple-600 hover:text-purple-800 font-bold flex items-center gap-1"
                    >
                      <span>Assign with Override</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: SA-08 STUDENT CONCESSIONS & OVERRIDES                              */}
        {/* ========================================================================= */}
        {activeTab === 'overrides' && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400">
                  <tr>
                    <th className="py-3.5 px-6">Student</th>
                    <th className="py-3.5 px-6">Target Fee Group / Head</th>
                    <th className="py-3.5 px-6">Concession Reason</th>
                    <th className="py-3.5 px-6">Discount Waiver</th>
                    <th className="py-3.5 px-6 text-right">Applicable Override</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {overrides.map((ov) => (
                    <tr key={ov.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="py-4 px-6 font-bold text-gray-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs">
                            {ov.student.firstName[0]}
                          </div>
                          <div>
                            <p>{ov.student.firstName} {ov.student.lastName}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{ov.student.admissionNo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-800">
                          {ov.feeGroup?.name || ov.feeStructure?.name || 'Assigned Package'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-xl bg-amber-50 text-amber-800 font-medium text-xs border border-amber-100">
                          {ov.reason}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-emerald-600">
                        -{formatCurrency(ov.discount)}
                      </td>
                      <td className="py-4 px-6 text-right font-bold text-sm text-purple-900">
                        {ov.overrideAmount !== null && ov.overrideAmount !== undefined
                          ? formatCurrency(ov.overrideAmount)
                          : 'Calculated with Concession'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: CREATE FEE HEAD                                                  */}
        {/* ========================================================================= */}
        {isAddHeadModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setIsAddHeadModalOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Base Fee Head</h3>
              <form onSubmit={handleCreateStructure} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fee Head Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Science Lab & Practical Fee"
                    value={headName}
                    onChange={(e) => setHeadName(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={headAmount}
                      onChange={(e) => setHeadAmount(e.target.value)}
                      className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Class</label>
                    <select
                      value={headClassName}
                      onChange={(e) => setHeadClassName(e.target.value)}
                      className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                    >
                      {['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setIsAddHeadModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl shadow">Save Head</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: SA-08 CREATE FEE GROUP PACKAGE                                   */}
        {/* ========================================================================= */}
        {isAddGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setIsAddGroupModalOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Create Fee Group Bundle (SA-08)</h3>
              <p className="text-xs text-gray-500 mb-4">Bundle multiple fee heads into a unified group package with base defaults</p>

              <form onSubmit={handleCreateGroup} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Fee Group Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Class 10 Science Stream Package"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Package Description</label>
                  <input
                    type="text"
                    placeholder="Brief description of included heads"
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Select Included Fee Heads</label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 border border-gray-100 p-2 rounded-2xl bg-gray-50/50">
                    {structures.map((s) => {
                      const isSelected = selectedStructureIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                            isSelected ? 'bg-purple-100 text-purple-900 font-bold' : 'hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                setSelectedStructureIds((prev) =>
                                  prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                                );
                              }}
                              className="rounded text-purple-600"
                            />
                            <span>{s.name} ({s.className})</span>
                          </div>
                          <span className="font-mono">{formatCurrency(s.amount)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-between border-t border-gray-100">
                  <span className="text-xs text-purple-700 font-bold">
                    Bundle Total: {formatCurrency(structures.filter((s) => selectedStructureIds.includes(s.id)).reduce((acc, h) => acc + h.amount, 0))}
                  </span>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setIsAddGroupModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Cancel</button>
                    <button type="submit" disabled={selectedStructureIds.length === 0} className="px-5 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl shadow disabled:opacity-50">
                      Create Package
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: SA-08 ADD STUDENT OVERRIDE / CONCESSION                          */}
        {/* ========================================================================= */}
        {isAddOverrideModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setIsAddOverrideModalOpen(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Add Student Concession / Override (SA-08)</h3>
              <p className="text-xs text-gray-500 mb-4">Set per-student fee discounts or fixed override amounts</p>

              <form onSubmit={handleCreateOverride} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Student Admission No *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ADM251001"
                    value={overrideStudentAdmNo}
                    onChange={(e) => setOverrideStudentAdmNo(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Override Target</label>
                    <select
                      value={overrideTargetType}
                      onChange={(e) => setOverrideTargetType(e.target.value as any)}
                      className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                    >
                      <option value="GROUP">Fee Group Package</option>
                      <option value="HEAD">Single Fee Head</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Target Name</label>
                    {overrideTargetType === 'GROUP' ? (
                      <select
                        value={overrideGroupId}
                        onChange={(e) => setOverrideGroupId(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                      >
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={overrideStructureId}
                        onChange={(e) => setOverrideStructureId(e.target.value)}
                        className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 outline-none"
                      >
                        {structures.map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.className})</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Concession Discount Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={overrideDiscount}
                    onChange={(e) => setOverrideDiscount(e.target.value)}
                    className="w-full text-xs font-mono font-bold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Reason / Policy Waiver *</label>
                  <select
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none"
                  >
                    <option value="Staff Child Concession">Staff Child Concession (50%)</option>
                    <option value="Sibling Concession (2nd child)">Sibling Concession (2nd child)</option>
                    <option value="Merit Scholarship Waiver">Merit Scholarship Waiver</option>
                    <option value="RTE Quota Complete Waiver">RTE Quota Complete Waiver</option>
                    <option value="Economically Weaker Section (EWS)">Economically Weaker Section (EWS)</option>
                    <option value="Principal Discretionary Concession">Principal Discretionary Concession</option>
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setIsAddOverrideModalOpen(false)} className="px-4 py-2 text-xs font-semibold text-gray-600">Cancel</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold bg-purple-600 text-white rounded-xl shadow">Apply Concession</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
