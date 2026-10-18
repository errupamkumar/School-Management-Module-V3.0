import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Fetch all classes a student is associated with
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        class: true,
        section: true,
        classEnrollments: {
          include: {
            class: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        studentId: student.id,
        primaryClass: student.class,
        primarySection: student.section,
        enrollments: student.classEnrollments,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Sync / update multiple class associations for a student (SA-06)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { classIds, academicYear = '2025-26', primaryClassId } = body;

    if (!Array.isArray(classIds)) {
      return NextResponse.json({ success: false, error: 'classIds array is required' }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { id: params.id },
    });

    if (!student) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Delete existing secondary enrollments for this academic year
      await tx.studentClassEnrollment.deleteMany({
        where: {
          studentId: params.id,
          academicYear,
        },
      });

      // 2. Create new class enrollments
      if (classIds.length > 0) {
        for (const cId of classIds) {
          await tx.studentClassEnrollment.create({
            data: {
              studentId: params.id,
              classId: cId,
              academicYear,
              isPrimary: cId === (primaryClassId || student.classId),
            },
          });
        }
      }

      // 3. If primaryClassId changed, update student's primary classId
      if (primaryClassId && primaryClassId !== student.classId) {
        await tx.student.update({
          where: { id: params.id },
          data: { classId: primaryClassId },
        });
      }
    });

    const updatedStudent = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        class: true,
        classEnrollments: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Assigned student to ${classIds.length} classes`,
      data: updatedStudent,
    });
  } catch (error: any) {
    console.error('Multi-class assignment error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
