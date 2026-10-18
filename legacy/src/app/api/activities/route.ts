import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface ExtraActivityItem {
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
  upcomingEvent?: {
    title: string;
    date: string;
    location: string;
  };
}

let activitiesStore: ExtraActivityItem[] = [
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
    upcomingEvent: {
      title: 'Inter-House Chess Championship',
      date: 'Oct 14, 2026',
      location: 'Indoor Sports Complex'
    }
  }
];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: activitiesStore,
    total: activitiesStore.length
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { activityId, action } = body;

    const activity = activitiesStore.find(a => a.id === activityId);
    if (!activity) {
      return NextResponse.json({ success: false, error: 'Activity not found' }, { status: 404 });
    }

    if (action === 'TOGGLE_ENROLL') {
      activity.isEnrolledForDemoUser = !activity.isEnrolledForDemoUser;
      if (activity.isEnrolledForDemoUser) {
        activity.enrolledStudentsCount += 1;
      } else {
        activity.enrolledStudentsCount = Math.max(0, activity.enrolledStudentsCount - 1);
      }
      return NextResponse.json({
        success: true,
        message: activity.isEnrolledForDemoUser ? `Successfully enrolled in ${activity.name}!` : `Unenrolled from ${activity.name}.`,
        data: activity,
      });
    }

    return NextResponse.json({ success: true, data: activity });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
