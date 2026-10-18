import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export interface CampusPresence {
  studentId: string;
  studentName: string;
  studentClass: string;
  status: 'INSIDE_CAMPUS' | 'LATE_ENTRY' | 'ABSENT' | 'DEPARTED';
  statusLabel: string;
  gateName: string;
  checkInTime?: string;
  checkOutTime?: string;
  isSafe: boolean;
  busRoute?: string;
  timeline: Array<{
    time: string;
    event: string;
    detail: string;
    type: 'SUCCESS' | 'WARNING' | 'ALERT' | 'INFO';
  }>;
}

// Current campus presence state for Aarav Sharma (Class 10-A)
let currentPresence: CampusPresence = {
  studentId: 'student-1',
  studentName: 'Aarav Sharma',
  studentClass: 'Class 10-A',
  status: 'INSIDE_CAMPUS',
  statusLabel: 'Inside Campus - Safe & Present',
  gateName: 'Gate 1 (Main Entrance)',
  checkInTime: '07:52 AM',
  isSafe: true,
  busRoute: 'Bus Route 4 (Tagore Garden)',
  timeline: [
    {
      time: '07:15 AM',
      event: 'School Bus Boarded',
      detail: 'Aarav boarded Bus Route 4 at Tagore Garden Stop (GPS Verified).',
      type: 'INFO',
    },
    {
      time: '07:52 AM',
      event: 'Gate 1 RFID Check-In',
      detail: 'RFID Student ID Card tapped at Gate 1. Verified safe arrival.',
      type: 'SUCCESS',
    },
    {
      time: '08:00 AM',
      event: 'Classroom Roll Call',
      detail: 'Marked PRESENT in Class 10-A Room 101 by Mr. Arun Sharma.',
      type: 'SUCCESS',
    },
  ],
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId') || 'student-1';

    return NextResponse.json({
      success: true,
      data: currentPresence,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { action, studentName = 'Aarav Sharma', gate = 'Gate 1' } = body;

    const d = new Date();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let notificationTitle = '';
    let notificationMsg = '';
    let notificationType: 'SUCCESS' | 'WARNING' | 'ALERT' | 'INFO' = 'INFO';

    if (action === 'GATE_IN') {
      currentPresence.status = 'INSIDE_CAMPUS';
      currentPresence.statusLabel = 'Inside Campus - Safe & Present';
      currentPresence.checkInTime = timeStr;
      currentPresence.checkOutTime = undefined;
      currentPresence.isSafe = true;
      currentPresence.timeline.unshift({
        time: timeStr,
        event: 'Gate RFID Check-In',
        detail: `${studentName} tapped RFID Card at ${gate}. Safe arrival verified.`,
        type: 'SUCCESS',
      });

      notificationTitle = `🟢 Safe Arrival: ${studentName}`;
      notificationMsg = `${studentName} has safely reached school campus at ${timeStr} via ${gate} RFID Scanner.`;
      notificationType = 'SUCCESS';
    } else if (action === 'LATE_ENTRY') {
      currentPresence.status = 'LATE_ENTRY';
      currentPresence.statusLabel = 'Late Arrival Recorded';
      currentPresence.checkInTime = timeStr;
      currentPresence.isSafe = true;
      currentPresence.timeline.unshift({
        time: timeStr,
        event: 'Late Arrival Gate Scan',
        detail: `${studentName} checked in late at ${timeStr} (Class started at 08:00 AM).`,
        type: 'WARNING',
      });

      notificationTitle = `🟡 Late Arrival Alert: ${studentName}`;
      notificationMsg = `${studentName} arrived at school at ${timeStr} (25 minutes late for morning classes). Late slip issued.`;
      notificationType = 'WARNING';
    } else if (action === 'ABSENT_ALERT') {
      currentPresence.status = 'ABSENT';
      currentPresence.statusLabel = 'Marked Absent - Action Required';
      currentPresence.checkInTime = undefined;
      currentPresence.isSafe = false;
      currentPresence.timeline.unshift({
        time: timeStr,
        event: 'Morning Roll Call Absent Alert',
        detail: `${studentName} was not found in morning assembly or Period 1 roll call.`,
        type: 'ALERT',
      });

      notificationTitle = `🔴 Absence Alert: ${studentName}`;
      notificationMsg = `Urgent: ${studentName} was marked absent for Morning Roll Call today (${timeStr}). Please contact school if this is unexpected.`;
      notificationType = 'ALERT';
    } else if (action === 'GATE_OUT') {
      currentPresence.status = 'DEPARTED';
      currentPresence.statusLabel = 'Departed Campus via Bus';
      currentPresence.checkOutTime = timeStr;
      currentPresence.isSafe = true;
      currentPresence.timeline.unshift({
        time: timeStr,
        event: 'Gate Exit & Bus Boarding',
        detail: `${studentName} exited school via Gate 2 and boarded School Bus Route 4.`,
        type: 'INFO',
      });

      notificationTitle = `🔵 Campus Exit: ${studentName}`;
      notificationMsg = `${studentName} has departed school premises at ${timeStr} via Gate 2 (Boarded Bus Route 4).`;
      notificationType = 'INFO';
    }

    // Forward notification to /api/notifications internal call
    try {
      await fetch(new URL('/api/notifications', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: notificationTitle,
          message: notificationMsg,
          category: action === 'GATE_IN' ? 'SAFE_ARRIVAL' : 'ATTENDANCE',
          type: notificationType,
          studentName,
          studentClass: 'Class 10-A',
          actionUrl: '/dashboard/parent',
          metadata: { action, time: timeStr, gate },
        }),
      });
    } catch (e) {}

    return NextResponse.json({
      success: true,
      message: `Campus event ${action} processed and parent notification dispatched!`,
      data: currentPresence,
      notification: { title: notificationTitle, message: notificationMsg, type: notificationType },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
