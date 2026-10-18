import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

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

export interface MeetingRecord {
  id: string;
  meetingType: MeetingType; // 'PRINCIPAL_CONNECT' or 'TEACHER_PARENT_MEETING'
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
  adminOversight: boolean; // OPTIONAL ADMIN / PRINCIPAL OVERSIGHT & TRACKING
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
  updatedAt?: string;
}

// In-memory persistent store for demo/runtime meetings
let meetingsStore: MeetingRecord[] = [
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
    location: "Principal Executive Office (Administrative Wing, 1st Floor)",
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
    adminOversight: true, // Tracked optionally by Admin as requested
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
    location: "Principal Executive Office, Block A",
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

export async function GET(req: NextRequest) {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('role') || req.headers.get('x-user-role') || (session?.user as any)?.role;

    // RBAC: Students are strictly forbidden from viewing parent-leadership/faculty meetings
    if (userRole === Role.STUDENT) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: 1-to-1 Parent & Leadership/Faculty meetings are restricted from student access.',
        },
        { status: 403 }
      );
    }

    const filterStatus = searchParams.get('status');
    const filterType = searchParams.get('type') as MeetingType | 'ALL' | null;
    const filterAdminOversight = searchParams.get('adminOversight');
    const filterRecipientRole = searchParams.get('recipientRole');
    const searchQuery = (searchParams.get('search') || '').trim().toLowerCase();

    let result = [...meetingsStore];

    // Role-specific baseline filtering:
    // If authenticated user is a Parent, only return their children's meetings
    if (userRole === Role.PARENT) {
      const parentName = session?.user?.name;
      result = result.filter(
        m => m.parentId === 'parent-1' || (parentName && m.parentName.toLowerCase().includes(parentName.toLowerCase()))
      );
    }

    // Filter by Meeting Type ('PRINCIPAL_CONNECT' vs 'TEACHER_PARENT_MEETING')
    if (filterType && filterType !== 'ALL') {
      result = result.filter(m => m.meetingType === filterType);
    }

    // Filter by Meeting Status
    if (filterStatus && filterStatus !== 'ALL') {
      result = result.filter(m => m.status === filterStatus);
    }

    // Filter by Admin Oversight / Tracking
    if (filterAdminOversight === 'true') {
      result = result.filter(m => m.adminOversight === true);
    } else if (filterAdminOversight === 'false') {
      result = result.filter(m => m.adminOversight === false);
    }

    // Filter by Recipient Role
    if (filterRecipientRole && filterRecipientRole !== 'ALL') {
      result = result.filter(m => m.recipientRole === filterRecipientRole);
    }

    // Keyword Search
    if (searchQuery) {
      result = result.filter(
        m =>
          m.studentName.toLowerCase().includes(searchQuery) ||
          m.parentName.toLowerCase().includes(searchQuery) ||
          m.recipientName.toLowerCase().includes(searchQuery) ||
          (m.teacherName && m.teacherName.toLowerCase().includes(searchQuery)) ||
          m.agenda.toLowerCase().includes(searchQuery) ||
          m.studentClass.toLowerCase().includes(searchQuery)
      );
    }

    // Compute live analytics summary
    const totalCount = meetingsStore.length;
    const confirmedCount = meetingsStore.filter(m => m.status === 'CONFIRMED').length;
    const pendingCount = meetingsStore.filter(m => m.status === 'PENDING').length;
    const completedCount = meetingsStore.filter(m => m.status === 'COMPLETED').length;
    const rescheduledCount = meetingsStore.filter(m => m.status === 'RESCHEDULED').length;
    const cancelledCount = meetingsStore.filter(m => m.status === 'CANCELLED').length;
    const principalConnectCount = meetingsStore.filter(m => m.meetingType === 'PRINCIPAL_CONNECT').length;
    const teacherParentMeetingCount = meetingsStore.filter(m => m.meetingType === 'TEACHER_PARENT_MEETING').length;
    const adminOversightCount = meetingsStore.filter(m => m.adminOversight === true).length;
    const virtualCount = meetingsStore.filter(m => m.mode === 'VIRTUAL_MEET').length;
    const inPersonCount = meetingsStore.filter(m => m.mode === 'IN_PERSON').length;

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
      metrics: {
        totalCount,
        confirmedCount,
        pendingCount,
        completedCount,
        rescheduledCount,
        cancelledCount,
        principalConnectCount,
        teacherParentMeetingCount,
        adminOversightCount,
        virtualCount,
        inPersonCount,
      },
      allowedRoles: ['PARENT', 'TEACHER', 'ADMIN', 'SUPER_ADMIN'],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('role') || req.headers.get('x-user-role') || (session?.user as any)?.role;
    const userId = (session?.user as any)?.id;
    const userPhone = (session?.user as any)?.phone;

    // RBAC: Block Students
    if (userRole === Role.STUDENT) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Students cannot book 1-to-1 meetings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      meetingType: inputMeetingType,
      studentName,
      studentClass,
      studentRollNo,
      recipientRole,
      recipientName,
      teacherId,
      teacherName,
      category,
      mode,
      requestedDate,
      timeSlot,
      agenda,
      adminOversight,
      adminAttendeeName,
      location,
      virtualLink,
    } = body;

    if (!category || !requestedDate || !timeSlot || !agenda || !recipientName) {
      return NextResponse.json(
        { success: false, error: 'Missing required meeting details: category, recipient, date, slot, and agenda are required.' },
        { status: 400 }
      );
    }

    // Auto-infer meetingType if not explicitly passed
    let determinedMeetingType: MeetingType = 'TEACHER_PARENT_MEETING';
    if (
      inputMeetingType === 'PRINCIPAL_CONNECT' ||
      recipientRole === 'PRINCIPAL' ||
      recipientRole === 'VICE_PRINCIPAL' ||
      recipientName.toLowerCase().includes('principal')
    ) {
      determinedMeetingType = 'PRINCIPAL_CONNECT';
    }

    // Prevent double booking on exact slot for same recipient
    const hasSlotCollision = meetingsStore.some(
      m =>
        m.status !== 'CANCELLED' &&
        m.requestedDate === requestedDate &&
        m.timeSlot === timeSlot &&
        m.recipientName.toLowerCase() === recipientName.toLowerCase()
    );

    if (hasSlotCollision) {
      return NextResponse.json(
        {
          success: false,
          error: `Slot collision: ${recipientName} already has a confirmed or pending consultation on ${requestedDate} at ${timeSlot}. Please choose an alternative slot.`,
        },
        { status: 409 }
      );
    }

    const meetingMode: MeetingMode = mode || 'IN_PERSON';
    const isLeadership = determinedMeetingType === 'PRINCIPAL_CONNECT';

    const newMeeting: MeetingRecord = {
      id: `meet-${Date.now()}`,
      meetingType: determinedMeetingType,
      parentId: userId || 'parent-1',
      parentName: session?.user?.name || 'Mr. Rajesh Sharma (Parent)',
      parentPhone: userPhone || '+91 98765 43210',
      studentName: studentName || 'Aarav Sharma',
      studentClass: studentClass || 'Class 10-A',
      studentRollNo: studentRollNo || '14',
      studentAttendance: 95,
      studentGrade: 'A1 (91%)',
      teacherId: teacherId || (determinedMeetingType === 'TEACHER_PARENT_MEETING' ? 'teacher-101' : undefined),
      teacherName: teacherName || (determinedMeetingType === 'TEACHER_PARENT_MEETING' ? recipientName : undefined),
      recipientRole: recipientRole || (isLeadership ? 'PRINCIPAL' : 'CLASS_TEACHER'),
      recipientName,
      category,
      mode: meetingMode,
      requestedDate,
      timeSlot,
      agenda,
      status: 'PENDING',
      location:
        location ||
        (meetingMode === 'IN_PERSON'
          ? isLeadership
            ? "Principal Executive Office, Block A"
            : 'Faculty Consultation Room 204'
          : undefined),
      virtualLink:
        virtualLink ||
        (meetingMode === 'VIRTUAL_MEET'
          ? `https://meet.google.com/nex-ptm-${Math.floor(100 + Math.random() * 900)}`
          : undefined),
      adminOversight: Boolean(adminOversight),
      adminAttendeeName: adminOversight
        ? adminAttendeeName || 'Dr. R. K. Mukherjee (Principal - Overseeing)'
        : undefined,
      createdAt: new Date().toISOString(),
    };

    meetingsStore.unshift(newMeeting);

    const friendlyLabel =
      determinedMeetingType === 'PRINCIPAL_CONNECT'
        ? '1-to-1 Principal Connect consultation'
        : 'Teacher-Parent Meeting (PTM)';

    return NextResponse.json(
      {
        success: true,
        message: `${friendlyLabel} scheduled successfully with ${recipientName}. ${
          newMeeting.adminOversight ? 'Admin/Principal leadership tracking is enabled for this session.' : ''
        }`,
        data: newMeeting,
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let session: any = null;
    try {
      session = await getServerSession(authOptions);
    } catch {
      session = null;
    }
    const { searchParams } = new URL(req.url);
    const userRole = searchParams.get('role') || req.headers.get('x-user-role') || (session?.user as any)?.role;

    // RBAC: Block Students
    if (userRole === Role.STUDENT) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const {
      id,
      status,
      virtualLink,
      location,
      staffNotes,
      timeSlot,
      requestedDate,
      rescheduleReason,
      adminOversight,
      adminAttendeeName,
      adminNotes,
      meetingMinutes,
      triggerReminder,
    } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Meeting ID is required.' }, { status: 400 });
    }

    const idx = meetingsStore.findIndex(m => m.id === id);
    if (idx === -1) {
      return NextResponse.json({ success: false, error: 'Meeting record not found.' }, { status: 404 });
    }

    // Apply updates
    if (status !== undefined) meetingsStore[idx].status = status;
    if (virtualLink !== undefined) meetingsStore[idx].virtualLink = virtualLink;
    if (location !== undefined) meetingsStore[idx].location = location;
    if (staffNotes !== undefined) meetingsStore[idx].staffNotes = staffNotes;
    if (timeSlot !== undefined) meetingsStore[idx].timeSlot = timeSlot;
    if (requestedDate !== undefined) meetingsStore[idx].requestedDate = requestedDate;
    if (rescheduleReason !== undefined) meetingsStore[idx].rescheduleReason = rescheduleReason;

    // Admin Oversight & Tracking controls
    if (adminOversight !== undefined) {
      meetingsStore[idx].adminOversight = Boolean(adminOversight);
      if (meetingsStore[idx].adminOversight && !meetingsStore[idx].adminAttendeeName) {
        meetingsStore[idx].adminAttendeeName =
          adminAttendeeName || 'Dr. R. K. Mukherjee (Principal - Overseeing)';
      }
    }
    if (adminNotes !== undefined) meetingsStore[idx].adminNotes = adminNotes;
    if (adminAttendeeName !== undefined) meetingsStore[idx].adminAttendeeName = adminAttendeeName;

    // Meeting Minutes and Action Items
    if (meetingMinutes !== undefined) {
      meetingsStore[idx].meetingMinutes = {
        ...meetingsStore[idx].meetingMinutes,
        ...meetingMinutes,
      };
      if (status === undefined && meetingsStore[idx].status === 'CONFIRMED') {
        meetingsStore[idx].status = 'COMPLETED';
      }
    }

    // Reminder dispatch simulation
    if (triggerReminder) {
      meetingsStore[idx].reminderSentCount = (meetingsStore[idx].reminderSentCount || 0) + 1;
    }

    meetingsStore[idx].updatedAt = new Date().toISOString();

    return NextResponse.json({
      success: true,
      message: `Meeting updated successfully. ${
        triggerReminder ? 'Calendar alert and SMS reminder dispatched to participants.' : ''
      }`,
      data: meetingsStore[idx],
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
