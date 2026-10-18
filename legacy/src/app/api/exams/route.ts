import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/exams: List exams with class associations and result counts
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const academicYear = searchParams.get('academicYear');
    const campusId = searchParams.get('campusId');

    const where: any = {};
    if (academicYear) where.academicYear = academicYear;

    if (classId) {
      where.OR = [
        { classId },
        { classes: { some: { classId } } },
      ];
    }

    if (campusId && campusId !== 'ALL') {
      where.class = { campusId };
    }

    const exams = await prisma.exam.findMany({
      where,
      include: {
        class: true,
        classes: {
          include: { class: true },
        },
        subjects: {
          include: { subject: true },
        },
        _count: {
          select: { results: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json({ success: true, data: exams });
  } catch (error: any) {
    console.error('Fetch exams error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/exams: Create exam with multi-class associations (SA-09)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      examType = 'HALF_YEARLY',
      academicYear = '2025-26',
      startDate,
      endDate,
      classIds = [],
      classId,
      description,
      subjects = [],
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Exam name is required' }, { status: 400 });
    }

    // Resolve primary classId
    let primaryClassId = classId || (classIds.length > 0 ? classIds[0] : null);
    if (!primaryClassId) {
      const defaultClass = await prisma.class.findFirst();
      if (defaultClass) primaryClassId = defaultClass.id;
    }

    if (!primaryClassId) {
      return NextResponse.json({ success: false, error: 'At least one class must be associated with the exam' }, { status: 400 });
    }

    // All classes to link (combine primary and any selected classIds)
    const allLinkedClassIds = Array.from(new Set([primaryClassId, ...(classIds || [])]));

    const exam = await prisma.exam.create({
      data: {
        name: name.trim(),
        examType,
        academicYear,
        startDate: new Date(startDate || new Date()),
        endDate: new Date(endDate || new Date()),
        classId: primaryClassId,
        description: description || null,
        classes: {
          create: allLinkedClassIds.map((cId) => ({
            classId: cId,
          })),
        },
        subjects: Array.isArray(subjects) && subjects.length > 0 ? {
          create: subjects.map((s: any) => ({
            subjectId: s.subjectId,
            examDate: new Date(s.examDate || startDate),
            startTime: s.startTime || null,
            endTime: s.endTime || null,
            maxMarks: Number(s.maxMarks) || 100,
            passingMarks: Number(s.passingMarks) || 33,
            room: s.room || null,
          })),
        } : undefined,
      },
      include: {
        class: true,
        classes: {
          include: { class: true },
        },
        subjects: {
          include: { subject: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: exam, message: 'Exam scheduled with class associations' }, { status: 201 });
  } catch (error: any) {
    console.error('Create exam error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
