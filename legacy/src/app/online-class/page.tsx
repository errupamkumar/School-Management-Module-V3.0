'use client';
import { useState } from 'react';
import {
  Video, Plus, Calendar, Clock, Users, ExternalLink, Copy,
  CheckCircle2, Play, Search, Filter, BookOpen, AlertCircle,
  Laptop, X, Share2
} from 'lucide-react';

interface LiveClass {
  id: string;
  topic: string;
  subject: string;
  className: string;
  teacher: string;
  platform: 'ZOOM' | 'GOOGLE_MEET' | 'MS_TEAMS';
  date: string;
  startTime: string;
  endTime: string;
  joinUrl: string;
  meetingId: string;
  passcode: string;
  status: 'LIVE' | 'UPCOMING' | 'COMPLETED';
  attendeeCount: number;
}

const initialClasses: LiveClass[] = [
  {
    id: '1',
    topic: 'Electromagnetic Induction & Faraday Laws',
    subject: 'Physics',
    className: 'Class 12-A',
    teacher: 'Dr. Rajesh Khanna',
    platform: 'ZOOM',
    date: '2026-09-22',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    joinUrl: 'https://zoom.us/j/98712345678',
    meetingId: '987 1234 5678',
    passcode: 'PHYS2026',
    status: 'LIVE',
    attendeeCount: 38,
  },
  {
    id: '2',
    topic: 'Quadratic Equations & Parabolic Roots',
    subject: 'Mathematics',
    className: 'Class 10-A',
    teacher: 'Sunita Sharma',
    platform: 'GOOGLE_MEET',
    date: '2026-09-22',
    startTime: '11:30 AM',
    endTime: '12:30 PM',
    joinUrl: 'https://meet.google.com/abc-defg-hij',
    meetingId: 'abc-defg-hij',
    passcode: 'None',
    status: 'UPCOMING',
    attendeeCount: 0,
  },
  {
    id: '3',
    topic: 'Shakespearean Sonnets & Metaphor Analysis',
    subject: 'English Literature',
    className: 'Class 11-B',
    teacher: 'Anil Deshmukh',
    platform: 'MS_TEAMS',
    date: '2026-09-22',
    startTime: '02:00 PM',
    endTime: '03:00 PM',
    joinUrl: 'https://teams.microsoft.com/l/meetup-join/123',
    meetingId: 'teams-meet-771',
    passcode: 'LIT2026',
    status: 'UPCOMING',
    attendeeCount: 0,
  },
  {
    id: '4',
    topic: 'Organic Reaction Mechanisms & Aldehydes',
    subject: 'Chemistry',
    className: 'Class 12-B',
    teacher: 'Dr. Meera Nambiar',
    platform: 'ZOOM',
    date: '2026-09-21',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    joinUrl: 'https://zoom.us/rec/play/chem12',
    meetingId: '912 3456 7890',
    passcode: 'CHEM99',
    status: 'COMPLETED',
    attendeeCount: 42,
  },
];

