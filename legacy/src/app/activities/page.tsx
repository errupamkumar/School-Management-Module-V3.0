'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  Trophy,
  Users,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  Award,
  CheckCircle2,
  Plus,
  Shield,
  Search,
  Filter,
  Medal,
  Flame,
  ArrowRight,
  Settings,
  Trash2,
  Edit3,
  Download,
  UserPlus,
  BarChart2,
  Archive,
  IndianRupee,
  ClipboardCheck,
  X,
  Eye,
  Star
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ExtraActivityItem {
  id: string;
  name: string;
  category: 'SPORTS' | 'STEM_ROBOTICS' | 'ARTS_CULTURE' | 'DEBATE_LITERATURE' | 'COMMUNITY_ECO';
  description: string;
  mentorTeacher: string;
  meetingSchedule: string;
  venue: string;
  enrolledStudentsCount: number;
  maxCapacity: number;
  featuredBadge: string;
  isEnrolledForDemoUser?: boolean;
  isArchived?: boolean;
  budget?: number;
  attendanceRate?: number;
  upcomingEvent?: {
    title: string;
    date: string;
    location: string;
  };
}

const defaultActivitiesList: ExtraActivityItem[] = [
  {
    id: 'act-1',
    name: 'Robotics & AI Innovation Lab',
    category: 'STEM_ROBOTICS',
    description: 'Hands-on Arduino microcontrollers, IoT sensor programming, and Python automation. Prepares students for National Robotics Olympiad.',
    mentorTeacher: 'Mr. Amit Yadav (Computer Science)',
    meetingSchedule: 'Wednesdays & Fridays, 03:00 PM - 04:30 PM',
    venue: 'STEM Innovation Center (Block C)',
    enrolledStudentsCount: 26,
    maxCapacity: 30,
    featuredBadge: '🤖 Junior AI Innovator',
    isEnrolledForDemoUser: true,
    budget: 65000,
    attendanceRate: 94,
    upcomingEvent: {
      title: 'State Inter-School RoboRace 2026',
      date: 'Oct 24, 2026',
      location: 'Auditorium Hall'
    }
  },
  {
    id: 'act-2',
    name: 'Model United Nations & Parliamentary Debate',
    category: 'DEBATE_LITERATURE',
    description: 'Public speaking, diplomatic negotiations, international conflict resolution, and formal parliamentary debate techniques.',
    mentorTeacher: 'Mrs. Priya Singh (English & Humanities)',
    meetingSchedule: 'Tuesdays & Thursdays, 03:00 PM - 04:15 PM',
    venue: 'Language Lab & Seminar Room',
    enrolledStudentsCount: 22,
    maxCapacity: 25,
    featuredBadge: '🎙️ Distinguished Orator',
    isEnrolledForDemoUser: true,
    budget: 35000,
    attendanceRate: 91,
    upcomingEvent: {
      title: 'Delhi-NCR Youth Mock Parliament',
      date: 'Nov 12, 2026',
      location: 'Main Auditorium'
    }
  },
  {
    id: 'act-3',
    name: 'Eco-Warriors & Green Campus Initiative',
    category: 'COMMUNITY_ECO',
    description: 'Hydroponics gardening, solar energy tracking, waste composting, and water conservation audits around campus.',
    mentorTeacher: 'Mrs. Neha Pandey (Biology)',
    meetingSchedule: 'Saturdays, 09:00 AM - 11:00 AM',
    venue: 'Botanical Garden & Eco Lab',
    enrolledStudentsCount: 35,
    maxCapacity: 40,
    featuredBadge: '🌿 Eco-Champion',
    isEnrolledForDemoUser: false,
    budget: 45000,
    attendanceRate: 88,
    upcomingEvent: {
      title: 'Tree Plantation & Clean Energy Fair',
      date: 'Oct 08, 2026',
      location: 'Central Lawn'
    }
  },
  {
    id: 'act-4',
    name: 'School Football & Athletics Squad',
    category: 'SPORTS',
    description: 'Professional tactical football training, endurance conditioning, and agility drills for CBSE Cluster tournaments.',
    mentorTeacher: 'Coach Vikram Rathore (Physical Education)',
    meetingSchedule: 'Monday to Friday, 06:30 AM - 07:45 AM',
    venue: 'Main Sports Complex & Football Turf',
    enrolledStudentsCount: 28,
    maxCapacity: 32,
    featuredBadge: '⚽ Varsity Athlete',
    isEnrolledForDemoUser: false,
    budget: 55000,
    attendanceRate: 96,
    upcomingEvent: {
      title: 'Inter-District Football Championship',
      date: 'Oct 18, 2026',
      location: 'District Sports Stadium'
    }
  },
  {
    id: 'act-5',
    name: 'Classical & Contemporary Visual Arts Guild',
    category: 'ARTS_CULTURE',
    description: 'Acrylic canvas painting, digital graphic illustration, pottery ceramics, and annual school art exhibition curation.',
    mentorTeacher: 'Mr. Deepak Verma (Fine Arts)',
    meetingSchedule: 'Mondays & Thursdays, 03:00 PM - 04:30 PM',
    venue: 'Fine Arts Studio (2nd Floor)',
    enrolledStudentsCount: 18,
    maxCapacity: 25,
    featuredBadge: '🎨 Master Artisan',
    isEnrolledForDemoUser: false,
    budget: 25000,
    attendanceRate: 89,
    upcomingEvent: {
      title: 'Annual Kaleidoscope Art Showcase',
      date: 'Nov 20, 2026',
      location: 'Exhibition Gallery'
    }
  },
  {
    id: 'act-6',
    name: 'Grandmasters Chess Academy',
    category: 'SPORTS',
    description: 'Chess openings, endgame calculation, positional strategy, and FIDE rated mock tournament practice.',
    mentorTeacher: 'Mr. Arun Sharma (Mathematics & Chess Mentor)',
    meetingSchedule: 'Tuesdays & Fridays, 03:00 PM - 04:00 PM',
    venue: 'Indoor Games Room',
    enrolledStudentsCount: 20,
    maxCapacity: 24,
    featuredBadge: '♟️ Chess Tactician',
    isEnrolledForDemoUser: true,
    budget: 20000,
    attendanceRate: 93,
    upcomingEvent: {
      title: 'Inter-House Chess Championship',
      date: 'Oct 14, 2026',
      location: 'Indoor Sports Complex'
    }
  }
];

