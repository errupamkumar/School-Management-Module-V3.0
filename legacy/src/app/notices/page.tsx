'use client';

import { useEffect, useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Megaphone,
  Plus,
  Search,
  Calendar,
  Users,
  Bell,
  CheckCircle2,
  X,
  AlertCircle,
  Tag,
  Clock,
  Sparkles
} from 'lucide-react';

interface NoticeItem {
  id: string;
  title: string;
  content: string;
  type: string; // 'GENERAL' | 'EXAM' | 'HOLIDAY' | 'FEE' | 'EVENT'
  targetRoles: string[];
  targetClasses?: string[];
  publishDate: string;
  expiryDate?: string | null;
  createdAt: string;
}

export default function NoticesPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || '';
  const canPublish = ['SUPER_ADMIN', 'ADMIN', 'TEACHER'].includes(userRole);

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [type, setType] = useState('GENERAL');
  const [targetRoles, setTargetRoles] = useState<string[]>(['STUDENT', 'PARENT']);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadNotices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notices');
      const data = await res.json();
      if (data.success) setNotices(data.data);
    } catch (err) {
      console.error('Failed to load notices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotices();
  }, []);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          type,
          targetRoles,
          createdById: 'admin',
        }),
      });

      const data = await res.json();
      if (data.success) {
        showNotification('success', 'Circular published successfully!');
        setIsPublishModalOpen(false);
        setTitle('');
        setContent('');
        setType('GENERAL');
        loadNotices();
      } else {
        showNotification('error', data.error || 'Failed to publish circular.');
      }
    } catch (err: any) {
      showNotification('error', err.message || 'Error occurred.');
    }
  };

  const toggleTargetRole = (role: string) => {
    setTargetRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(search.toLowerCase()) ||
        n.content.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'ALL' || n.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [notices, search, typeFilter]);

  const typeColorMap: Record<string, { bg: string; text: string; border: string }> = {
    GENERAL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    EXAM: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    HOLIDAY: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    FEE: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
    EVENT: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`fixed top-16 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-xl border text-sm font-semibold animate-in slide-in-from-top-2 ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-600" />
            ) : (
              <AlertCircle size={18} className="text-rose-600" />
            )}
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="ml-2 text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. HEADER                                                                 */}
        {/* ========================================================================= */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Megaphone size={18} />
              </div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Noticeboard & Circulars</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Broadcast announcements, holiday notifications, and academic circulars
            </p>
          </div>

          {canPublish && (
            <button
              onClick={() => setIsPublishModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-all transform active:scale-95"
            >
              <Plus size={15} />
              <span>Publish Circular</span>
            </button>
          )}
        </div>

        {/* ========================================================================= */}
        {/* 2. SEARCH & FILTER TOOLBAR                                                */}
        {/* ========================================================================= */}
        <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search circulars..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/80 rounded-xl text-xs outline-none focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400"
            />
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'GENERAL', 'EXAM', 'HOLIDAY', 'FEE', 'EVENT'].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  typeFilter === t
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {t === 'ALL' ? 'All Notices' : t}
              </button>
            ))}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. NOTICES FEED                                                           */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-xs font-semibold text-gray-500">Loading noticeboard circulars...</p>
          </div>
        ) : filteredNotices.length === 0 ? (
          <div className="bg-white rounded-3xl p-16 text-center border border-gray-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto mb-3">
              <Megaphone size={24} />
            </div>
            <h3 className="text-base font-bold text-gray-900">No notices published</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              There are no circulars matching your filter. Click &ldquo;Publish Circular&rdquo; to broadcast a notice.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotices.map((n) => {
              const style = typeColorMap[n.type] || typeColorMap.GENERAL;

              return (
                <div
                  key={n.id}
                  className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-6 flex flex-col justify-between"
                >
                  <div>
                    {/* Top Type & Date */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${style.bg} ${style.text} border ${style.border}`}
                      >
                        {n.type}
                      </span>

                      <span className="text-[11px] text-gray-400 flex items-center gap-1 font-medium">
                        <Calendar size={12} />
                        {new Date(n.publishDate || n.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-gray-900 leading-snug">{n.title}</h3>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed whitespace-pre-line">
                      {n.content}
                    </p>
                  </div>

                  {/* Footer Audience Tags */}
                  <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-semibold uppercase text-gray-400">Audience:</span>
                      {n.targetRoles?.map((r) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[10px] font-semibold"
                        >
                          {r}
                        </span>
                      ))}
                    </div>

                    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                      Broadcast Active
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. MODAL: PUBLISH CIRCULAR                                                */}
        {/* ========================================================================= */}
        {isPublishModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Megaphone size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Publish Notice</h3>
                  <p className="text-xs text-gray-500">Broadcast circular to school community</p>
                </div>
              </div>

              <form onSubmit={handlePublish} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Notice Title *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Half-Yearly Examination Schedule"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Notice Category
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full text-xs font-semibold px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                  >
                    <option value="GENERAL">General Announcement</option>
                    <option value="EXAM">Examination Notice</option>
                    <option value="HOLIDAY">Holiday Circular</option>
                    <option value="FEE">Fee Payment Reminder</option>
                    <option value="EVENT">Sports & Cultural Event</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    Notice Content *
                  </label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Type the full announcement message here..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                    Target Audience
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['STUDENT', 'PARENT', 'TEACHER'].map((role) => {
                      const isSelected = targetRoles.includes(role);
                      return (
                        <button
                          type="button"
                          key={role}
                          onClick={() => toggleTargetRole(role)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                            isSelected
                              ? 'bg-purple-600 text-white border-purple-600'
                              : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}
                        >
                          {role}S
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setIsPublishModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-md transition-all active:scale-95"
                  >
                    Publish Circular
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
