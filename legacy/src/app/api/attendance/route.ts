import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get('sectionId');
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    if (!sectionId) return NextResponse.json({ success: false, error: 'sectionId is required' }, { status: 400 });

    const students = await prisma.student.findMany({
      where: { sectionId, isActive: true },
      select: { id: true, admissionNo: true, firstName: true, lastName: true, rollNo: true, gender: true },
      orderBy: { rollNo: 'asc' },
    });

    const attendances = await prisma.attendance.findMany({
      where: { sectionId, date: new Date(date) },
    });

    const attendanceMap = new Map(attendances.map((a) => [a.studentId, a]));

    const data = students.map((s) => ({
      ...s,
      attendance: attendanceMap.get(s.id) || null,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sectionId, date, records, markedById } = body;

    // records: [{ studentId, status, remarks }]
    const result = await prisma.$transaction(
      records.map((r: any) =>
        prisma.attendance.upsert({
          where: { studentId_date: { studentId: r.studentId, date: new Date(date) } },
          create: { studentId: r.studentId, sectionId, date: new Date(date), status: r.status, remarks: r.remarks || null, markedById },
          update: { status: r.status, remarks: r.remarks || null },
        })
      )
    );

    return NextResponse.json({ success: true, data: result, message: `Attendance marked for ${result.length} students` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
