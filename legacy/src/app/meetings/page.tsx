'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import {
  CalendarCheck,
  Plus,
  Video,
  Building2,
  Clock,
  User,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Lock,
  MessageSquare,
  X,
  Sparkles,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
  Search,
  Filter,
  Download,
  Settings,
  Users,
  Phone,
  Bell,
  Shield,
  Check,
  ListChecks,
  ArrowRight,
  Share2,
  RotateCcw,
  BookOpen,
  Award,
  Layers,
  HelpCircle,
  CalendarPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';

export type MeetingType = 'PRINCIPAL_CONNECT' | 'TEACHER_PARENT_MEETING';
export type MeetingCategory =
  | 'ACADEMIC_PROGRESS'
  | 'BEHAVIORAL_WELLBEING'
  | 'SPECIAL_NEEDS'
  | 'ADMIN_FEES'
  | 'CAREER_GUIDANCE'
  | 'EXAM_PREPARATION'
  | 'HOMEWORK_SUBMISSION';
export type MeetingMode = 'IN_PERSON' | 'VIRTUAL_MEET' | 'PHONE_CALL';
export type MeetingStatus = 'PENDING' | 'CONFIRMED' | 'RESCHEDULED' | 'COMPLETED' | 'CANCELLED';

export interface MeetingItem {
  id: string;
  meetingType: MeetingType;
  parentId: string;
  parentName: string;
  parentPhone: string;
  studentName: string;
  studentClass: string;
  studentRollNo?: string;
  studentAttendance?: number;
  studentGrade?: string;
  teacherId?: string;
  teacherName?: string;
  recipientRole: 'PRINCIPAL' | 'VICE_PRINCIPAL' | 'CLASS_TEACHER' | 'SUBJECT_TEACHER';
  recipientName: string;
  category: MeetingCategory;
  mode: MeetingMode;
  requestedDate: string;
  timeSlot: string;
  agenda: string;
  status: MeetingStatus;
  virtualLink?: string;
  location?: string;
  staffNotes?: string;
  adminOversight: boolean; // Optional Admin/Principal Tracking
  adminAttendeeName?: string;
  adminNotes?: string;
  meetingMinutes?: {
    discussionSummary?: string;
    actionItems?: string[];
    followUpRequired?: boolean;
    followUpDate?: string;
    resolutionStatus?: 'RESOLVED' | 'FOLLOW_UP_REQUIRED' | 'ESCALATED_TO_ADMIN';
  };
  reminderSentCount?: number;
  rescheduleReason?: string;
  createdAt: string;
}

const defaultInitialMeetings: MeetingItem[] = [
  {
    id: 'meet-101',
    meetingType: 'PRINCIPAL_CONNECT',
    parentId: 'parent-1',
    parentName: 'Mr. Rajesh Sharma',
    parentPhone: '+91 98765 43210',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    studentRollNo: '14',
    studentAttendance: 96,
    studentGrade: 'A1 (92%)',
    recipientRole: 'PRINCIPAL',
    recipientName: 'Dr. R. K. Mukherjee (Principal)',
    category: 'ACADEMIC_PROGRESS',
    mode: 'IN_PERSON',
    requestedDate: '2026-09-28',
    timeSlot: '10:00 AM - 10:30 AM',
    agenda: "Discussion on Aarav's board examination strategy, physics numerical preparation, and scholarship counseling.",
    status: 'CONFIRMED',
    location: 'Principal Executive Office (Administrative Wing, 1st Floor)',
    staffNotes: "Confirmed. Principal agreed to review Aarav's mid-term mathematics and science portfolio.",
    adminOversight: true,
    adminAttendeeName: 'Dr. R. K. Mukherjee (Principal)',
    createdAt: '2026-09-22T09:30:00.000Z',
  },
  {
    id: 'meet-102',
    meetingType: 'TEACHER_PARENT_MEETING',
    parentId: 'parent-1',
    parentName: 'Mr. Rajesh Sharma',
    parentPhone: '+91 98765 43210',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    studentRollNo: '14',
    studentAttendance: 96,
    studentGrade: 'A1 (92%)',
    teacherId: 'teacher-101',
    teacherName: 'Mr. Rajesh Khanna (Physics Faculty)',
    recipientRole: 'CLASS_TEACHER',
    recipientName: 'Mr. Rajesh Khanna (Class Teacher & Physics)',
    category: 'EXAM_PREPARATION',
    mode: 'VIRTUAL_MEET',
    requestedDate: '2026-10-02',
    timeSlot: '03:30 PM - 04:00 PM',
    agenda: 'Quarterly review of Class 10 Physics lab experiments, numerical problem-solving speed, and upcoming pre-board test.',
    status: 'CONFIRMED',
    virtualLink: 'https://meet.google.com/nex-ptm-conf',
    staffNotes: 'Virtual room ready. Will present chapter-wise mastery diagnostic analytics.',
    adminOversight: true,
    adminAttendeeName: 'Dr. R. K. Mukherjee (Principal - Overseeing)',
    adminNotes: 'Admin flagged: review physics practical workbook submissions during session.',
    createdAt: '2026-09-24T14:15:00.000Z',
  },
  {
    id: 'meet-103',
    meetingType: 'TEACHER_PARENT_MEETING',
    parentId: 'parent-2',
    parentName: 'Mrs. Ananya Sen',
    parentPhone: '+91 98123 45678',
    studentName: 'Rohan Sen',
    studentClass: 'Class 9-B',
    studentRollNo: '22',
    studentAttendance: 88,
    studentGrade: 'B1 (74%)',
    teacherId: 'teacher-102',
    teacherName: 'Mrs. Sunita Rao (Mathematics Dept)',
    recipientRole: 'SUBJECT_TEACHER',
    recipientName: 'Mrs. Sunita Rao (Mathematics Mentor)',
    category: 'ACADEMIC_PROGRESS',
    mode: 'IN_PERSON',
    requestedDate: '2026-10-04',
    timeSlot: '11:30 AM - 12:00 PM',
    agenda: 'Geometry concept clarity and remediation plan for upcoming unit test.',
    status: 'PENDING',
    location: 'Faculty Consultation Room 204',
    adminOversight: false,
    createdAt: '2026-09-23T10:00:00.000Z',
  },
  {
    id: 'meet-104',
    meetingType: 'PRINCIPAL_CONNECT',
    parentId: 'parent-3',
    parentName: 'Mr. Vikram Singhal',
    parentPhone: '+91 99887 66554',
    studentName: 'Meera Singhal',
    studentClass: 'Class 12-Science',
    studentRollNo: '03',
    studentAttendance: 98,
    studentGrade: 'A1 (96%)',
    recipientRole: 'PRINCIPAL',
    recipientName: 'Dr. R. K. Mukherjee (Principal)',
    category: 'CAREER_GUIDANCE',
    mode: 'IN_PERSON',
    requestedDate: '2026-09-18',
    timeSlot: '02:30 PM - 03:00 PM',
    agenda: 'JEE Advanced counseling and recommendation letter for International Youth Robotics Olympiad.',
    status: 'COMPLETED',
    location: 'Principal Executive Office, Block A',
    staffNotes: 'Meeting concluded successfully. Recommendation signed.',
    adminOversight: true,
    adminAttendeeName: 'Dr. R. K. Mukherjee (Principal)',
    meetingMinutes: {
      discussionSummary: 'Reviewed academic credentials, competitive exam revision plan, and Olympiad sponsorship.',
      actionItems: [
        'Issued official Principal Letter of Recommendation for Robotics Olympiad',
        'Academic Coordinator assigned 3 tailored mock test papers',
        'Follow-up scheduled post-Olympiad selection results',
      ],
      followUpRequired: true,
      followUpDate: '2026-10-25',
      resolutionStatus: 'RESOLVED',
    },
    createdAt: '2026-09-15T11:00:00.000Z',
  },
  {
    id: 'meet-105',
    meetingType: 'TEACHER_PARENT_MEETING',
    parentId: 'parent-4',
    parentName: 'Mrs. Kavita Patel',
    parentPhone: '+91 97766 55443',
    studentName: 'Ananya Patel',
    studentClass: 'Class 10-A',
    studentRollNo: '09',
    studentAttendance: 94,
    studentGrade: 'A2 (85%)',
    teacherId: 'teacher-103',
    teacherName: 'Mr. David Paul (English Department)',
    recipientRole: 'CLASS_TEACHER',
    recipientName: 'Mr. David Paul (English & Debate Club Mentor)',
    category: 'BEHAVIORAL_WELLBEING',
    mode: 'PHONE_CALL',
    requestedDate: '2026-10-05',
    timeSlot: '04:00 PM - 04:30 PM',
    agenda: 'Feedback on Model United Nations participation, public speaking confidence, and active classroom leadership.',
    status: 'CONFIRMED',
    staffNotes: 'Telephonic conference scheduled on registered parent mobile number.',
    adminOversight: false,
    createdAt: '2026-09-25T16:00:00.000Z',
  },
  {
    id: 'meet-106',
    meetingType: 'TEACHER_PARENT_MEETING',
    parentId: 'parent-5',
    parentName: 'Mr. Amitav Verma',
    parentPhone: '+91 96655 44332',
    studentName: 'Kabir Verma',
    studentClass: 'Class 11-Commerce',
    studentRollNo: '18',
    studentAttendance: 84,
    studentGrade: 'B2 (68%)',
    teacherId: 'teacher-104',
    teacherName: 'Dr. Anjali Verma (Economics & Accounts)',
    recipientRole: 'SUBJECT_TEACHER',
    recipientName: 'Dr. Anjali Verma (Accounts Faculty)',
    category: 'HOMEWORK_SUBMISSION',
    mode: 'IN_PERSON',
    requestedDate: '2026-10-06',
    timeSlot: '01:30 PM - 02:00 PM',
    agenda: 'Pending accountancy assignment compliance and ledger reconciliation practice.',
    status: 'RESCHEDULED',
    location: 'Commerce Lab 3',
    rescheduleReason: 'Parent requested afternoon slot due to official work commitment.',
    adminOversight: true,
    adminAttendeeName: 'Dr. Sunita Rao (Vice Principal - Observer)',
    adminNotes: 'Vice Principal requested report on homework completion within 7 days.',
    createdAt: '2026-09-24T12:00:00.000Z',
  },
];

