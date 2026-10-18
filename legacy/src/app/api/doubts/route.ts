import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export interface StudentDoubt {
  id: string;
  studentId: string;
  studentName: string;
  studentClass: string;
  subject: string;
  teacherName: string;
  chapter: string;
  question: string;
  status: 'RESOLVED' | 'PENDING';
  teacherReply?: string;
  repliedAt?: string;
  urgency: 'HIGH' | 'NORMAL';
  createdAt: string;
}

let doubtsStore: StudentDoubt[] = [
  {
    id: 'd-1',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    subject: 'Mathematics',
    teacherName: 'Mr. Arun Sharma',
    chapter: 'Quadratic Equations (Exercise 4.3)',
    question: 'Sir, I am confused about completing the square method when coefficient of x² is not 1. Can we divide the entire equation by a first?',
    status: 'RESOLVED',
    teacherReply: 'Yes, exactly Aarav! Always divide the entire equation by "a" so the x² coefficient becomes 1, then add and subtract (b/2a)². Check Page 78 of your NCERT exemplar.',
    repliedAt: 'Yesterday, 04:30 PM',
    urgency: 'NORMAL',
    createdAt: '2026-09-23T10:15:00.000Z',
  },
  {
    id: 'd-2',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    subject: 'Science (Physics)',
    teacherName: 'Mr. Deepak Verma',
    chapter: 'Light - Reflection & Refraction',
    question: 'Sir, for the concave mirror ray diagram when object is placed between Focus (F) and Pole (P), is the virtual image formed behind the mirror magnified or diminished?',
    status: 'RESOLVED',
    teacherReply: 'It is always virtual, erect, and highly ENLARGED (magnified). This is the exact principle used by dentists and for shaving mirrors!',
    repliedAt: '2 days ago',
    urgency: 'HIGH',
    createdAt: '2026-09-22T14:20:00.000Z',
  },
  {
    id: 'd-3',
    studentId: 'student-1',
    studentName: 'Aarav Sharma',
    studentClass: 'Class 10-A',
    subject: 'Social Science',
    teacherName: 'Mrs. Kavita Mishra',
    chapter: 'Nationalism in India',
    question: 'Ma\'am, in the 5-mark question for Poona Pact 1932, do we also need to mention the Communal Award by Ramsay MacDonald?',
    status: 'PENDING',
    urgency: 'NORMAL',
    createdAt: '2026-09-24T18:00:00.000Z',
  }
];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(req.url);
    const subject = searchParams.get('subject');

    let result = [...doubtsStore];
    if (subject && subject !== 'ALL') {
      result = result.filter(d => d.subject.toLowerCase() === subject.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      data: result,
      total: result.length,
      resolvedCount: result.filter(d => d.status === 'RESOLVED').length,
      pendingCount: result.filter(d => d.status === 'PENDING').length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { subject, teacherName, chapter, question, urgency } = body;

    if (!subject || !question) {
      return NextResponse.json({ success: false, error: 'Subject and Question are required.' }, { status: 400 });
    }

    const newDoubt: StudentDoubt = {
      id: `d-${Date.now()}`,
      studentId: (session?.user as any)?.id || 'student-1',
      studentName: session?.user?.name || 'Aarav Sharma',
      studentClass: 'Class 10-A',
      subject,
      teacherName: teacherName || 'Subject Faculty',
      chapter: chapter || 'General Chapter Query',
      question,
      status: 'PENDING',
      urgency: urgency || 'NORMAL',
      createdAt: new Date().toISOString(),
    };

    doubtsStore.unshift(newDoubt);

    return NextResponse.json({
      success: true,
      message: `Your doubt has been submitted to ${newDoubt.teacherName}. You will receive an alert once answered!`,
      data: newDoubt,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
