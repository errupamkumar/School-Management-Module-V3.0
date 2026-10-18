import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET student by ID with all related academic and financial records
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const student = await prisma.student.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { email: true, phone: true, avatar: true } },
        class: true,
        section: true,
        parent: true,
        attendances: {
          take: 30,
          orderBy: { date: 'desc' },
        },
        feePayments: {
          include: { feeStructure: true },
          orderBy: { createdAt: 'desc' },
        },
        examResults: {
          include: {
            exam: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        documents: true,
        promotions: {
          include: {
            fromClass: true,
            toClass: true,
          },
          orderBy: { promotedAt: 'desc' },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: student });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update student details
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const updated = await prisma.student.update({
      where: { id: params.id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        gender: body.gender,
        dob: body.dob ? new Date(body.dob) : undefined,
        bloodGroup: body.bloodGroup,
        religion: body.religion,
        category: body.category,
        village: body.village || body.address,
        city: body.city,
        pincode: body.pincode,
        classId: body.classId,
        sectionId: body.sectionId,
        rollNo: body.rollNo,
      },
      include: {
        class: true,
        section: true,
        parent: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