const categoryLabels: Record<MeetingCategory, string> = {
  ACADEMIC_PROGRESS: 'Academic Progress & Mastery',
  EXAM_PREPARATION: 'Board & Term Exam Prep',
  BEHAVIORAL_WELLBEING: 'Behavioral & Pastoral Wellbeing',
  HOMEWORK_SUBMISSION: 'Homework & Assignment Compliance',
  SPECIAL_NEEDS: 'Special Learning Needs / Support',
  CAREER_GUIDANCE: 'Career & Stream Counseling',
  ADMIN_FEES: 'Administrative, Scholarships & Fees',
};

const facultyList = [
  { role: 'PRINCIPAL', name: 'Dr. R. K. Mukherjee (School Principal)', type: 'PRINCIPAL_CONNECT' },
  { role: 'VICE_PRINCIPAL', name: 'Dr. Sunita Rao (Vice Principal)', type: 'PRINCIPAL_CONNECT' },
  { role: 'CLASS_TEACHER', name: 'Mr. Rajesh Khanna (Class 10-A Mentor & Physics)', type: 'TEACHER_PARENT_MEETING' },
  { role: 'SUBJECT_TEACHER', name: 'Mrs. Sunita Rao (Mathematics Dept)', type: 'TEACHER_PARENT_MEETING' },
  { role: 'SUBJECT_TEACHER', name: 'Mr. David Paul (English & Debate Mentor)', type: 'TEACHER_PARENT_MEETING' },
  { role: 'SUBJECT_TEACHER', name: 'Dr. Anjali Verma (Commerce & Accounts)', type: 'TEACHER_PARENT_MEETING' },
];