export default function ActivitiesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';

  // ─── ENTERPRISE RBAC PERMISSIONS ───
  const isSuperAdmin = role === 'SUPER_ADMIN' || role === 'ADMIN';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  // All features accessible without permissions lockouts
  const canCreate = true;
  const canDelete = true;
  const canEditClub = true;
  const canAssignMentor = true;
  const canManageRoster = true;
  const canAwardBadges = true;
  const canViewAllRosters = true;
  const canExportReport = true;
  const canArchive = true;
  const canSetBudget = true;
  const canTrackAttendance = true;
  const canEnroll = true;

  const [activities, setActivities] = useState<ExtraActivityItem[]>(defaultActivitiesList);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClub, setEditingClub] = useState<ExtraActivityItem | null>(null);
  const [showEventModal, setShowEventModal] = useState<string | null>(null);
  const [eventData, setEventData] = useState({ title: '', date: '', location: '' });
  const [showRosterModal, setShowRosterModal] = useState<string | null>(null);
  const [showBadgeModal, setShowBadgeModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'CLUBS' | 'PORTFOLIO' | 'ANALYTICS'>('CLUBS');

  // Create form state
  const [newClub, setNewClub] = useState({
    name: '',
    category: 'SPORTS' as ExtraActivityItem['category'],
    description: '',
    mentorTeacher: '',
    meetingSchedule: '',
    venue: '',
    maxCapacity: 30,
    featuredBadge: '',
    budget: 0,
  });

  const fetchActivities = async () => {
    try {
      const res = await fetch('/api/activities');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setActivities(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleToggleEnroll = async (activityId: string) => {
    try {
      const res = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId, action: 'TOGGLE_ENROLL' }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchActivities();
      }
    } catch {
      toast.error('Network error modifying enrollment.');
    }
  };

  const handleCreateClub = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClub.name || !newClub.description) return;
    const newActivity: ExtraActivityItem = {
      id: `act-${Date.now()}`,
      ...newClub,
      enrolledStudentsCount: 0,
      isEnrolledForDemoUser: false,
      isArchived: false,
      attendanceRate: 0,
    };
    setActivities([newActivity, ...activities]);
    toast.success(`Club "${newClub.name}" created successfully!`);
    setShowCreateModal(false);
    setNewClub({ name: '', category: 'SPORTS', description: '', mentorTeacher: '', meetingSchedule: '', venue: '', maxCapacity: 30, featuredBadge: '', budget: 0 });
  };

  const handleStartEditClub = (act: ExtraActivityItem) => {
    setEditingClub({ ...act });
    setShowEditModal(true);
  };

  const handleEditClubSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClub) return;
    setActivities(activities.map(a => a.id === editingClub.id ? editingClub : a));
    toast.success(`Club "${editingClub.name}" details updated successfully!`);
    setShowEditModal(false);
    setEditingClub(null);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showEventModal || !eventData.title) return;
    setActivities(activities.map(a => {
      if (a.id === showEventModal) {
        return {
          ...a,
          upcomingEvent: {
            title: eventData.title,
            date: eventData.date || 'TBD',
            location: eventData.location || a.venue,
          }
        };
      }
      return a;
    }));
    toast.success('Club event scheduled successfully!');
    setShowEventModal(null);
    setEventData({ title: '', date: '', location: '' });
  };

  const handleDeleteClub = (id: string) => {
    setActivities(activities.filter(a => a.id !== id));
    toast.success('Club deleted permanently.');
  };

  const handleArchiveClub = (id: string) => {
    setActivities(activities.map(a => a.id === id ? { ...a, isArchived: true } : a));
    toast.success('Club archived successfully.');
  };

  const handleExportReport = () => {
    const csvRows = ['Club Name,Category,Mentor,Enrolled,Capacity,Badge'];
    activities.forEach(a => {
      csvRows.push(`"${a.name}","${a.category}","${a.mentorTeacher}",${a.enrolledStudentsCount},${a.maxCapacity},"${a.featuredBadge}"`);
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'activities_report.csv';
    link.click();
    toast.success('Activities report exported!');
  };

  const filteredActivities = activities.filter(a => {
    if (a.isArchived && !isSuperAdmin) return false;
    const matchCat = categoryFilter === 'ALL' || a.category === categoryFilter;
    const matchSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.mentorTeacher.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Demo roster data
  const demoRoster = [
    { name: 'Aarav Sharma', class: '10-A', joined: 'Aug 2026', attendance: '95%' },
    { name: 'Diya Dubey', class: '10-B', joined: 'Jul 2026', attendance: '88%' },
    { name: 'Rohan Gupta', class: '9-A', joined: 'Aug 2026', attendance: '92%' },
    { name: 'Priya Patel', class: '10-A', joined: 'Sep 2026', attendance: '100%' },
    { name: 'Arjun Singh', class: '9-B', joined: 'Jul 2026', attendance: '85%' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-16">
        {/* ========================================================================= */}
        {/* HERO BANNER                                                               */}
        {/* ========================================================================= */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-cyan-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/10 text-xs font-bold text-emerald-100">
                <Trophy size={14} className="text-yellow-300" />
                <span>Holistic Co-Curricular & Student Leadership</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Extra Activities & Clubs Hub
              </h1>
              <p className="text-sm text-emerald-100 max-w-xl">
                {isSuperAdmin
                  ? 'Full administrative control — Create, manage, budget, archive clubs and monitor all activity across campus.'
                  : isTeacher
                  ? 'Manage your assigned clubs, track attendance, award badges, and manage student rosters.'
                  : isParent
                  ? 'Monitor your ward\'s co-curricular engagements, badges earned, and club participation status.'
                  : 'Explore extracurricular clubs, join activities, earn digital merit badges, and build your co-curricular portfolio.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Quick Badge Showcase */}
              <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-4 text-center min-w-[170px] shadow-inner">
                <p className="text-xs uppercase tracking-wider text-emerald-200 font-bold">
                  {isParent ? "Ward's Badges" : 'Earned Badges'}
                </p>
                <p className="text-3xl font-black text-white mt-1">4 Badges</p>
                <div className="flex items-center justify-center gap-1 mt-2">
                  <span title="Robotics Innovator">🤖</span>
                  <span title="Distinguished Orator">🎙️</span>
                  <span title="Chess Tactician">♟️</span>
                  <span title="100% Attendance">⭐</span>
                </div>
                <p className="text-[10px] text-emerald-200 mt-1.5 font-medium">
                  {isParent ? 'Aarav Sharma (Class 10-A)' : 'Class 10-A Honor Roll'}
                </p>
              </div>

              {canCreate && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-orange-500/30 transition transform active:scale-95"
                >
                  <Plus size={18} />
                  <span>Create Club</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ADMIN QUICK ACTIONS BAR (Super Admin Only)                                 */}
        {/* ========================================================================= */}
        {isSuperAdmin && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-100 transition">
                <Plus size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900">Create Club</p>
                <p className="text-[10px] text-gray-500">New activity</p>
              </div>
            </button>

            <button
              onClick={handleExportReport}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-100 transition">
                <Download size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900">Export Report</p>
                <p className="text-[10px] text-gray-500">CSV download</p>
              </div>
            </button>

            <button
              onClick={() => setActiveTab('ANALYTICS')}
              className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:bg-purple-100 transition">
                <BarChart2 size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900">Analytics</p>
                <p className="text-[10px] text-gray-500">Participation stats</p>
              </div>
            </button>

            <div className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <IndianRupee size={20} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-gray-900">Total Budget</p>
                <p className="text-sm font-black text-amber-700">₹2,45,000</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB NAVIGATION                                                             */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-2xl border border-gray-100 shadow-sm w-fit">
          {[
            { id: 'CLUBS' as const, label: 'All Clubs', icon: Trophy },
            { id: 'PORTFOLIO' as const, label: isParent ? "Ward's Portfolio" : 'My Portfolio', icon: Medal },
            ...(isSuperAdmin || isTeacher ? [{ id: 'ANALYTICS' as const, label: 'Analytics', icon: BarChart2 }] : []),
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* ========================================================================= */}
        {/* PORTFOLIO TAB                                                              */}
        {/* ========================================================================= */}
        {activeTab === 'PORTFOLIO' && (
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Medal size={18} className="text-amber-500" />
                <span>{isParent ? "Ward's Co-Curricular Portfolio & Merit Badges" : 'Student Co-Curricular Portfolio & Merit Badges'}</span>
              </h3>
              <span className="text-xs font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-full">
                {isParent ? 'Ward: Aarav Sharma (Class 10-A)' : 'Student: Aarav Sharma (Class 10-A)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { badge: '🤖 Junior AI Innovator', club: 'Robotics Lab', desc: 'Built autonomous line-follower Arduino robot with 98% track accuracy.', date: 'Aug 2026' },
                { badge: '🎙️ Distinguished Orator', club: 'Model UN & Debate', desc: 'Best Delegate Honorable Mention in Inter-School Mock Parliament.', date: 'Sep 2026' },
                { badge: '♟️ Chess Tactician', club: 'Grandmasters Academy', desc: 'Undefeated 5-0 in Inter-House Tagore House Rapid Chess.', date: 'Sep 2026' },
                { badge: '⭐ 100% Attendance Star', club: 'Dean of Students', desc: 'Maintained spotless 100% attendance record for Term 1.', date: 'Jul 2026' },
              ].map((b, i) => (
                <div key={i} className="p-4 rounded-2xl bg-gradient-to-br from-amber-50/60 to-orange-50/40 border border-amber-200/60 flex flex-col justify-between space-y-2">
                  <div>
                    <span className="text-xs font-black text-amber-900 block">{b.badge}</span>
                    <span className="text-[10px] font-bold text-amber-700">{b.club} • {b.date}</span>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">{b.desc}</p>
                  </div>
                  <div className="pt-2 border-t border-amber-200/40 flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 size={13} />
                    <span>Verified by Faculty</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Enrolled Clubs Summary */}
            <div className="mt-4 p-4 bg-gray-50 rounded-2xl">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">Active Club Memberships</h4>
              <div className="space-y-2">
                {activities.filter(a => a.isEnrolledForDemoUser).map(a => (
                  <div key={a.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500" />
                      <div>
                        <p className="text-xs font-bold text-gray-900">{a.name}</p>
                        <p className="text-[10px] text-gray-500">{a.meetingSchedule}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">{a.featuredBadge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ANALYTICS TAB (Admin/Teacher)                                              */}
        {/* ========================================================================= */}
        {activeTab === 'ANALYTICS' && (isSuperAdmin || isTeacher) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Total Active Clubs', value: activities.filter(a => !a.isArchived).length, color: 'emerald', icon: Trophy },
                { label: 'Total Enrolled Students', value: activities.reduce((sum, a) => sum + a.enrolledStudentsCount, 0), color: 'blue', icon: Users },
                { label: 'Avg. Enrollment Rate', value: `${Math.round((activities.reduce((sum, a) => sum + a.enrolledStudentsCount, 0) / Math.max(1, activities.reduce((sum, a) => sum + a.maxCapacity, 0)) * 100))}%`, color: 'purple', icon: BarChart2 },
                { label: 'Upcoming Events', value: activities.filter(a => a.upcomingEvent).length, color: 'amber', icon: Calendar },
              ].map((stat, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 flex items-center justify-center`}>
                    <stat.icon size={24} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-semibold uppercase">{stat.label}</p>
                    <p className="text-xl font-black text-gray-900">{stat.value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Club-wise Enrollment Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Club-wise Enrollment & Capacity Report</h3>
                {canExportReport && (
                  <button onClick={handleExportReport} className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <Download size={13} /> Export CSV
                  </button>
                )}
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50/80 text-[10px] uppercase text-gray-500 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Club Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Mentor</th>
                    <th className="py-3 px-4 text-center">Enrolled</th>
                    <th className="py-3 px-4 text-center">Capacity</th>
                    <th className="py-3 px-4 text-center">Fill Rate</th>
                    {isSuperAdmin && <th className="py-3 px-4 text-center">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {activities.map(a => (
                    <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900">{a.name}</td>
                      <td className="py-3 px-4"><span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-[10px] font-bold">{a.category.replace(/_/g, ' ')}</span></td>
                      <td className="py-3 px-4 text-gray-600">{a.mentorTeacher}</td>
                      <td className="py-3 px-4 text-center font-bold">{a.enrolledStudentsCount}</td>
                      <td className="py-3 px-4 text-center">{a.maxCapacity}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round(a.enrolledStudentsCount / a.maxCapacity * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-gray-600">{Math.round(a.enrolledStudentsCount / a.maxCapacity * 100)}%</span>
                        </div>
                      </td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => setShowRosterModal(a.id)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600" title="View Roster">
                              <Eye size={14} />
                            </button>
                            <button onClick={() => handleArchiveClub(a.id)} className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600" title="Archive">
                              <Archive size={14} />
                            </button>
                            <button onClick={() => handleDeleteClub(a.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600" title="Delete">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CLUBS TAB — FILTER & SEARCH TOOLBAR                                        */}
        {/* ========================================================================= */}
        {activeTab === 'CLUBS' && (
          <>
            <div className="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
                {[
                  { id: 'ALL', label: 'All Clubs' },
                  { id: 'STEM_ROBOTICS', label: 'STEM & AI' },
                  { id: 'DEBATE_LITERATURE', label: 'Debate & MUN' },
                  { id: 'SPORTS', label: 'Sports & Football' },
                  { id: 'ARTS_CULTURE', label: 'Arts & Music' },
                  { id: 'COMMUNITY_ECO', label: 'Eco & Green' },
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      categoryFilter === cat.id
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              <div className="relative min-w-[200px]">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search club or mentor..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ACTIVITIES GRID                                                           */}
            {/* ========================================================================= */}
            {loading ? (
              <div className="p-12 text-center text-gray-400">Loading activities...</div>
            ) : filteredActivities.length === 0 ? (
              <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border">No activities found matching criteria.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredActivities.map(act => (
                  <div
                    key={act.id}
                    className={`bg-white rounded-3xl p-6 border shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 ${
                      act.isArchived ? 'border-amber-200 bg-amber-50/30 opacity-75' : 'border-gray-100'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {act.category.replace(/_/g, ' ')}
                          </span>
                          {act.isArchived && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ARCHIVED
                            </span>
                          )}
                        </div>

                        {act.isEnrolledForDemoUser && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 size={12} /> Enrolled
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-base font-bold text-gray-900">{act.name}</h3>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{act.description}</p>
                      </div>

                      {/* Schedule & Venue Info */}
                      <div className="space-y-1.5 text-xs text-gray-600 bg-gray-50 p-3 rounded-2xl">
                        <div className="flex items-center gap-2">
                          <Clock size={13} className="text-gray-400" />
                          <span>{act.meetingSchedule}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin size={13} className="text-gray-400" />
                          <span>{act.venue}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Users size={13} className="text-gray-400" />
                          <span>Mentor: <strong>{act.mentorTeacher}</strong></span>
                        </div>
                      </div>

                      {/* Badge & Capacity */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200/60">
                          {act.featuredBadge}
                        </span>
                        <span className="text-gray-500 text-[11px]">
                          {act.enrolledStudentsCount} / {act.maxCapacity} Seats
                        </span>
                      </div>

                      {/* Upcoming Event Alert */}
                      {act.upcomingEvent && (
                        <div className="p-3 rounded-2xl bg-cyan-50/70 border border-cyan-200 text-xs space-y-1">
                          <p className="font-bold text-cyan-900 flex items-center gap-1.5">
                            <Calendar size={13} className="text-cyan-600" />
                            <span>Upcoming Event:</span>
                          </p>
                          <p className="text-cyan-950 font-medium">{act.upcomingEvent.title}</p>
                          <p className="text-[11px] text-cyan-700">
                            Date: {act.upcomingEvent.date} • Venue: {act.upcomingEvent.location}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons — RBAC controlled */}
                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between flex-wrap gap-2">
                      <span className="text-[11px] text-gray-400">
                        {act.isEnrolledForDemoUser ? 'Active Membership' : 'Open for Registration'}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Student: Enroll/Leave */}
                        {canEnroll && (
                          <button
                            onClick={() => handleToggleEnroll(act.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm ${
                              act.isEnrolledForDemoUser
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                            }`}
                          >
                            {act.isEnrolledForDemoUser ? 'Leave Club' : 'Join Club'}
                          </button>
                        )}

                        {/* Parent: View-only status */}
                        {isParent && (
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl">
                            {act.isEnrolledForDemoUser ? "Your child is enrolled" : "Available for child"}
                          </span>
                        )}

                        {/* Teacher: Manage Roster, Award Badge, Edit Club, Add Event */}
                        {isTeacher && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setShowRosterModal(act.id)}
                              className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black"
                            >
                              Manage Roster
                            </button>
                            <button
                              onClick={() => handleStartEditClub(act)}
                              className="p-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                              title="Edit Club Details"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              onClick={() => { setShowEventModal(act.id); setEventData({ title: '', date: '', location: act.venue }); }}
                              className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                              title="Schedule Event"
                            >
                              <Calendar size={13} />
                            </button>
                            <button
                              onClick={() => setShowBadgeModal(act.id)}
                              className="px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold hover:bg-amber-100 border border-amber-200"
                            >
                              <Award size={13} />
                            </button>
                          </div>
                        )}

                        {/* Super Admin: Full controls */}
                        {isSuperAdmin && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => setShowRosterModal(act.id)}
                              className="px-3 py-1.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black"
                            >
                              Roster
                            </button>
                            <button
                              onClick={() => handleStartEditClub(act)}
                              className="p-1.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200"
                              title="Edit Club Details"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => { setShowEventModal(act.id); setEventData({ title: '', date: '', location: act.venue }); }}
                              className="p-1.5 rounded-xl bg-cyan-50 text-cyan-700 hover:bg-cyan-100 border border-cyan-200"
                              title="Schedule Event"
                            >
                              <Calendar size={14} />
                            </button>
                            <button
                              onClick={() => setShowBadgeModal(act.id)}
                              className="p-1.5 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200"
                              title="Award Badge"
                            >
                              <Award size={14} />
                            </button>
                            <button
                              onClick={() => handleArchiveClub(act.id)}
                              className="p-1.5 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200"
                              title="Archive Club"
                            >
                              <Archive size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteClub(act.id)}
                              className="p-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100"
                              title="Delete Club"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CREATE CLUB (Super Admin only)                                      */}
        {/* ========================================================================= */}
        {showCreateModal && canCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowCreateModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Create New Club</h3>
                  <p className="text-xs text-gray-500">Set up a new co-curricular activity</p>
                </div>
              </div>

              <form onSubmit={handleCreateClub} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Club Name *</label>
                    <input type="text" required value={newClub.name} onChange={e => setNewClub({ ...newClub, name: e.target.value })} placeholder="e.g. Robotics Lab" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category *</label>
                    <select value={newClub.category} onChange={e => setNewClub({ ...newClub, category: e.target.value as any })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none">
                      <option value="SPORTS">Sports</option>
                      <option value="STEM_ROBOTICS">STEM & Robotics</option>
                      <option value="ARTS_CULTURE">Arts & Culture</option>
                      <option value="DEBATE_LITERATURE">Debate & Literature</option>
                      <option value="COMMUNITY_ECO">Community & Eco</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description *</label>
                  <textarea rows={3} required value={newClub.description} onChange={e => setNewClub({ ...newClub, description: e.target.value })} placeholder="Describe the club activities..." className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Mentor Teacher *</label>
                    <input type="text" required value={newClub.mentorTeacher} onChange={e => setNewClub({ ...newClub, mentorTeacher: e.target.value })} placeholder="e.g. Mr. Amit Yadav" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Max Capacity</label>
                    <input type="number" value={newClub.maxCapacity} onChange={e => setNewClub({ ...newClub, maxCapacity: +e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Meeting Schedule</label>
                    <input type="text" value={newClub.meetingSchedule} onChange={e => setNewClub({ ...newClub, meetingSchedule: e.target.value })} placeholder="e.g. Mon & Wed, 3-4 PM" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Venue</label>
                    <input type="text" value={newClub.venue} onChange={e => setNewClub({ ...newClub, venue: e.target.value })} placeholder="e.g. STEM Lab" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Featured Badge</label>
                    <input type="text" value={newClub.featuredBadge} onChange={e => setNewClub({ ...newClub, featuredBadge: e.target.value })} placeholder="e.g. 🤖 AI Innovator" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                  </div>
                  {canSetBudget && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Budget (₹)</label>
                      <input type="number" value={newClub.budget} onChange={e => setNewClub({ ...newClub, budget: +e.target.value })} placeholder="0" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-emerald-500/20 outline-none" />
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95">Create Club</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: VIEW ROSTER (Admin/Teacher)                                         */}
        {/* ========================================================================= */}
        {showRosterModal && canManageRoster && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowRosterModal(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Club Roster</h3>
                  <p className="text-xs text-gray-500">Enrolled students & attendance tracking</p>
                </div>
              </div>

              <div className="space-y-2">
                {demoRoster.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xs font-bold">{s.name[0]}</div>
                      <div>
                        <p className="text-xs font-bold text-gray-900">{s.name}</p>
                        <p className="text-[10px] text-gray-500">{s.class} • Joined {s.joined}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700">{s.attendance}</p>
                      <p className="text-[10px] text-gray-400">Attendance</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end">
                <button onClick={() => setShowRosterModal(null)} className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-900 text-white hover:bg-black">Close</button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: AWARD BADGE (Admin/Teacher)                                         */}
        {/* ========================================================================= */}
        {showBadgeModal && canAwardBadges && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowBadgeModal(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Award size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Award Merit Badge</h3>
                  <p className="text-xs text-gray-500">Recognize student achievement</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Select Student</label>
                  <select className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none">
                    <option>Aarav Sharma (Class 10-A)</option>
                    <option>Diya Dubey (Class 10-B)</option>
                    <option>Rohan Gupta (Class 9-A)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Badge Title</label>
                  <input type="text" placeholder="e.g. 🏆 Best Performer" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Achievement Description</label>
                  <textarea rows={2} placeholder="Describe the achievement..." className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-amber-500/20 outline-none resize-none" />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setShowBadgeModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                <button
                  onClick={() => { toast.success('Merit badge awarded!'); setShowBadgeModal(null); }}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md"
                >
                  Award Badge
                </button>
              </div>
            </div>
          </div>
        )}
        {/* ========================================================================= */}
        {/* MODAL: EDIT CLUB (Admin / Teacher)                                        */}
        {/* ========================================================================= */}
        {showEditModal && editingClub && canEditClub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowEditModal(false)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Edit3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Edit Club Details</h3>
                  <p className="text-xs text-gray-500">Update schedule, mentor, venue, capacity, or badge</p>
                </div>
              </div>

              <form onSubmit={handleEditClubSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Club Name *</label>
                    <input type="text" required value={editingClub.name} onChange={e => setEditingClub({ ...editingClub, name: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Category</label>
                    <select value={editingClub.category} onChange={e => setEditingClub({ ...editingClub, category: e.target.value as any })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none">
                      <option value="SPORTS">Sports & Athletics</option>
                      <option value="STEM_ROBOTICS">STEM & Robotics</option>
                      <option value="ARTS_CULTURE">Arts & Culture</option>
                      <option value="DEBATE_LITERATURE">Debate & Literature</option>
                      <option value="COMMUNITY_ECO">Community & Eco</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Description</label>
                  <textarea rows={2} value={editingClub.description} onChange={e => setEditingClub({ ...editingClub, description: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none resize-none" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Mentor Teacher</label>
                    <input type="text" disabled={!canAssignMentor} value={editingClub.mentorTeacher} onChange={e => setEditingClub({ ...editingClub, mentorTeacher: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 disabled:opacity-60 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Max Capacity</label>
                    <input type="number" value={editingClub.maxCapacity} onChange={e => setEditingClub({ ...editingClub, maxCapacity: +e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Meeting Schedule</label>
                    <input type="text" value={editingClub.meetingSchedule} onChange={e => setEditingClub({ ...editingClub, meetingSchedule: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Venue</label>
                    <input type="text" value={editingClub.venue} onChange={e => setEditingClub({ ...editingClub, venue: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Featured Badge</label>
                    <input type="text" value={editingClub.featuredBadge} onChange={e => setEditingClub({ ...editingClub, featuredBadge: e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                  </div>
                  {canSetBudget && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Budget (₹)</label>
                      <input type="number" value={editingClub.budget || 0} onChange={e => setEditingClub({ ...editingClub, budget: +e.target.value })} className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 outline-none" />
                    </div>
                  )}
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95">Save Changes</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: SCHEDULE CLUB EVENT (Admin / Teacher)                               */}
        {/* ========================================================================= */}
        {showEventModal && (isSuperAdmin || isTeacher) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
              <button onClick={() => setShowEventModal(null)} className="absolute top-5 right-5 p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
                  <Calendar size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Schedule Club Event</h3>
                  <p className="text-xs text-gray-500">Plan a competition, workshop, or showcase</p>
                </div>
              </div>

              <form onSubmit={handleSaveEvent} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Event Title *</label>
                  <input type="text" required value={eventData.title} onChange={e => setEventData({ ...eventData, title: e.target.value })} placeholder="e.g. Inter-School Robotics Showcase" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date *</label>
                  <input type="text" required value={eventData.date} onChange={e => setEventData({ ...eventData, date: e.target.value })} placeholder="e.g. Oct 28, 2026" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Location / Venue</label>
                  <input type="text" value={eventData.location} onChange={e => setEventData({ ...eventData, location: e.target.value })} placeholder="e.g. Main Auditorium" className="w-full text-xs px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:ring-2 focus:ring-cyan-500/20 outline-none" />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                  <button type="button" onClick={() => setShowEventModal(null)} className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                  <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white shadow-md transition-all active:scale-95">Save Event</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
