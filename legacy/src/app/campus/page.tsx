'use client';
import { useState } from 'react';
import {
  Building2, Plus, MapPin, Phone, Mail, Users, School,
  CheckCircle2, Globe, Shield, Edit, X, ArrowUpRight
} from 'lucide-react';

interface CampusItem {
  id: string;
  code: string;
  name: string;
  type: 'MAIN' | 'BRANCH' | 'JUNIOR_WING';
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  principal: string;
  capacity: number;
  enrolled: number;
  staffCount: number;
  facilities: string[];
  isCurrent: boolean;
}

const initialCampuses: CampusItem[] = [
  {
    id: '1',
    code: 'V-CAMPUS-01',
    name: 'Vidyalaya Main Senior Campus',
    type: 'MAIN',
    address: 'Plot 4, Institutional Area, Sector 62',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201309',
    phone: '+91 120 4567890',
    email: 'principal.main@vidyalaya.edu.in',
    principal: 'Dr. Anand Swaroop Pathak',
    capacity: 2500,
    enrolled: 1840,
    staffCount: 112,
    facilities: ['Smart Classrooms', 'CBSE Science Labs', 'Olympic Pool', 'Auditorium', 'Fleet Depot'],
    isCurrent: true,
  },
  {
    id: '2',
    code: 'V-CAMPUS-02',
    name: 'Vidyalaya Junior Wing (Civil Lines)',
    type: 'JUNIOR_WING',
    address: '14/A, Mall Road, Civil Lines',
    city: 'New Delhi',
    state: 'Delhi',
    pincode: '110054',
    phone: '+91 11 23984512',
    email: 'headmistress.delhi@vidyalaya.edu.in',
    principal: 'Mrs. Shailaja Trivedi',
    capacity: 1200,
    enrolled: 890,
    staffCount: 54,
    facilities: ['Montessori Labs', 'Activity Play Zone', 'Robotics Starter', 'Kids Cafeteria'],
    isCurrent: false,
  },
  {
    id: '3',
    code: 'V-CAMPUS-03',
    name: 'Vidyalaya West City Branch',
    type: 'BRANCH',
    address: 'Sector 18, Raj Nagar Extension',
    city: 'Ghaziabad',
    state: 'Uttar Pradesh',
    pincode: '201017',
    phone: '+91 120 9988771',
    email: 'admin.rajnagar@vidyalaya.edu.in',
    principal: 'Mr. Arvind Saxena',
    capacity: 1800,
    enrolled: 1150,
    staffCount: 68,
    facilities: ['AI & Computer Lab', 'Indoor Badminton Court', 'Language Audio Lab'],
    isCurrent: false,
  },
];