export default function OnlineClassPage() {
  const [classes, setClasses] = useState<LiveClass[]>(initialClasses);
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    topic: '',
    subject: 'Physics',
    className: 'Class 10-A',
    teacher: 'Dr. Rajesh Khanna',
    platform: 'ZOOM' as LiveClass['platform'],
    date: new Date().toISOString().split('T')[0],
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    joinUrl: 'https://zoom.us/j/1234567890',
    meetingId: '123 456 7890',
    passcode: 'PASS123',
  });

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.topic || !formData.joinUrl) return;

    const newClass: LiveClass = {
      id: String(Date.now()),
      topic: formData.topic,
      subject: formData.subject,
      className: formData.className,
      teacher: formData.teacher,
      platform: formData.platform,
      date: formData.date,
      startTime: formData.startTime,
      endTime: formData.endTime,
      joinUrl: formData.joinUrl,
      meetingId: formData.meetingId,
      passcode: formData.passcode,
      status: 'UPCOMING',
      attendeeCount: 0,
    };

    setClasses([newClass, ...classes]);
    setShowScheduleModal(false);
    setFormData({
      topic: '',
      subject: 'Physics',
      className: 'Class 10-A',
      teacher: 'Dr. Rajesh Khanna',
      platform: 'ZOOM',
      date: new Date().toISOString().split('T')[0],
      startTime: '10:00 AM',
      endTime: '11:00 AM',
      joinUrl: 'https://zoom.us/j/1234567890',
      meetingId: '123 456 7890',
      passcode: 'PASS123',
    });
  };

  const filteredClasses = classes.filter(c => {
    if (activeTab !== 'ALL' && c.status !== activeTab) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        c.topic.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q) ||
        c.teacher.toLowerCase().includes(q) ||
        c.className.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-purple-200 text-xs font-semibold uppercase tracking-wider mb-2">
              <Video size={16} />
              <span>Virtual Campus • ऑनलाइन कक्षा</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Live Online Classes & Webinars
            </h1>
            <p className="text-purple-100/90 text-sm mt-1 max-w-xl">
              Conduct interactive digital sessions via Zoom, Google Meet, and Microsoft Teams with automated attendance recording and lesson archiving.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowScheduleModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-2xl text-xs sm:text-sm shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <Plus size={16} />
              <span>Schedule Live Class</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'LIVE', 'UPCOMING', 'COMPLETED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === tab
                  ? tab === 'LIVE' ? 'bg-rose-500 text-white shadow-sm' : 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'LIVE' && <span className="w-2 h-2 rounded-full bg-white animate-pulse" />}
              {tab === 'ALL' ? 'All Classes' : tab === 'LIVE' ? 'Live Now' : tab === 'UPCOMING' ? 'Upcoming' : 'Recordings'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search topic, teacher, subject..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none transition-all"
          />
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredClasses.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative group"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-bold text-xs rounded-xl">
                  {item.subject} • {item.className}
                </span>

                {item.status === 'LIVE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500 text-white text-[11px] font-black rounded-full shadow-sm animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE NOW
                  </span>
                ) : item.status === 'UPCOMING' ? (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-bold rounded-full">
                    Upcoming
                  </span>
                ) : (
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-bold rounded-full">
                    Completed
                  </span>
                )}
              </div>

              {/* Topic Title */}
              <h3 className="font-extrabold text-gray-900 text-base leading-snug line-clamp-2">
                {item.topic}
              </h3>
              <p className="text-xs text-purple-600 font-semibold mt-1">Instructor: {item.teacher}</p>

              {/* Schedule Info */}
              <div className="mt-4 p-3 bg-gray-50 rounded-2xl border border-gray-100 space-y-1.5 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-gray-400" />
                  <span>{item.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-gray-400" />
                  <span>{item.startTime} - {item.endTime}</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-gray-200/60 text-[11px]">
                  <span>Platform: <strong className="text-gray-800">{item.platform}</strong></span>
                  <span>Passcode: <strong className="font-mono text-purple-700">{item.passcode}</strong></span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <button
                onClick={() => handleCopyLink(item.joinUrl, item.id)}
                className="px-3 py-2 text-xs font-bold text-gray-600 hover:text-purple-700 hover:bg-purple-50 rounded-xl transition-colors inline-flex items-center gap-1.5"
              >
                {copiedId === item.id ? <CheckCircle2 size={14} className="text-emerald-600" /> : <Copy size={14} />}
                <span>{copiedId === item.id ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <a
                href={item.joinUrl}
                target="_blank"
                rel="noreferrer"
                className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shadow-sm transition-all transform hover:-translate-y-0.5 ${
                  item.status === 'LIVE'
                    ? 'bg-rose-500 hover:bg-rose-600 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                <Play size={13} fill="currentColor" />
                <span>{item.status === 'LIVE' ? 'Join Now' : item.status === 'COMPLETED' ? 'Watch Rec' : 'Start Session'}</span>
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Video size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Schedule Live Lecture</h3>
                  <p className="text-xs text-gray-400">Broadcast meeting invitation to classroom roster</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 mt-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Lecture Topic / Chapter *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Modern Physics: Photoelectric Effect"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Target Class *</label>
                  <select
                    value={formData.className}
                    onChange={(e) => setFormData({ ...formData, className: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="Class 10-A">Class 10-A</option>
                    <option value="Class 10-B">Class 10-B</option>
                    <option value="Class 12-A">Class 12-A</option>
                    <option value="Class 12-B">Class 12-B</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Subject *</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Video Platform *</label>
                  <select
                    value={formData.platform}
                    onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  >
                    <option value="ZOOM">Zoom Meetings</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                    <option value="MS_TEAMS">Microsoft Teams</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Faculty / Host</label>
                  <input
                    type="text"
                    required
                    value={formData.teacher}
                    onChange={(e) => setFormData({ ...formData, teacher: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Joining Link / URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://zoom.us/j/..."
                  value={formData.joinUrl}
                  onChange={(e) => setFormData({ ...formData, joinUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Start Time</label>
                  <input
                    type="text"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">End Time</label>
                  <input
                    type="text"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-medium outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(false)}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-md transition-all"
                >
                  Publish & Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
