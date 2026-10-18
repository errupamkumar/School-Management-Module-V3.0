import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all subjects or subjects for a specific class
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (classId) {
      const classSubjects = await prisma.classSubject.findMany({
        where: { classId },
        include: { subject: true },
      });
      return NextResponse.json({
        success: true,
        data: classSubjects.map((cs) => cs.subject),
      });
    }

    const subjects = await prisma.subject.findMany({
      include: {
        classSubjects: {
          include: {
            class: { select: { id: true, name: true, numericOrder: true } },
          },
        },
        _count: {
          select: {
            classSubjects: true,
            teacherSubjects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: subjects });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST: Create a new Subject
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, code, subjectType = 'THEORY', isOptional = false, classIds = [] } = body;

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: 'Name and Code are required.' },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        subjectType,
        isOptional: Boolean(isOptional),
        classSubjects: {
          create: classIds.map((cId: string) => ({
            classId: cId,
          })),
        },
      },
      include: {
        classSubjects: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A subject with this code already exists.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Bulk assign/sync subjects to a class
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { classId, subjectIds } = body;

    if (!classId || !Array.isArray(subjectIds)) {
      return NextResponse.json(
        { success: false, error: 'classId and subjectIds array are required.' },
        { status: 400 }
      );
    }

    // Delete existing class subjects for this class
    await prisma.classSubject.deleteMany({
      where: { classId },
    });

    // Re-create assigned subjects
    if (subjectIds.length > 0) {
      await prisma.classSubject.createMany({
        data: subjectIds.map((sId: string) => ({
          classId,
          subjectId: sId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Subjects updated for class successfully.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