export default function CampusPage() {
  const [campuses, setCampuses] = useState<CampusItem[]>(initialCampuses);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'BRANCH' as CampusItem['type'],
    address: '',
    city: 'Noida',
    state: 'Uttar Pradesh',
    pincode: '201301',
    phone: '',
    email: '',
    principal: '',
    capacity: 1000,
  });

  const totalStudents = campuses.reduce((acc, c) => acc + c.enrolled, 0);
  const totalCapacity = campuses.reduce((acc, c) => acc + c.capacity, 0);
  const totalStaff = campuses.reduce((acc, c) => acc + c.staffCount, 0);

  const handleSetActive = (id: string) => {
    setCampuses(campuses.map(c => ({
      ...c,
      isCurrent: c.id === id,
    })));
  };

  const handleCreateCampus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) return;

    const newCamp: CampusItem = {
      id: String(Date.now()),
      code: formData.code,
      name: formData.name,
      type: formData.type,
      address: formData.address || 'Campus Avenue',
      city: formData.city,
      state: formData.state,
      pincode: formData.pincode,
      phone: formData.phone || '+91 11 0000000',
      email: formData.email || 'campus@vidyalaya.edu.in',
      principal: formData.principal || 'Designated Principal',
      capacity: Number(formData.capacity) || 1000,
      enrolled: 0,
      staffCount: 15,
      facilities: ['Smart Classrooms', 'Science Lab', 'Library'],
      isCurrent: false,
    };

    setCampuses([...campuses, newCamp]);
    setShowAddModal(false);
    setFormData({
      name: '',
      code: '',
      type: 'BRANCH',
      address: '',
      city: 'Noida',
      state: 'Uttar Pradesh',
      pincode: '201301',
      phone: '',
      email: '',
      principal: '',
      capacity: 1000,
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
              <Building2 size={16} />
              <span>Multi-Branch Network • कैम्पस प्रबंधन</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Institutional Campuses & Wings
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Centralized multi-tenant management for school branches, junior wings, affiliated campuses, and physical infrastructure.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Add New Campus Branch</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Campus Branches</span>
          <p className="text-2xl font-black text-gray-900 mt-2">{campuses.length} Campuses</p>
          <p className="text-xs text-purple-600 font-semibold mt-1">Multi-branch enterprise setup</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Network Students</span>
          <p className="text-2xl font-black text-emerald-600 mt-2">{totalStudents.toLocaleString('en-IN')}</p>
          <p className="text-xs text-gray-400 mt-1">Across all 3 branches</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Combined Faculty & Staff</span>
          <p className="text-2xl font-black text-blue-600 mt-2">{totalStaff} Educators</p>
          <p className="text-xs text-gray-400 mt-1">Teaching & administrative roles</p>
        </div>
        <div className="bg-white rounded-3xl p-5 border border-purple-100/80 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Physical Capacity</span>
          <p className="text-2xl font-black text-purple-700 mt-2">{totalCapacity.toLocaleString('en-IN')} Seats</p>
          <p className="text-xs text-gray-400 mt-1">
            {Math.round((totalStudents / totalCapacity) * 100)}% overall network occupancy
          </p>
        </div>
      </div>

      {/* Campus Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {campuses.map((campus) => (
          <div
            key={campus.id}
            className={`bg-white rounded-3xl p-6 border shadow-sm flex flex-col justify-between transition-all relative ${
              campus.isCurrent ? 'border-purple-500 ring-4 ring-purple-500/10' : 'border-gray-100 hover:shadow-md'
            }`}
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-xl">
                  {campus.code}
                </span>

                {campus.isCurrent ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white text-[11px] font-black rounded-full shadow-sm">
                    <CheckCircle2 size={12} /> Active Branch
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full">
                    {campus.type.replace('_', ' ')}
                  </span>
                )}
              </div>

              {/* Campus Name */}
              <h3 className="font-extrabold text-gray-900 text-lg leading-snug">
                {campus.name}
              </h3>
              <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-2">
                <MapPin size={13} className="text-purple-600 flex-shrink-0" />
                <span>{campus.address}, {campus.city}, {campus.state} - {campus.pincode}</span>
              </p>

              {/* Leadership info */}
              <div className="mt-4 p-3.5 bg-gray-50 rounded-2xl border border-gray-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Principal:</span>
                  <span className="font-bold text-gray-900">{campus.principal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Phone:</span>
                  <span className="font-semibold text-gray-700">{campus.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Email:</span>
                  <span className="text-purple-700 font-semibold truncate max-w-[170px]">{campus.email}</span>
                </div>
              </div>

              {/* Capacity Bar */}
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-gray-600">Student Occupancy</span>
                  <span className="text-purple-700">{campus.enrolled} / {campus.capacity}</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-600 h-full rounded-full"
                    style={{ width: `${(campus.enrolled / campus.capacity) * 100}%` }}
                  />
                </div>
              </div>

              {/* Facilities Tags */}
              <div className="mt-4 flex flex-wrap gap-1.5">
                {campus.facilities.map((fac, idx) => (
                  <span key={idx} className="px-2 py-0.5 bg-purple-50/70 text-purple-700 text-[10px] font-bold rounded-lg">
                    {fac}
                  </span>
                ))}
              </div>
            </div>

            {/* Switch Action */}
            <div className="mt-6 pt-4 border-t border-gray-100">
              {campus.isCurrent ? (
                <div className="text-center py-2 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-xl">
                  Currently Managing This Branch
                </div>
              ) : (
                <button
                  onClick={() => handleSetActive(campus.id)}
                  className="w-full py-2.5 bg-gray-100 hover:bg-purple-600 hover:text-white text-gray-700 text-xs font-bold rounded-xl transition-all shadow-sm"
                >
                  Switch Workspace to This Campus
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Campus Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Register Campus Branch</h3>
                  <p className="text-xs text-gray-400">Expand school institutional network</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCampus} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Campus / Branch Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vidyalaya South City Extension"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Branch Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. V-CAMPUS-04"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Branch Type *</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="BRANCH">Full Senior Secondary Branch</option>
                    <option value="JUNIOR_WING">Junior Primary Wing</option>
                    <option value="MAIN">Main Campus Headquarters</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="Plot 12, Knowledge Park"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Capacity</label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1000 })}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Principal / Head Incharge</label>
                  <input
                    type="text"
                    placeholder="e.g. Mrs. Sunita Saxena"
                    value={formData.principal}
                    onChange={(e) => setFormData({ ...formData, principal: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Campus Phone</label>
                  <input
                    type="text"
                    placeholder="+91 120 0000000"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Save Campus Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
