'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { useLanguage } from '@/components/providers/LanguageProvider';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  AlertTriangle,
  Receipt,
  GraduationCap,
  CalendarCheck,
  Megaphone,
  Clock,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/utils/helpers';
import toast from 'react-hot-toast';

interface NotificationItem {
  id: string;
  title: string;
  titleHi: string;
  message: string;
  messageHi: string;
  category: 'FEE' | 'ATTENDANCE' | 'EXAM' | 'ANNOUNCEMENT' | 'SYSTEM' | 'SAFE_ARRIVAL';
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: '1',
    title: 'Pending Fee Reminder',
    titleHi: 'बकाया शुल्क अनुस्मारक',
    message: 'Second installment fee for 18 students of Class 10-A is due tomorrow. Automated reminder SMS sent.',
    messageHi: 'कक्षा 10-ए के 18 छात्रों की दूसरी किस्त का शुल्क कल देय है। स्वचालित अनुस्मारक एसएमएस भेजा गया।',
    category: 'FEE',
    timestamp: '15 minutes ago',
    isRead: false,
    actionUrl: '/fees/dues',
  },
  {
    id: '2',
    title: 'Mid-Term Exam Datesheet Announced',
    titleHi: 'अर्धवार्षिक परीक्षा समय सारणी घोषित',
    message: 'Exam schedule for Classes 1st to 12th has been published and synced with student timetable.',
    messageHi: 'कक्षा 1 से 12 तक की परीक्षा समय सारणी प्रकाशित कर दी गई है और समय सारणी से जोड़ दी गई है।',
    category: 'EXAM',
    timestamp: '2 hours ago',
    isRead: false,
    actionUrl: '/exams',
  },
  {
    id: '3',
    title: 'Daily Attendance Report Ready',
    titleHi: 'दैनिक उपस्थिति रिपोर्ट तैयार',
    message: '94.2% student attendance marked across all 12 standards. 3 classes pending teacher verification.',
    messageHi: 'सभी 12 कक्षाओं में 94.2% छात्र उपस्थिति दर्ज की गई। 3 कक्षाओं का सत्यापन शेष है।',
    category: 'ATTENDANCE',
    timestamp: '5 hours ago',
    isRead: false,
    actionUrl: '/attendance',
  },
  {
    id: '4',
    title: 'Teacher Leave Application',
    titleHi: 'शिक्षक अवकाश आवेदन',
    message: 'Rahul Sharma (Senior Mathematics Teacher) submitted a casual leave request for Friday.',
    messageHi: 'राहुल शर्मा (वरिष्ठ गणित शिक्षक) ने शुक्रवार के लिए आकस्मिक अवकाश का अनुरोध प्रस्तुत किया।',
    category: 'SYSTEM',
    timestamp: 'Yesterday at 4:30 PM',
    isRead: true,
    actionUrl: '/staff/teachers',
  },
  {
    id: '5',
    title: 'Gandhi Jayanti Holiday Announcement',
    titleHi: 'गांधी जयंती अवकाश सूचना',
    message: 'School holiday circular issued for October 2nd. Sent to all 1,240 parent accounts.',
    messageHi: '2 अक्टूबर के लिए स्कूल अवकाश परिपत्र जारी। सभी 1,240 अभिभावकों को भेजा गया।',
    category: 'ANNOUNCEMENT',
    timestamp: '2 days ago',
    isRead: true,
    actionUrl: '/notices',
  },
  {
    id: '6',
    title: 'Online Fee Payment Received',
    titleHi: 'ऑनलाइन शुल्क भुगतान प्राप्त',
    message: '₹14,500 successfully paid by Parent of Aarav Verma (Class 8-B) via UPI Gateway.',
    messageHi: 'आरव वर्मा (कक्षा 8-बी) के अभिभावक द्वारा यूपीआई से ₹14,500 का शुल्क भुगतान प्राप्त हुआ।',
    category: 'FEE',
    timestamp: '3 days ago',
    isRead: true,
    actionUrl: '/fees',
  },
];

