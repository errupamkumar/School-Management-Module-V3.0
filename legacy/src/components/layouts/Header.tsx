'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  Bell,
  Search,
  ChevronDown,
  Settings,
  User,
  Building2,
  MessageSquare,
  Smartphone,
  Sun,
  Moon,
  Globe,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ExternalLink,
  Menu,
} from 'lucide-react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { useLanguage } from '@/components/providers/LanguageProvider';
import { useSidebar } from '@/components/providers/SidebarProvider';
import { useCampus } from '@/components/providers/CampusProvider';
import { cn } from '@/utils/helpers';

export default function Header() {
  const { data: session } = useSession();
  const { isDark, toggleTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const { toggleMobile } = useSidebar();
  const { campuses, selectedCampusId, selectedCampus, setSelectedCampusId, isAllCampuses } = useCampus();
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showCampusSelect, setShowCampusSelect] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const user = session?.user as any;

  // Sample quick notifications for header dropdown
  const sampleNotifications = [
    {
      id: '1',
      title: lang === 'hi' ? 'शुल्क संग्रह अलर्ट' : 'Fee Collection Alert',
      desc: lang === 'hi' ? 'कक्षा 10वीं के 14 छात्रों का शुल्क शेष है।' : '14 students from Class 10th have pending dues.',
      time: '10 min ago',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50',
    },
    {
      id: '2',
      title: lang === 'hi' ? 'परीक्षा समय सारणी' : 'Exam Timetable Published',
      desc: lang === 'hi' ? 'अर्धवार्षिक परीक्षा 2026 की डेटशीट जारी की गई।' : 'Half-yearly examination datesheet released.',
      time: '1 hour ago',
      icon: FileText,
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50',
    },
    {
      id: '3',
      title: lang === 'hi' ? 'स्टाफ उपस्थिति' : 'Staff Attendance Recorded',
      desc: lang === 'hi' ? 'आज 48/52 शिक्षक उपस्थित दर्ज किए गए।' : '48/52 teachers marked present today.',
      time: '3 hours ago',
      icon: CheckCircle2,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50',
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-slate-800 px-3 sm:px-6 py-2.5 shadow-sm transition-colors duration-200">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left section: Hamburger button (mobile) + Search bar */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            type="button"
            onClick={toggleMobile}
            className="lg:hidden p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500/30 flex-shrink-0"
            aria-label="Open navigation menu"
            title="Open navigation menu"
          >
            <Menu size={20} />
          </button>

          {/* Search bar */}
          <div className="relative flex-1 max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg min-w-0">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                user?.role === 'STUDENT'
                  ? (lang === 'hi' ? 'मेरी कक्षाएं, गृहकार्य, सूचनाएं खोजें...' : 'Search my subjects, tasks, circulars...')
                  : user?.role === 'PARENT'
                  ? (lang === 'hi' ? 'परिपत्र, समय सारणी, सूचनाएं खोजें...' : 'Search circulars, timetable, events...')
                  : t('searchPlaceholder', 'Search students, teachers, classes...')
              }
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-slate-800/80 border border-gray-200/80 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 dark:focus:border-purple-500 outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
            />
          </div>
        </div>

        {/* Right section: Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Language Switcher (Hindi / English) */}
          <button
            type="button"
            onClick={toggleLang}
            title={t('switchLanguage')}
            aria-label={t('switchLanguage')}
            className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
          >
            <Globe size={14} className="text-purple-600 dark:text-purple-400 flex-shrink-0" />
            <span className="text-[11px] uppercase tracking-wider font-bold hidden sm:inline">
              {lang === 'en' ? 'हिन्दी' : 'English'}
            </span>
            <span className="text-[10px] uppercase font-bold sm:hidden">
              {lang === 'en' ? 'HI' : 'EN'}
            </span>
          </button>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? t('lightMode') : t('darkMode')}
            title={isDark ? t('lightMode') : t('darkMode')}
            className="p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-amber-50/80 dark:hover:bg-slate-800 rounded-xl transition-all group"
          >
            {isDark ? (
              <Sun size={17} className="text-amber-400 transition-transform group-hover:rotate-45" />
            ) : (
              <Moon size={17} className="text-gray-600 group-hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Download App Button (Visible on xl screens) */}
          <a
            href="#download-apps"
            className="hidden xl:inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-semibold rounded-full shadow-sm hover:shadow hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:-translate-y-0.5"
          >
            <Smartphone size={13} className="text-blue-100" />
            <span>{t('downloadApp', 'Download App')}</span>
          </a>

          {/* Institute / Campus selector (Visible on md+ screens) */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setShowCampusSelect(!showCampusSelect)}
              className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-purple-50 dark:bg-purple-950/40 border border-purple-100/80 dark:border-purple-800/50 rounded-xl hover:bg-purple-100/60 dark:hover:bg-purple-900/40 transition-colors shadow-sm"
              aria-label="Select Campus"
            >
              <div className="w-5 h-5 rounded-md bg-purple-600 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                <Building2 size={12} />
              </div>
              <span className="text-xs font-semibold text-purple-900 dark:text-purple-200 hidden md:inline truncate max-w-[140px] lg:max-w-none">
                {selectedCampus?.name || (isAllCampuses ? (lang === 'hi' ? 'सभी परिसर (समग्र)' : 'All Campuses') : (user?.campusName || 'Vidyalaya Campus'))}
              </span>
              <ChevronDown size={13} className={cn('text-purple-600 dark:text-purple-400 flex-shrink-0 transition-transform', showCampusSelect && 'rotate-180')} />
            </button>

            {showCampusSelect && (
              <div className="absolute right-0 top-full mt-2 w-64 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3.5 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">{t('selectInstitute', 'Select Campus')}</p>
                  <span className="text-[10px] font-medium text-purple-600 bg-purple-50 dark:bg-purple-950 px-2 py-0.5 rounded-full">{campuses.length} Campuses</span>
                </div>

                {/* All Campuses option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCampusId('ALL');
                    setShowCampusSelect(false);
                  }}
                  className={cn(
                    'w-full text-left px-3.5 py-2.5 text-xs font-medium flex items-center justify-between transition-colors',
                    isAllCampuses
                      ? 'bg-purple-50/80 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                  )}
                >
                  <div className="truncate">
                    <p className="truncate">{lang === 'hi' ? 'सभी परिसर (समग्र दृश्य)' : 'All Campuses (Consolidated)'}</p>
                    <p className="text-[10px] text-gray-400 font-normal">View consolidated multi-campus records</p>
                  </div>
                  {isAllCampuses && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 ml-2" />}
                </button>

                {/* Individual Campuses */}
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-50 dark:divide-slate-800/60">
                  {campuses.map((campus) => {
                    const isSelected = selectedCampusId === campus.id;
                    return (
                      <button
                        key={campus.id}
                        type="button"
                        onClick={() => {
                          setSelectedCampusId(campus.id);
                          setShowCampusSelect(false);
                        }}
                        className={cn(
                          'w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors',
                          isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                        )}
                      >
                        <div className="truncate pr-2">
                          <p className="truncate font-semibold">{campus.name}</p>
                          <p className="text-[10px] text-gray-400">{campus.city}, {campus.state}</p>
                        </div>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0 ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Chat / Messages Button (Direct Link to /chat) */}
          <Link
            href="/chat"
            title={t('chat', 'Messages & Chat')}
            aria-label={t('chat', 'Messages & Chat')}
            className="relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <MessageSquare size={17} />
            <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </Link>

          {/* Notifications Dropdown Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title={t('notifications', 'Notifications')}
              aria-label={t('notifications', 'Notifications')}
              className="relative p-1.5 sm:p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Bell size={17} />
              <span className="absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 md:w-96 max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-4 py-2 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{t('notifications', 'Notifications')}</p>
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[10px] font-extrabold">3 New</span>
                  </div>
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                  >
                    {t('viewAll', 'View All')}
                  </Link>
                </div>

                <div className="divide-y divide-gray-50 dark:divide-slate-800/80 max-h-72 overflow-y-auto touch-scroll">
                  {sampleNotifications.map((notif) => {
                    const Icon = notif.icon;
                    return (
                      <div key={notif.id} className="p-3 hover:bg-gray-50/80 dark:hover:bg-slate-800/60 transition-colors flex gap-3">
                        <div className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5', notif.color)}>
                          <Icon size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">{notif.title}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-0.5">{notif.desc}</p>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 inline-block">{notif.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-2 border-t border-gray-100 dark:border-slate-800 text-center">
                  <Link
                    href="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="inline-flex items-center justify-center gap-1 w-full py-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
                  >
                    <span>{lang === 'hi' ? 'सभी सूचनाएं एवं अलर्ट खोलें' : 'Open Notifications Center'}</span>
                    <ExternalLink size={12} />
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfile(!showProfile)}
              className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-xl transition-colors"
              aria-label="User Profile Menu"
            >
              <div className="relative">
                <div className="w-8 h-8 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                  <span className="text-white text-xs font-bold">{user?.name?.[0]?.toUpperCase() || 'A'}</span>
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-none">{user?.name || (lang === 'hi' ? 'प्रशासक' : 'Administrator')}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{user?.role?.replace('_', ' ') || 'Super Admin'}</p>
              </div>
              <ChevronDown size={13} className="text-gray-400 dark:text-gray-500 hidden lg:block" />
            </button>

            {showProfile && (
              <div className="absolute right-0 top-full mt-2 w-48 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-gray-100 dark:border-slate-800 py-1 z-50">
                <Link
                  href="/settings/profile"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  <User size={14} /> {t('myProfile', 'My Profile')}
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setShowProfile(false)}
                  className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-purple-50 dark:hover:bg-slate-800 hover:text-purple-700 dark:hover:text-purple-300"
                >
                  <Settings size={14} /> {t('settingsAndRoles', 'Settings & Roles')}
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
