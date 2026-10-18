'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Users2,
  Search,
  Phone,
  Mail,
  Send,
  GraduationCap,
  Building2,
  CheckCircle2,
  UserCheck,
  RotateCcw
} from 'lucide-react';

interface MappedStudent {
  id: string;
  admissionNo: string;
  firstName: string;
  lastName: string;
  class: { name: string };
  section: { name: string };
}

interface ParentItem {
  id: string;
  fatherName: string;
  fatherPhone?: string;
  fatherEmail?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherPhone?: string;
  user?: {
    email: string;
    phone?: string;
    isActive: boolean;
  };
  students: MappedStudent[];
}

export default function ParentsPage() {
  const [parents, setParents] = useState<ParentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadParents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/parents');
      const data = await res.json();
      if (data.success) setParents(data.data);
    } catch (err) {
      console.error('Failed to load parents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParents();
  }, []);

  const filteredParents = useMemo(() => {
    return parents.filter((p) => {
      const query = search.toLowerCase();
      const father = p.fatherName.toLowerCase();
      const mother = p.motherName?.toLowerCase() || '';
      const phone = p.fatherPhone || '';
      const hasChildMatch = p.students.some(
        (s) =>
          `${s.firstName} ${s.lastName}`.toLowerCase().includes(query) ||
          s.admissionNo.toLowerCase().includes(query)
      );

      return father.includes(query) || mother.includes(query) || phone.includes(query) || hasChildMatch;
    });
  }, [parents, search]);

  const stats = useMemo(() => {
    let totalChildren = 0;
    parents.forEach((p) => {
      totalChildren += p.students?.length || 0;
    });
    return {
      totalParents: parents.length,
      activeLogins: parents.filter((p) => p.user?.isActive !== false).length,
      totalChildren,
    };
  }, [parents]);

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* ========================================================================= */}
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Users2 size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Parent Accounts</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Registered guardians, mapped wards, emergency contacts, and portal access
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. STATS OVERVIEW                                                         */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Total Guardians</p>
            <h3 className="text-2xl font-black text-gray-900 mt-1">{stats.totalParents}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Registered parent accounts</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Connected Wards</p>
            <h3 className="text-2xl font-black text-purple-700 mt-1">{stats.totalChildren}</h3>
            <p className="text-[11px] text-gray-400 mt-0.5">Enrolled students mapped</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Portal Access</p>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{stats.activeLogins} Active</h3>
            <p className="text-[11px] text-emerald-600 mt-0.5">Parent mobile app enabled</p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. SEARCH TOOLBAR                                                         */}
        {/* ========================================================================= */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by parent name, child name, or mobile..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          <span className="text-xs text-gray-500">
            Showing <strong>{filteredParents.length}</strong> parent records
          </span>
        </div>

        {/* ========================================================================= */}
        {/* 4. PARENTS TABLE                                                          */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-center">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold text-gray-500">Loading parent accounts...</p>
            </div>
          ) : filteredParents.length === 0 ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
                <Users2 size={24} />
              </div>
              <h3 className="text-base font-bold text-gray-900">No parent records found</h3>
              <p className="text-xs text-gray-400 mt-1">Try refining your search query.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/80 border-b border-gray-100 text-[11px] uppercase font-bold text-gray-400 tracking-wider">
                    <th className="py-3.5 px-6">Father & Mother Name</th>
                    <th className="py-3.5 px-6">Enrolled Children (Wards)</th>
                    <th className="py-3.5 px-6">Contact Number</th>
                    <th className="py-3.5 px-6">Portal Login</th>
                    <th className="py-3.5 px-6 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
                  {filteredParents.map((p) => (
                    <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                      {/* Parent Names */}
                      <td className="py-4 px-6">
                        <div>
                          <p className="font-bold text-gray-900">{p.fatherName}</p>
                          {p.motherName && (
                            <p className="text-[11px] text-gray-400 mt-0.5">Mother: {p.motherName}</p>
                          )}
                        </div>
                      </td>

                      {/* Mapped Students */}
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1.5">
                          {p.students?.map((s) => (
                            <Link
                              key={s.id}
                              href={`/students/${s.id}`}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold text-[11px] border border-purple-100 transition-colors"
                            >
                              <GraduationCap size={12} />
                              <span>{s.firstName} {s.lastName}</span>
                              <span className="text-[10px] text-purple-500 font-mono">
                                ({s.class?.name}-{s.section?.name})
                              </span>
                            </Link>
                          ))}
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-4 px-6">
                        {p.fatherPhone ? (
                          <a
                            href={`tel:${p.fatherPhone}`}
                            className="inline-flex items-center gap-1 font-mono text-gray-800 hover:text-purple-600 font-semibold"
                          >
                            <Phone size={12} className="text-gray-400" />
                            <span>{p.fatherPhone}</span>
                          </a>
                        ) : (
                          <span className="text-gray-400 italic">No phone</span>
                        )}
                      </td>

                      {/* Portal Login */}
                      <td className="py-4 px-6">
                        <p className="font-mono text-[11px] text-gray-600">{p.user?.email || 'N/A'}</p>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-6 text-right">
                        {p.fatherPhone && (
                          <a
                            href={`https://wa.me/${p.fatherPhone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs transition-colors"
                          >
                            <Send size={12} />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