export default function NotificationsPage() {
  const { lang } = useLanguage();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetch('/api/notifications')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          const apiItems = data.data.map((item: any) => ({
            id: item.id,
            title: item.title,
            titleHi: item.title,
            message: item.message,
            messageHi: item.message,
            category: item.category || 'SYSTEM',
            timestamp: item.time || 'Just now',
            isRead: item.read || false,
            actionUrl: item.actionUrl || '/dashboard/parent',
          }));
          setNotifications((prev) => {
            const existingIds = new Set(apiItems.map((a: any) => a.id));
            return [...apiItems, ...prev.filter((p) => !existingIds.has(p.id))];
          });
        }
      })
      .catch(() => {});
  }, []);

  const getCategoryBadge = (category: NotificationItem['category']) => {
    switch (category) {
      case 'SAFE_ARRIVAL':
        return {
          label: lang === 'hi' ? 'सुरक्षित आगमन' : 'Safe Arrival',
          icon: CheckCircle2,
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'FEE':
        return {
          label: lang === 'hi' ? 'शुल्क' : 'Fee',
          icon: Receipt,
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'EXAM':
        return {
          label: lang === 'hi' ? 'परीक्षा' : 'Exam',
          icon: GraduationCap,
          color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      case 'ATTENDANCE':
        return {
          label: lang === 'hi' ? 'उपस्थिति' : 'Attendance',
          icon: CalendarCheck,
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
        };
      case 'ANNOUNCEMENT':
        return {
          label: lang === 'hi' ? 'सूचना' : 'Notice',
          icon: Megaphone,
          color: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      default:
        return {
          label: lang === 'hi' ? 'सिस्टम' : 'System',
          icon: AlertTriangle,
          color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
        };
    }
  };

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    toast.success(lang === 'hi' ? 'सभी सूचनाएं पढ़ी गई चिह्नित की गईं' : 'All notifications marked as read');
  };

  const handleToggleRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: !n.isRead } : n))
    );
  };

  const handleDelete = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    toast.success(lang === 'hi' ? 'सूचना हटाई गई' : 'Notification removed');
  };

  const filteredNotifications = notifications.filter((n) => {
    if (selectedFilter === 'UNREAD') return !n.isRead;
    if (selectedFilter !== 'ALL') return n.category === selectedFilter;
    return true;
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 pb-12">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-gray-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-300 flex items-center justify-center">
              <Bell size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {lang === 'hi' ? 'सूचनाएं एवं अलर्ट केंद्र' : 'Notifications & Alerts'}
                </h1>
                {unreadCount > 0 && (
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-xs font-bold">
                    {unreadCount} {lang === 'hi' ? 'नया' : 'new'}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {lang === 'hi'
                  ? 'शुल्क, परीक्षा, उपस्थिति और प्रशासनिक सूचनाओं का वास्तविक समय विवरण'
                  : 'Real-time updates regarding fees, exams, attendance and administrative alerts'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMarkAllRead}
              disabled={unreadCount === 0}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gray-100 dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-slate-700 text-gray-700 dark:text-gray-200 hover:text-purple-700 transition-colors disabled:opacity-40"
            >
              <CheckCheck size={16} />
              <span>{lang === 'hi' ? 'सभी पढ़ा हुआ चिह्नित करें' : 'Mark all as read'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { key: 'ALL', label: lang === 'hi' ? 'सभी सूचनाएं' : 'All Updates' },
            { key: 'UNREAD', label: `${lang === 'hi' ? 'अपठित' : 'Unread'} (${unreadCount})` },
            { key: 'SAFE_ARRIVAL', label: lang === 'hi' ? 'सुरक्षित आगमन' : 'Safe Arrival' },
            { key: 'FEE', label: lang === 'hi' ? 'शुल्क अलर्ट' : 'Fee Alerts' },
            { key: 'EXAM', label: lang === 'hi' ? 'परीक्षा' : 'Exams' },
            { key: 'ATTENDANCE', label: lang === 'hi' ? 'उपस्थिति' : 'Attendance' },
            { key: 'ANNOUNCEMENT', label: lang === 'hi' ? 'घोषणाएं' : 'Announcements' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedFilter(tab.key)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border shadow-sm',
                selectedFilter === tab.key
                  ? 'bg-purple-600 text-white border-purple-600 shadow-purple-600/20'
                  : 'bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-800'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-slate-800">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 text-gray-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {lang === 'hi' ? 'कोई सूचना नहीं' : 'No notifications in this category'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-sm mx-auto">
                {lang === 'hi' ? 'आप पूरी तरह से अद्यतित हैं!' : 'You are completely caught up!'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notif) => {
              const badge = getCategoryBadge(notif.category);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={notif.id}
                  className={cn(
                    'group flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border transition-all',
                    notif.isRead
                      ? 'bg-white dark:bg-slate-900 border-gray-100 dark:border-slate-800 shadow-sm opacity-85'
                      : 'bg-purple-50/40 dark:bg-slate-900/90 border-purple-200/80 dark:border-purple-900/50 shadow-md ring-1 ring-purple-500/10'
                  )}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border', badge.color)}>
                      <BadgeIcon size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider', badge.color)}>
                          {badge.label}
                        </span>
                        {!notif.isRead && (
                          <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                        )}
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1">
                          <Clock size={11} />
                          {notif.timestamp}
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                        {lang === 'hi' ? notif.titleHi : notif.title}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                        {lang === 'hi' ? notif.messageHi : notif.message}
                      </p>
                    </div>
                  </div>

                  {/* Actions right */}
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {notif.actionUrl && (
                      <a
                        href={notif.actionUrl}
                        className="px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 shadow-sm transition-colors"
                      >
                        {lang === 'hi' ? 'देखें' : 'View'}
                      </a>
                    )}
                    <button
                      onClick={() => handleToggleRead(notif.id)}
                      title={notif.isRead ? 'Mark unread' : 'Mark read'}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                      <CheckCheck size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(notif.id)}
                      title="Delete"
                      className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