export default function MeetingsPage() {
  const { data: session } = useSession();
  const sessionRole = (session?.user as any)?.role || 'TEACHER';

  // Role perspective simulation state (for easy live evaluation)
  const [activePerspective, setActivePerspective] = useState<'TEACHER' | 'ADMIN' | 'PARENT'>(
    sessionRole === 'SUPER_ADMIN' || sessionRole === 'ADMIN'
      ? 'ADMIN'
      : sessionRole === 'PARENT'
      ? 'PARENT'
      : 'TEACHER'
  );

  const isTeacherView = activePerspective === 'TEACHER';
  const isAdminView = activePerspective === 'ADMIN';
  const isParentView = activePerspective === 'PARENT';

  // Core Data State
  const [meetings, setMeetings] = useState<MeetingItem[]>(defaultInitialMeetings);
  const [loading, setLoading] = useState(false);

  // Filters State
  const [activeTab, setActiveTab] = useState<'ALL' | 'PTM' | 'PRINCIPAL' | 'ADMIN_TRACKED'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterMode, setFilterMode] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedMeetingForAction, setSelectedMeetingForAction] = useState<MeetingItem | null>(null);
  const [rescheduleModalMeeting, setRescheduleModalMeeting] = useState<MeetingItem | null>(null);
  const [minutesModalMeeting, setMinutesModalMeeting] = useState<MeetingItem | null>(null);

  // Slot Management State
  const [blockDate, setBlockDate] = useState('2026-10-08');
  const [blockReason, setBlockReason] = useState('CBSE Inspection & Annual Staff Moderation');
  const [slotDuration, setSlotDuration] = useState('30');

  // Book Form State
  const [bookForm, setBookForm] = useState({
    meetingType: (isTeacherView ? 'TEACHER_PARENT_MEETING' : 'PRINCIPAL_CONNECT') as MeetingType,
    recipientRole: (isTeacherView ? 'CLASS_TEACHER' : 'PRINCIPAL') as any,
    recipientName: isTeacherView
      ? 'Mr. Rajesh Khanna (Class 10-A Mentor & Physics)'
      : 'Dr. R. K. Mukherjee (School Principal)',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    studentRollNo: '14',
    category: 'ACADEMIC_PROGRESS' as MeetingCategory,
    mode: 'VIRTUAL_MEET' as MeetingMode,
    requestedDate: '2026-10-09',
    timeSlot: '10:00 AM - 10:30 AM',
    agenda: '',
    adminOversight: false,
    adminNotes: '',
  });

  // Action/Review Modal State
  const [staffVirtualLink, setStaffVirtualLink] = useState('https://meet.google.com/nex-ptm-conf');
  const [staffLocation, setStaffLocation] = useState('Faculty Consultation Room 204');
  const [staffActionNotes, setStaffActionNotes] = useState('');

  // Reschedule Modal State
  const [rescheduleDate, setRescheduleDate] = useState('2026-10-10');
  const [rescheduleSlot, setRescheduleSlot] = useState('02:30 PM - 03:00 PM');
  const [rescheduleReasonText, setRescheduleReasonText] = useState('Slot adjusted due to laboratory class schedule.');

  // Meeting Minutes Modal State
  const [minutesSummary, setMinutesSummary] = useState('');
  const [minutesActionItems, setMinutesActionItems] = useState<string[]>([
    'Review chapter 5 & 6 numerical questions with student',
    'Follow up on homework submission compliance by next Monday',
  ]);
  const [newActionItemInput, setNewActionItemInput] = useState('');
  const [minutesFollowUpDate, setMinutesFollowUpDate] = useState('2026-10-20');
  const [minutesResolutionStatus, setMinutesResolutionStatus] = useState<
    'RESOLVED' | 'FOLLOW_UP_REQUIRED' | 'ESCALATED_TO_ADMIN'
  >('FOLLOW_UP_REQUIRED');
  const [minutesAdminNotes, setMinutesAdminNotes] = useState('');

  // Fetch API Meetings
  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/meetings');
      const data = await res.json();
      if (data.success && data.data && data.data.length > 0) {
        setMeetings(data.data);
      }
    } catch (err) {
      console.error('Failed to load meetings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Sync modal state when opening
  useEffect(() => {
    if (selectedMeetingForAction) {
      setStaffVirtualLink(selectedMeetingForAction.virtualLink || 'https://meet.google.com/nex-ptm-conf');
      setStaffLocation(selectedMeetingForAction.location || 'Faculty Consultation Room 204');
      setStaffActionNotes(selectedMeetingForAction.staffNotes || '');
    }
  }, [selectedMeetingForAction]);

  useEffect(() => {
    if (minutesModalMeeting) {
      setMinutesSummary(
        minutesModalMeeting.meetingMinutes?.discussionSummary ||
          `Detailed consultation held regarding ${minutesModalMeeting.studentName}'s performance in ${categoryLabels[minutesModalMeeting.category]}. Parent briefed on progress goals.`
      );
      setMinutesActionItems(
        minutesModalMeeting.meetingMinutes?.actionItems || [
          'Monitor weekly academic performance logs',
          'Complete additional practice exercises before next assessment',
        ]
      );
      setMinutesFollowUpDate(minutesModalMeeting.meetingMinutes?.followUpDate || '2026-10-22');
      setMinutesResolutionStatus(minutesModalMeeting.meetingMinutes?.resolutionStatus || 'FOLLOW_UP_REQUIRED');
      setMinutesAdminNotes(minutesModalMeeting.adminNotes || '');
    }
  }, [minutesModalMeeting]);

  // Book Submit
  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.agenda.trim()) {
      toast.error('Please enter the specific discussion agenda.');
      return;
    }

    try {
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookForm),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || 'Conference scheduled successfully!');
        setIsBookModalOpen(false);
        setBookForm(prev => ({ ...prev, agenda: '', adminOversight: false }));
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to submit conference request');
      }
    } catch {
      toast.error('Network error booking conference.');
    }
  };

  // Staff Update / Status change
  const handleUpdateStatus = async (id: string, newStatus: MeetingStatus) => {
    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          status: newStatus,
          staffNotes: staffActionNotes || undefined,
          virtualLink: staffVirtualLink || undefined,
          location: staffLocation || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Meeting status updated to ${newStatus}`);
        setSelectedMeetingForAction(null);
        fetchMeetings();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Error updating meeting status');
    }
  };

  // Toggle Admin Oversight (Requested by User!)
  const handleToggleAdminOversight = async (m: MeetingItem) => {
    const nextOversightState = !m.adminOversight;
    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: m.id,
          adminOversight: nextOversightState,
          adminAttendeeName: nextOversightState
            ? 'Dr. R. K. Mukherjee (Principal - Overseeing)'
            : undefined,
          adminNotes: nextOversightState
            ? 'Admin tracking enabled by faculty for leadership governance.'
            : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          nextOversightState
            ? 'Admin / Principal leadership tracking enabled for this session.'
            : 'Admin tracking removed.'
        );
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to update admin tracking');
      }
    } catch {
      toast.error('Error toggling admin tracking');
    }
  };

  // Reschedule Submit
  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleModalMeeting) return;

    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: rescheduleModalMeeting.id,
          status: 'RESCHEDULED',
          requestedDate: rescheduleDate,
          timeSlot: rescheduleSlot,
          rescheduleReason: rescheduleReasonText,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Meeting rescheduled and participants notified!');
        setRescheduleModalMeeting(null);
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to reschedule');
      }
    } catch {
      toast.error('Error rescheduling meeting');
    }
  };

  // Meeting Minutes Submit
  const handleMinutesSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!minutesModalMeeting) return;

    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: minutesModalMeeting.id,
          status: 'COMPLETED',
          adminNotes: minutesAdminNotes || undefined,
          meetingMinutes: {
            discussionSummary: minutesSummary,
            actionItems: minutesActionItems,
            followUpRequired: minutesResolutionStatus !== 'RESOLVED',
            followUpDate: minutesFollowUpDate,
            resolutionStatus: minutesResolutionStatus,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Meeting Minutes & Action Items recorded successfully!');
        setMinutesModalMeeting(null);
        fetchMeetings();
      } else {
        toast.error(data.error || 'Failed to save meeting minutes');
      }
    } catch {
      toast.error('Error saving minutes');
    }
  };

  // Trigger Notification Reminder
  const handleSendReminder = async (m: MeetingItem) => {
    try {
      const res = await fetch('/api/meetings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: m.id, triggerReminder: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`SMS and email reminder sent to ${m.parentName} (${m.parentPhone})`);
        fetchMeetings();
      }
    } catch {
      toast.error('Failed to dispatch reminder');
    }
  };

  // Calendar .ics generator / download
  const handleDownloadCalendarInvite = (m: MeetingItem) => {
    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vidyalaya School ERP//Meeting Hub//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${m.id}@vidyalaya.edu`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `SUMMARY:${m.meetingType === 'PRINCIPAL_CONNECT' ? 'Principal 1:1 Connect' : 'Teacher-Parent Meeting (PTM)'} - ${m.studentName}`,
      `DESCRIPTION:${m.agenda} (Recipient: ${m.recipientName})`,
      `LOCATION:${m.location || m.virtualLink || 'School Campus'}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${m.meetingType.toLowerCase()}_${m.studentName.replace(/\s+/g, '_')}.ics`;
    link.click();
    toast.success('Calendar invite (.ics) downloaded!');
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Meeting ID',
      'Type',
      'Parent Name',
      'Parent Phone',
      'Student Name',
      'Class',
      'Roll No',
      'Attendance Rate',
      'Academic Grade',
      'Recipient / Mentor',
      'Category',
      'Format',
      'Date',
      'Time Slot',
      'Status',
      'Admin Oversight Active',
      'Admin Observer',
      'Agenda',
      'Action Items',
    ];

    const rows = meetings.map(m => [
      `"${m.id}"`,
      `"${m.meetingType}"`,
      `"${m.parentName}"`,
      `"${m.parentPhone}"`,
      `"${m.studentName}"`,
      `"${m.studentClass}"`,
      `"${m.studentRollNo || 'N/A'}"`,
      `"${m.studentAttendance ? m.studentAttendance + '%' : 'N/A'}"`,
      `"${m.studentGrade || 'N/A'}"`,
      `"${m.recipientName}"`,
      `"${m.category}"`,
      `"${m.mode}"`,
      `"${m.requestedDate}"`,
      `"${m.timeSlot}"`,
      `"${m.status}"`,
      `"${m.adminOversight ? 'YES' : 'NO'}"`,
      `"${m.adminAttendeeName || 'None'}"`,
      `"${m.agenda.replace(/"/g, '""')}"`,
      `"${(m.meetingMinutes?.actionItems || []).join('; ').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vidyalaya_ptm_and_principal_connect_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success('Exported comprehensive meeting audit report!');
  };

  // Filtered Meetings Computation
  const filteredMeetings = useMemo(() => {
    return meetings.filter(m => {
      // Tab filter
      if (activeTab === 'PTM' && m.meetingType !== 'TEACHER_PARENT_MEETING') return false;
      if (activeTab === 'PRINCIPAL' && m.meetingType !== 'PRINCIPAL_CONNECT') return false;
      if (activeTab === 'ADMIN_TRACKED' && !m.adminOversight) return false;

      // Status filter
      if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;

      // Mode filter
      if (filterMode !== 'ALL' && m.mode !== filterMode) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          m.studentName.toLowerCase().includes(q) ||
          m.parentName.toLowerCase().includes(q) ||
          m.recipientName.toLowerCase().includes(q) ||
          m.studentClass.toLowerCase().includes(q) ||
          m.agenda.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [meetings, activeTab, filterStatus, filterMode, searchQuery]);

  // Dynamic Content based on Active Perspective
  const perspectiveMetadata = {
    TEACHER: {
      badge: 'Classroom & Subject Mentorship',
      title: 'Teacher Parent Meeting (PTM)',
      titleHi: 'शिक्षक-अभिभावक बैठक',
      description:
        'Coordinate 1:1 parent conferences, review student progress, document meeting minutes with action items, and collaborate with School Administration via optional Admin oversight.',
      cta: 'Schedule Parent Conference',
      accentColor: 'from-blue-700 via-indigo-800 to-slate-900',
      icon: Users,
    },
    ADMIN: {
      badge: 'Confidential Leadership Command & Governance',
      title: 'Principal Connect & Teacher-Parent Meeting (PTM) Oversight',
      titleHi: 'प्रधानाचार्य संवाद एवं पीटीएम नियंत्रण',
      description:
        'Direct executive consultations with parents and full school-wide oversight over Teacher-Parent Meetings (PTM). Monitor pastoral escalations and track action item compliance.',
      cta: 'Schedule Leadership Connect',
      accentColor: 'from-purple-900 via-indigo-900 to-slate-900',
      icon: Shield,
    },
    PARENT: {
      badge: 'Parent-School Academic Partnership',
      title: 'Teacher & Principal 1:1 Connect',
      titleHi: 'शिक्षक एवं प्रधानाचार्य संवाद',
      description:
        'Schedule a confidential dialogue with the School Principal or book a 1:1 academic progress conference with your ward’s class teacher and subject mentors.',
      cta: 'Book 1:1 Conference',
      accentColor: 'from-emerald-800 via-teal-900 to-slate-900',
      icon: CalendarCheck,
    },
  }[activePerspective];

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        {/* ========================================================================= */}
        {/* 1. PERSPECTIVE SELECTOR BAR (Seamless role testing & evaluation)          */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 p-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active Perspective:</span>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
            <button
              onClick={() => {
                setActivePerspective('TEACHER');
                setBookForm(prev => ({
                  ...prev,
                  meetingType: 'TEACHER_PARENT_MEETING',
                  recipientRole: 'CLASS_TEACHER',
                  recipientName: 'Mr. Rajesh Khanna (Class 10-A Mentor & Physics)',
                }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isTeacherView
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Users size={14} />
              <span>Teacher (PTM)</span>
            </button>

            <button
              onClick={() => {
                setActivePerspective('ADMIN');
                setBookForm(prev => ({
                  ...prev,
                  meetingType: 'PRINCIPAL_CONNECT',
                  recipientRole: 'PRINCIPAL',
                  recipientName: 'Dr. R. K. Mukherjee (School Principal)',
                }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isAdminView
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Shield size={14} />
              <span>Admin (Principal & Oversight)</span>
            </button>

            <button
              onClick={() => {
                setActivePerspective('PARENT');
                setBookForm(prev => ({
                  ...prev,
                  meetingType: 'TEACHER_PARENT_MEETING',
                  recipientRole: 'CLASS_TEACHER',
                  recipientName: 'Mr. Rajesh Khanna (Class 10-A Mentor & Physics)',
                }));
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                isParentView
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <GraduationCap size={14} />
              <span>Parent (Book & View)</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. DYNAMIC HERO HEADER                                                    */}
        {/* ========================================================================= */}
        <div
          className={`bg-gradient-to-r ${perspectiveMetadata.accentColor} rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden transition-all duration-300`}
        >
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/15 text-xs font-bold text-white">
                <Sparkles size={14} className="text-amber-400" />
                <span>{perspectiveMetadata.badge}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{perspectiveMetadata.title}</h1>
              <p className="text-xs sm:text-sm text-gray-200 leading-relaxed">{perspectiveMetadata.description}</p>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-xs font-bold rounded-2xl border border-white/20 transition"
              >
                <Download size={16} />
                <span>Export Report</span>
              </button>

              {(isTeacherView || isAdminView) && (
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-3 bg-white/10 hover:bg-white/20 backdrop-blur text-white text-xs font-bold rounded-2xl border border-white/20 transition"
                >
                  <Settings size={16} />
                  <span>PTM Slots</span>
                </button>
              )}

              <button
                onClick={() => setIsBookModalOpen(true)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-black rounded-2xl shadow-lg shadow-orange-500/30 transition transform active:scale-95"
              >
                <Plus size={18} />
                <span>{perspectiveMetadata.cta}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. COCKPIT STATS OVERVIEW                                                 */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] text-gray-500 uppercase font-black">All Meetings</p>
            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{meetings.length}</p>
            <span className="text-[10px] text-gray-400">Total logged</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black">Teacher PTMs</p>
            <p className="text-2xl font-black text-blue-600 mt-1">
              {meetings.filter(m => m.meetingType === 'TEACHER_PARENT_MEETING').length}
            </p>
            <span className="text-[10px] text-blue-400">Faculty conferences</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] text-purple-600 dark:text-purple-400 uppercase font-black">Principal 1:1</p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              {meetings.filter(m => m.meetingType === 'PRINCIPAL_CONNECT').length}
            </p>
            <span className="text-[10px] text-purple-400">Executive dialogues</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 shadow-sm">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 uppercase font-black flex items-center gap-1">
              <Shield size={11} className="text-amber-500" />
              <span>Admin Tracked</span>
            </p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {meetings.filter(m => m.adminOversight).length}
            </p>
            <span className="text-[10px] text-amber-600/80 font-medium">Leadership oversight</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] text-emerald-600 uppercase font-black">Confirmed</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {meetings.filter(m => m.status === 'CONFIRMED').length}
            </p>
            <span className="text-[10px] text-emerald-500 font-medium">Upcoming ready</span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm">
            <p className="text-[10px] text-rose-500 uppercase font-black">Pending Review</p>
            <p className="text-2xl font-black text-rose-600 mt-1">
              {meetings.filter(m => m.status === 'PENDING').length}
            </p>
            <span className="text-[10px] text-rose-400 font-medium">Requires action</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. TABS & SEARCH CONTROLS                                                 */}
        {/* ========================================================================= */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Perspective View Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: 'ALL', label: 'All Conferences', count: meetings.length },
                {
                  id: 'PTM',
                  label: 'Teacher-Parent Meetings',
                  count: meetings.filter(m => m.meetingType === 'TEACHER_PARENT_MEETING').length,
                },
                {
                  id: 'PRINCIPAL',
                  label: 'Principal Connect 1:1',
                  count: meetings.filter(m => m.meetingType === 'PRINCIPAL_CONNECT').length,
                },
                {
                  id: 'ADMIN_TRACKED',
                  label: 'Admin Monitored',
                  count: meetings.filter(m => m.adminOversight).length,
                },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-2xl text-xs font-black transition whitespace-nowrap flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-gray-900 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-white dark:bg-gray-800 text-gray-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search student, teacher, agenda..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sub Filters: Status & Mode */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-[11px] font-bold text-gray-400 uppercase mr-1">Status:</span>
              {['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'RESCHEDULED'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                    filterStatus === status
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Format:</span>
              <select
                value={filterMode}
                onChange={e => setFilterMode(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
              >
                <option value="ALL">All Formats</option>
                <option value="VIRTUAL_MEET">Virtual Video Call</option>
                <option value="IN_PERSON">In-Person Office/Room</option>
                <option value="PHONE_CALL">Phone Consultation</option>
              </select>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 5. MEETINGS LIST / CARDS                                                  */}
        {/* ========================================================================= */}
        {loading ? (
          <div className="p-16 text-center text-gray-400">Loading meeting schedule...</div>
        ) : filteredMeetings.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-14 text-center border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-gray-700 text-gray-400 flex items-center justify-center mx-auto">
              <Calendar size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">No Conferences Found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              No meetings matching the selected filter criteria. Click the button above to schedule a new
              conference.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredMeetings.map(m => {
              const isPTM = m.meetingType === 'TEACHER_PARENT_MEETING';

              return (
                <div
                  key={m.id}
                  className="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {isPTM ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
                            <Users size={12} />
                            <span>Teacher Parent Meeting</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
                            <Shield size={12} />
                            <span>Principal Connect (1:1)</span>
                          </span>
                        )}

                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                            m.status === 'CONFIRMED'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : m.status === 'PENDING'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : m.status === 'COMPLETED'
                              ? 'bg-slate-100 text-slate-800 border border-slate-300'
                              : m.status === 'RESCHEDULED'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>

                      {/* Format Badge */}
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-xl">
                        {m.mode === 'VIRTUAL_MEET' ? (
                          <>
                            <Video size={13} className="text-blue-500" /> Virtual Video Meet
                          </>
                        ) : m.mode === 'PHONE_CALL' ? (
                          <>
                            <Phone size={13} className="text-emerald-500" /> Phone Call
                          </>
                        ) : (
                          <>
                            <Building2 size={13} className="text-purple-500" /> In-Person Room
                          </>
                        )}
                      </span>
                    </div>

                    {/* ADMIN OVERSIGHT BANNER (Crucial User Requirement) */}
                    {m.adminOversight ? (
                      <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-300 dark:border-amber-700 p-2.5 rounded-2xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                          <Shield size={16} className="text-amber-600 flex-shrink-0" />
                          <div>
                            <span className="font-bold">Admin Oversight Active: </span>
                            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">
                              {m.adminAttendeeName || 'Dr. R. K. Mukherjee (Principal - Overseeing)'}
                            </span>
                          </div>
                        </div>

                        {(isAdminView || isTeacherView) && (
                          <button
                            onClick={() => handleToggleAdminOversight(m)}
                            className="text-[10px] font-bold text-amber-700 hover:text-amber-900 underline ml-2"
                            title="Remove Admin tracking"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    ) : (
                      (isAdminView || isTeacherView) && (
                        <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-750 px-3 py-1.5 rounded-xl text-[11px] text-gray-500 border border-dashed border-gray-200 dark:border-gray-700">
                          <span>Admin tracking not active</span>
                          <button
                            onClick={() => handleToggleAdminOversight(m)}
                            className="font-bold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
                          >
                            <Shield size={12} />
                            <span>+ Add Admin Tracking</span>
                          </button>
                        </div>
                      )
                    )}

                    {/* Recipient & Category */}
                    <div>
                      <h3 className="text-base font-black text-gray-900 dark:text-white">
                        {m.recipientName}
                      </h3>
                      <p className="text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                        Category: {categoryLabels[m.category] || m.category}
                      </p>
                    </div>

                    {/* Student Academic Snapshot */}
                    <div className="bg-slate-50 dark:bg-gray-900 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center font-black text-xs">
                          {m.studentName.slice(0, 1)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800 dark:text-gray-200">
                            {m.studentName} ({m.studentClass})
                          </p>
                          <p className="text-[10px] text-gray-500">Roll No: {m.studentRollNo || '14'}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {m.studentAttendance && (
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                            {m.studentAttendance}% Attd
                          </span>
                        )}
                        {m.studentGrade && (
                          <span className="px-2 py-0.5 rounded-lg bg-purple-50 text-purple-700 text-[10px] font-bold border border-purple-200">
                            {m.studentGrade}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Date and Time Slot */}
                    <div className="bg-blue-50/60 dark:bg-blue-950/20 p-3 rounded-2xl flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-200">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-blue-600" />
                        <span>{m.requestedDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-blue-600" />
                        <span>{m.timeSlot}</span>
                      </div>
                    </div>

                    {/* Agenda & Notes */}
                    <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-300">
                      <p className="font-bold text-gray-700 dark:text-gray-200">Agenda & Objectives:</p>
                      <p className="bg-gray-50 dark:bg-gray-900 p-3 rounded-xl border border-gray-100 dark:border-gray-800 leading-relaxed text-gray-800 dark:text-gray-200">
                        {m.agenda}
                      </p>
                    </div>

                    {/* Reschedule Reason if applicable */}
                    {m.status === 'RESCHEDULED' && m.rescheduleReason && (
                      <div className="p-2.5 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl text-xs text-sky-900 dark:text-sky-200">
                        <strong>Reschedule Note:</strong> {m.rescheduleReason}
                      </div>
                    )}

                    {/* Location / Meet Link Box */}
                    {m.status === 'CONFIRMED' && (
                      <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-2 text-xs">
                        {m.mode === 'VIRTUAL_MEET' && m.virtualLink && (
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-bold text-emerald-900 dark:text-emerald-200">
                              Virtual Video Ready:
                            </span>
                            <a
                              href={m.virtualLink}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm text-xs"
                            >
                              <Video size={13} />
                              <span>Join Video Call</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        )}
                        {m.mode === 'IN_PERSON' && m.location && (
                          <p className="text-emerald-900 dark:text-emerald-200">
                            <strong>Venue:</strong> {m.location}
                          </p>
                        )}
                        {m.mode === 'PHONE_CALL' && (
                          <p className="text-emerald-900 dark:text-emerald-200">
                            <strong>Registered Dial:</strong> {m.parentPhone}
                          </p>
                        )}
                        {m.staffNotes && (
                          <p className="text-emerald-800 dark:text-emerald-300 border-t border-emerald-200 dark:border-emerald-800 pt-1.5">
                            <strong>Staff Remarks:</strong> {m.staffNotes}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Meeting Minutes and Action Items Box */}
                    {m.meetingMinutes && (
                      <div className="p-3.5 bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                            <ListChecks size={14} className="text-purple-600" />
                            <span>Meeting Minutes & Action Items</span>
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                              m.meetingMinutes.resolutionStatus === 'RESOLVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {m.meetingMinutes.resolutionStatus}
                          </span>
                        </div>

                        {m.meetingMinutes.discussionSummary && (
                          <p className="text-purple-950 dark:text-purple-200 text-[11px] leading-relaxed">
                            {m.meetingMinutes.discussionSummary}
                          </p>
                        )}

                        {m.meetingMinutes.actionItems && m.meetingMinutes.actionItems.length > 0 && (
                          <ul className="space-y-1 pt-1 border-t border-purple-200/50">
                            {m.meetingMinutes.actionItems.map((item, idx) => (
                              <li
                                key={idx}
                                className="flex items-start gap-1.5 text-[11px] text-purple-900 dark:text-purple-300"
                              >
                                <Check size={12} className="text-purple-600 mt-0.5 flex-shrink-0" />
                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {m.meetingMinutes.followUpDate && (
                          <p className="text-[10px] text-purple-700 dark:text-purple-300 font-bold pt-1">
                            Next Follow-up Due: {m.meetingMinutes.followUpDate}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Parent & Contact Footer info */}
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                      <span>
                        <strong>Parent:</strong> {m.parentName} ({m.parentPhone})
                      </span>
                      <span>
                        <strong>Requested:</strong> {m.createdAt.slice(0, 10)}
                      </span>
                    </div>
                  </div>

                  {/* Meeting Actions */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center justify-between gap-2">
                    {/* Left Quick Helpers */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDownloadCalendarInvite(m)}
                        className="p-2 rounded-xl text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                        title="Add to Calendar (.ics)"
                      >
                        <CalendarPlus size={16} />
                      </button>

                      <button
                        onClick={() => handleSendReminder(m)}
                        className="p-2 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 transition"
                        title="Send SMS/Email Alert Reminder"
                      >
                        <Bell size={16} />
                      </button>

                      {m.status !== 'CANCELLED' && m.status !== 'COMPLETED' && (
                        <button
                          onClick={() => {
                            setRescheduleModalMeeting(m);
                            setRescheduleDate(m.requestedDate);
                            setRescheduleSlot(m.timeSlot);
                          }}
                          className="px-2.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition"
                        >
                          Reschedule
                        </button>
                      )}
                    </div>

                    {/* Right Primary Actions */}
                    <div className="flex items-center gap-2">
                      {m.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(m.id, 'CANCELLED')}
                            className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition border border-rose-200"
                          >
                            Decline
                          </button>
                          <button
                            onClick={() => setSelectedMeetingForAction(m)}
                            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            Review & Confirm
                          </button>
                        </>
                      )}

                      {m.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => setMinutesModalMeeting(m)}
                            className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
                          >
                            <ListChecks size={14} />
                            <span>Log Minutes</span>
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(m.id, 'COMPLETED')}
                            className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white rounded-xl text-xs font-bold transition"
                          >
                            Mark Complete
                          </button>
                        </>
                      )}

                      {m.status === 'COMPLETED' && (
                        <button
                          onClick={() => setMinutesModalMeeting(m)}
                          className="px-3.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                        >
                          <ListChecks size={14} />
                          <span>View Minutes</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 1: SCHEDULE MEETING MODAL (PTM & PRINCIPAL CONNECT)                */}
        {/* ========================================================================= */}
        {isBookModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-5 animate-in zoom-in-95 my-8">
              <div className="flex items-center justify-between border-b dark:border-gray-700 pb-4">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">Schedule 1:1 Conference</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Select Conference Type, Mentor, and Optional Admin Tracking
                  </p>
                </div>
                <button
                  onClick={() => setIsBookModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={16} />
                </button>
              </div>

              {/* TYPE SWITCHER */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-gray-100 dark:bg-gray-900 rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setBookForm(prev => ({
                      ...prev,
                      meetingType: 'TEACHER_PARENT_MEETING',
                      recipientRole: 'CLASS_TEACHER',
                      recipientName: 'Mr. Rajesh Khanna (Class 10-A Mentor & Physics)',
                    }));
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    bookForm.meetingType === 'TEACHER_PARENT_MEETING'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Users size={15} />
                  <span>Teacher-Parent Meeting (PTM)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setBookForm(prev => ({
                      ...prev,
                      meetingType: 'PRINCIPAL_CONNECT',
                      recipientRole: 'PRINCIPAL',
                      recipientName: 'Dr. R. K. Mukherjee (School Principal)',
                    }));
                  }}
                  className={`py-2 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
                    bookForm.meetingType === 'PRINCIPAL_CONNECT'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                  }`}
                >
                  <Shield size={15} />
                  <span>Principal Connect (1:1)</span>
                </button>
              </div>

              <form onSubmit={handleBookSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Student Ward
                    </label>
                    <input
                      type="text"
                      disabled
                      value={`${bookForm.studentName} (${bookForm.studentClass})`}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs font-bold text-gray-700 dark:text-gray-300"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Recipient / Faculty Mentor
                    </label>
                    <select
                      value={bookForm.recipientName}
                      onChange={e => {
                        const fac = facultyList.find(f => f.name === e.target.value);
                        setBookForm(prev => ({
                          ...prev,
                          recipientName: e.target.value,
                          recipientRole: (fac?.role || 'CLASS_TEACHER') as any,
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      {facultyList
                        .filter(f => f.type === bookForm.meetingType)
                        .map(fac => (
                          <option key={fac.name} value={fac.name}>
                            {fac.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Conference Category
                  </label>
                  <select
                    value={bookForm.category}
                    onChange={e => setBookForm(prev => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACADEMIC_PROGRESS">Academic Progress & Grade Improvement</option>
                    <option value="EXAM_PREPARATION">Pre-Board & Term Exam Strategy</option>
                    <option value="BEHAVIORAL_WELLBEING">Behavioral & Pastoral Wellbeing</option>
                    <option value="HOMEWORK_SUBMISSION">Homework Compliance & Lab Notebooks</option>
                    <option value="SPECIAL_NEEDS">Special Educational Needs / Accommodations</option>
                    <option value="CAREER_GUIDANCE">Stream Selection & Career Guidance</option>
                    <option value="ADMIN_FEES">Administrative, Scholarships & Fees</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Format</label>
                    <select
                      value={bookForm.mode}
                      onChange={e => setBookForm(prev => ({ ...prev, mode: e.target.value as any }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    >
                      <option value="VIRTUAL_MEET">Virtual Video Meet</option>
                      <option value="IN_PERSON">In-Person (Campus)</option>
                      <option value="PHONE_CALL">Phone Call</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    <input
                      type="date"
                      value={bookForm.requestedDate}
                      onChange={e => setBookForm(prev => ({ ...prev, requestedDate: e.target.value }))}
                      min="2026-09-28"
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Time Slot</label>
                    <select
                      value={bookForm.timeSlot}
                      onChange={e => setBookForm(prev => ({ ...prev, timeSlot: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    >
                      <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                      <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                      <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                      <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                      <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* OPTIONAL ADMIN OVERSIGHT TOGGLE (Crucial User Requirement) */}
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-amber-600" />
                      <div>
                        <span className="text-xs font-black text-amber-950 dark:text-amber-200">
                          Optional Admin / Principal Oversight
                        </span>
                        <p className="text-[10px] text-amber-800 dark:text-amber-300">
                          Allow School Leadership to track this meeting, view minutes, and participate as observer.
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={bookForm.adminOversight}
                      onChange={e => setBookForm(prev => ({ ...prev, adminOversight: e.target.checked }))}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Agenda & Discussion Points <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Enter specific topics, queries, or subject areas to discuss..."
                    value={bookForm.agenda}
                    onChange={e => setBookForm(prev => ({ ...prev, agenda: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-3 border-t dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setIsBookModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition"
                  >
                    Submit Conference Request
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 2: STAFF REVIEW & CONFIRMATION                                      */}
        {/* ========================================================================= */}
        {selectedMeetingForAction && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                <h3 className="text-base font-black text-gray-900 dark:text-white">Confirm Conference Appointment</h3>
                <button
                  onClick={() => setSelectedMeetingForAction(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl text-xs space-y-1">
                <p>
                  <strong>Parent:</strong> {selectedMeetingForAction.parentName} ({selectedMeetingForAction.parentPhone})
                </p>
                <p>
                  <strong>Student:</strong> {selectedMeetingForAction.studentName} ({selectedMeetingForAction.studentClass})
                </p>
                <p>
                  <strong>Slot:</strong> {selectedMeetingForAction.requestedDate} @ {selectedMeetingForAction.timeSlot}
                </p>
                <p>
                  <strong>Agenda:</strong> {selectedMeetingForAction.agenda}
                </p>
              </div>

              <div className="space-y-3">
                {selectedMeetingForAction.mode === 'VIRTUAL_MEET' ? (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Google Meet / Zoom URL
                    </label>
                    <input
                      type="text"
                      value={staffVirtualLink}
                      onChange={e => setStaffVirtualLink(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Conference Venue / Office Room
                    </label>
                    <input
                      type="text"
                      value={staffLocation}
                      onChange={e => setStaffLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Staff Preparation & Confirmation Remarks
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Add brief note or instructions for the parent..."
                    value={staffActionNotes}
                    onChange={e => setStaffActionNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-700">
                <button
                  type="button"
                  onClick={() => setSelectedMeetingForAction(null)}
                  className="px-3.5 py-2 rounded-xl border text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(selectedMeetingForAction.id, 'CONFIRMED')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  Confirm & Notify Parent
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 3: RESCHEDULE MODAL                                                 */}
        {/* ========================================================================= */}
        {rescheduleModalMeeting && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                <h3 className="text-base font-black text-gray-900 dark:text-white">Reschedule Meeting Slot</h3>
                <button
                  onClick={() => setRescheduleModalMeeting(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleRescheduleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={e => setRescheduleDate(e.target.value)}
                    min="2026-09-28"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">New Time Slot</label>
                  <select
                    value={rescheduleSlot}
                    onChange={e => setRescheduleSlot(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  >
                    <option value="09:30 AM - 10:00 AM">09:30 AM - 10:00 AM</option>
                    <option value="10:00 AM - 10:30 AM">10:00 AM - 10:30 AM</option>
                    <option value="11:30 AM - 12:00 PM">11:30 AM - 12:00 PM</option>
                    <option value="02:30 PM - 03:00 PM">02:30 PM - 03:00 PM</option>
                    <option value="03:30 PM - 04:00 PM">03:30 PM - 04:00 PM</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Reason for Reschedule
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Faculty examination duty or parent requested shift"
                    value={rescheduleReasonText}
                    onChange={e => setRescheduleReasonText(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setRescheduleModalMeeting(null)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    Confirm Reschedule
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 4: MEETING MINUTES & ACTION ITEMS (MOM)                             */}
        {/* ========================================================================= */}
        {minutesModalMeeting && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in zoom-in-95 my-8">
              <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                    <ListChecks size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 dark:text-white">
                      Conference Minutes & Action Items
                    </h3>
                    <p className="text-[10px] text-gray-500">
                      {minutesModalMeeting.studentName} • {minutesModalMeeting.studentClass}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setMinutesModalMeeting(null)}
                  className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <form onSubmit={handleMinutesSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Discussion Summary
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={minutesSummary}
                    onChange={e => setMinutesSummary(e.target.value)}
                    placeholder="Key topics discussed, progress observed, challenges identified..."
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                {/* ACTION ITEMS CHECKLIST */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Action Items & Targets
                  </label>
                  <div className="space-y-2 mb-2">
                    {minutesActionItems.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs text-gray-800 dark:text-gray-200"
                      >
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-emerald-500 flex-shrink-0" />
                          <span>{item}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setMinutesActionItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-gray-400 hover:text-red-500"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Add an action item (e.g. Complete chapter 4 revision test)..."
                      value={newActionItemInput}
                      onChange={e => setNewActionItemInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newActionItemInput.trim()) {
                            setMinutesActionItems(prev => [...prev, newActionItemInput.trim()]);
                            setNewActionItemInput('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newActionItemInput.trim()) {
                          setMinutesActionItems(prev => [...prev, newActionItemInput.trim()]);
                          setNewActionItemInput('');
                        }
                      }}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-xs font-bold rounded-xl"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Resolution Status
                    </label>
                    <select
                      value={minutesResolutionStatus}
                      onChange={e => setMinutesResolutionStatus(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    >
                      <option value="RESOLVED">Resolved & Closed</option>
                      <option value="FOLLOW_UP_REQUIRED">Follow-up Required</option>
                      <option value="ESCALATED_TO_ADMIN">Escalate to Leadership / Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                      Next Follow-up Date
                    </label>
                    <input
                      type="date"
                      value={minutesFollowUpDate}
                      onChange={e => setMinutesFollowUpDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Admin Notes if applicable */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Leadership / Admin Observation Remarks
                  </label>
                  <input
                    type="text"
                    placeholder="Principal / Admin review feedback..."
                    value={minutesAdminNotes}
                    onChange={e => setMinutesAdminNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setMinutesModalMeeting(null)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/30"
                  >
                    Save Minutes & Complete
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL 5: MANAGE SLOTS & BLOCK DATES                                       */}
        {/* ========================================================================= */}
        {showBlockModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b dark:border-gray-700 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Settings size={16} />
                  </div>
                  <h3 className="text-base font-black text-gray-900 dark:text-white">PTM Slots & Availability</h3>
                </div>
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center"
                >
                  <X size={15} />
                </button>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-2xl text-xs space-y-1 text-blue-900 dark:text-blue-200">
                <p className="font-bold">Standard Slots per Working Day: 5 Slots</p>
                <p className="text-[11px] text-blue-700 dark:text-blue-300">
                  09:30 AM, 10:00 AM, 11:30 AM, 02:30 PM, 03:30 PM
                </p>
              </div>

              <form
                onSubmit={e => {
                  e.preventDefault();
                  toast.success(`Date ${blockDate} blocked for consultations: "${blockReason}"`);
                  setShowBlockModal(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Slot Duration
                  </label>
                  <select
                    value={slotDuration}
                    onChange={e => setSlotDuration(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  >
                    <option value="15">15 Minutes (Express check-in)</option>
                    <option value="30">30 Minutes (Standard conference)</option>
                    <option value="45">45 Minutes (Comprehensive evaluation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Block Date for School Events / Exams
                  </label>
                  <input
                    type="date"
                    required
                    value={blockDate}
                    onChange={e => setBlockDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                    Reason / Event Description
                  </label>
                  <input
                    type="text"
                    required
                    value={blockReason}
                    onChange={e => setBlockReason(e.target.value)}
                    placeholder="e.g. CBSE Inspection / Board Examination"
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-xs font-medium"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setShowBlockModal(false)}
                    className="px-3.5 py-2 rounded-xl border text-xs font-bold text-gray-600 dark:text-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/30"
                  >
                    Save & Block Date
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
