import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface PomodoroSession {
  id: string;
  studentId: string;
  subject: string;
  taskTitle: string;
  durationMinutes: number;
  plannedMinutes?: number;
  completedAt: string;
  timestamp: number;
  mode: 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK';
  status: 'COMPLETED' | 'EARLY_STOP';
  notes?: string;
  rating?: number;
}

const now = Date.now();
const oneHourAgo = now - 60 * 60 * 1000;
const twoHoursAgo = now - 2 * 60 * 60 * 1000;
const yesterday = now - 24 * 60 * 60 * 1000;
const twoDaysAgo = now - 48 * 60 * 60 * 1000;

let pomodoroHistoryStore: PomodoroSession[] = [
  {
    id: 'pomo-1',
    studentId: 'student-1',
    subject: 'Mathematics',
    taskTitle: 'Quadratic Equations Exercise 4.2 Derivations & Roots',
    durationMinutes: 25,
    plannedMinutes: 25,
    completedAt: 'Today, 08:30 PM',
    timestamp: twoHoursAgo,
    mode: 'FOCUS',
    status: 'COMPLETED',
    notes: 'Mastered finding roots by factorization & discriminant method',
    rating: 5,
  },
  {
    id: 'pomo-2',
    studentId: 'student-1',
    subject: 'Science (Physics)',
    taskTitle: 'Ray diagrams for concave mirror & Cartesian sign conventions',
    durationMinutes: 25,
    plannedMinutes: 25,
    completedAt: 'Today, 07:45 PM',
    timestamp: oneHourAgo,
    mode: 'FOCUS',
    status: 'COMPLETED',
    notes: 'Practiced 6 mirror cases; remembered virtual image focal point rules',
    rating: 4,
  },
  {
    id: 'pomo-3',
    studentId: 'student-1',
    subject: 'Social Science',
    taskTitle: 'Nationalism in Europe timeline review & treaty dates',
    durationMinutes: 25,
    plannedMinutes: 25,
    completedAt: 'Today, 06:15 PM',
    timestamp: now - 3 * 3600 * 1000,
    mode: 'FOCUS',
    status: 'COMPLETED',
    notes: 'Memorized Treaty of Vienna (1815) & Frankfurt Parliament dates',
    rating: 5,
  },
  {
    id: 'pomo-4',
    studentId: 'student-1',
    subject: 'Computer Science',
    taskTitle: 'Python loops and binary search logic revision',
    durationMinutes: 20,
    plannedMinutes: 25,
    completedAt: 'Yesterday, 09:00 PM',
    timestamp: yesterday,
    mode: 'FOCUS',
    status: 'EARLY_STOP',
    notes: 'Finished early; binary search code tested and working',
    rating: 4,
  },
  {
    id: 'pomo-5',
    studentId: 'student-1',
    subject: 'Science (Chemistry/Bio)',
    taskTitle: 'Chemical Reactions & Balancing Redox Equations',
    durationMinutes: 45,
    plannedMinutes: 45,
    completedAt: '2 days ago',
    timestamp: twoDaysAgo,
    mode: 'FOCUS',
    status: 'COMPLETED',
    notes: 'Solved 15 balancing equations from NCERT exemplar',
    rating: 5,
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const studentId = (session?.user as any)?.id || 'student-1';

    const { searchParams } = new URL(req.url);
    const subjectFilter = searchParams.get('subject');
    const timeframe = searchParams.get('timeframe'); // 'today', 'week', 'all'

    let sessions = pomodoroHistoryStore.filter(s => s.studentId === studentId || s.studentId === 'student-1');

    if (subjectFilter && subjectFilter !== 'ALL') {
      sessions = sessions.filter(s => s.subject.toLowerCase() === subjectFilter.toLowerCase());
    }

    if (timeframe === 'today') {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      sessions = sessions.filter(s => s.timestamp >= startOfDay.getTime() || s.completedAt.includes('Today') || s.completedAt === 'Just now');
    }

    const totalMinutes = sessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const completedSessions = sessions.filter(s => s.status === 'COMPLETED').length;

    // Calculate subject breakdown for analytics
    const subjectMap: Record<string, number> = {};
    sessions.forEach(s => {
      subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.durationMinutes;
    });

    const subjectBreakdown = Object.entries(subjectMap).map(([subject, minutes]) => ({
      subject,
      minutes,
      percentage: totalMinutes > 0 ? Math.round((minutes / totalMinutes) * 100) : 0,
    }));

    // Calculate today's minutes specifically
    const todaySessions = pomodoroHistoryStore.filter(
      s => (s.studentId === studentId || s.studentId === 'student-1') &&
           (s.completedAt.includes('Today') || s.completedAt === 'Just now')
    );
    const todayMinutes = todaySessions.reduce((acc, curr) => acc + curr.durationMinutes, 0);

    return NextResponse.json({
      success: true,
      data: sessions,
      summary: {
        totalMinutes,
        todayMinutes,
        completedSessions,
        currentStreakDays: 4,
        dailyTargetMinutes: 100,
        progressPercent: Math.min(100, Math.round((todayMinutes / 100) * 100)),
        subjectBreakdown,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { subject, taskTitle, durationMinutes, plannedMinutes, mode, status, notes, rating } = body;

    const formatCurrentTime = () => {
      const d = new Date();
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    };

    const newSession: PomodoroSession = {
      id: `pomo-${Date.now()}`,
      studentId: (session?.user as any)?.id || 'student-1',
      subject: subject || 'Mathematics',
      taskTitle: taskTitle || 'Self-study revision sprint',
      durationMinutes: durationMinutes || 25,
      plannedMinutes: plannedMinutes || durationMinutes || 25,
      completedAt: formatCurrentTime(),
      timestamp: Date.now(),
      mode: mode || 'FOCUS',
      status: status || 'COMPLETED',
      notes: notes || '',
      rating: rating || 5,
    };

    pomodoroHistoryStore.unshift(newSession);

    return NextResponse.json({
      success: true,
      message: 'Study session logged into your study history! Great work! 🎯',
      data: newSession,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id === 'all') {
      pomodoroHistoryStore = [];
      return NextResponse.json({ success: true, message: 'All study history cleared.' });
    }

    if (id) {
      pomodoroHistoryStore = pomodoroHistoryStore.filter(s => s.id !== id);
      return NextResponse.json({ success: true, message: 'Session deleted from history.' });
    }

    return NextResponse.json({ success: false, error: 'Missing session ID' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
