import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  category: 'ATTENDANCE' | 'FEE' | 'EXAM' | 'ANNOUNCEMENT' | 'SAFE_ARRIVAL';
  type: 'INFO' | 'WARNING' | 'ALERT' | 'SUCCESS';
  studentId?: string;
  studentName?: string;
  studentClass?: string;
  timestamp: string;
  createdAt: number;
  isRead: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

// In-memory persistent store shared across sessions
let notificationsStore: NotificationItem[] = [
  {
    id: 'notif-1',
    title: '🟢 Safe School Arrival: Aarav Sharma',
    message: 'Aarav Sharma (Class 10-A) has safely checked in at School Gate 1 at 07:52 AM via RFID Card tap.',
    category: 'SAFE_ARRIVAL',
    type: 'SUCCESS',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    timestamp: 'Today, 07:52 AM',
    createdAt: Date.now() - 3 * 3600 * 1000,
    isRead: false,
    actionUrl: '/dashboard/parent',
    metadata: { gate: 'Gate 1 (Main Entrance)', method: 'RFID_CARD', time: '07:52 AM' },
  },
  {
    id: 'notif-2',
    title: 'Morning Roll Call: Marked Present',
    message: 'Class 10-A Period 1 attendance recorded. Aarav Sharma is present in Room 101.',
    category: 'ATTENDANCE',
    type: 'INFO',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    timestamp: 'Today, 08:05 AM',
    createdAt: Date.now() - 2.5 * 3600 * 1000,
    isRead: true,
    actionUrl: '/attendance',
    metadata: { teacher: 'Mr. Arun Sharma', subject: 'Mathematics' },
  },
  {
    id: 'notif-3',
    title: 'Term 2 Fee Installment Due Soon',
    message: 'School fees of ₹3,000 for Term 2 (Tuition, Lab, LMS) is due on Oct 15, 2026. Online payment is open for Students & Parents.',
    category: 'FEE',
    type: 'WARNING',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    timestamp: 'Yesterday, 04:00 PM',
    createdAt: Date.now() - 24 * 3600 * 1000,
    isRead: false,
    actionUrl: '/fees',
    metadata: { amount: 3000, dueDate: '2026-10-15' },
  },
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const studentId = searchParams.get('studentId');

    let items = [...notificationsStore];

    if (category && category !== 'ALL') {
      items = items.filter(n => n.category === category);
    }

    if (studentId) {
      items = items.filter(n => !n.studentId || n.studentId === studentId);
    }

    const unreadCount = items.filter(n => !n.isRead).length;

    return NextResponse.json({
      success: true,
      data: items,
      unreadCount,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title,
      message,
      category = 'ATTENDANCE',
      type = 'INFO',
      studentId = 'student-1',
      studentName = 'Aarav Sharma',
      studentClass = 'Class 10-A',
      actionUrl,
      metadata = {},
    } = body;

    const d = new Date();
    const timeStr = `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const newNotification: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      message,
      category,
      type,
      studentId,
      studentName,
      studentClass,
      timestamp: timeStr,
      createdAt: Date.now(),
      isRead: false,
      actionUrl: actionUrl || '/dashboard/parent',
      metadata,
    };

    notificationsStore.unshift(newNotification);

    return NextResponse.json({
      success: true,
      message: 'Notification dispatched successfully',
      data: newNotification,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, markAllAsRead } = body;

    if (markAllAsRead) {
      notificationsStore = notificationsStore.map(n => ({ ...n, isRead: true }));
      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (id) {
      notificationsStore = notificationsStore.map(n => n.id === id ? { ...n, isRead: true } : n);
      return NextResponse.json({ success: true, message: 'Notification marked as read' });
    }

    return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id === 'all') {
      notificationsStore = [];
      return NextResponse.json({ success: true, message: 'All notifications cleared' });
    }

    if (id) {
      notificationsStore = notificationsStore.filter(n => n.id !== id);
      return NextResponse.json({ success: true, message: 'Notification removed' });
    }

    return NextResponse.json({ success: false, error: 'Missing notification ID' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
