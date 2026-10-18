import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all teachers
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

    const where: any = { isActive: true };
    if (campusId) where.campusId = campusId;

    const teachers = await prisma.teacher.findMany({
      where,
      include: {
        user: { select: { email: true, phone: true } },
        classTeacher: { select: { id: true, name: true, class: { select: { name: true } } } },
        _count: { select: { subjects: true } },
      },
      orderBy: { firstName: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: teachers.map((t) => ({
        ...t,
        section: t.classTeacher,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
