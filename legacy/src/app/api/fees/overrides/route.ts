import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/fees/overrides: List student fee overrides (SA-08)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');
    const academicYear = searchParams.get('academicYear') || '2025-26';

    const where: any = { academicYear };
    if (studentId) where.studentId = studentId;

    const overrides = await prisma.studentFeeOverride.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            firstName: true,
            lastName: true,
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
        feeGroup: { select: { id: true, name: true } },
        feeStructure: { select: { id: true, name: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: overrides });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/fees/overrides: Create or update student fee override (SA-08)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      studentId,
      feeGroupId,
      feeStructureId,
      overrideAmount,
      discount = 0,
      reason,
      academicYear = '2025-26',
    } = body;

    if (!studentId) {
      return NextResponse.json({ success: false, error: 'studentId is required' }, { status: 400 });
    }

    if (!feeGroupId && !feeStructureId) {
      return NextResponse.json(
        { success: false, error: 'Either feeGroupId or feeStructureId must be specified' },
        { status: 400 }
      );
    }

    const override = await prisma.studentFeeOverride.create({
      data: {
        studentId,
        feeGroupId: feeGroupId || null,
        feeStructureId: feeStructureId || null,
        overrideAmount: overrideAmount !== undefined && overrideAmount !== '' ? Number(overrideAmount) : null,
        discount: Number(discount) || 0,
        reason: reason || 'Concession / Student Override',
        academicYear,
      },
      include: {
        student: { select: { firstName: true, lastName: true, admissionNo: true } },
        feeGroup: { select: { name: true } },
        feeStructure: { select: { name: true, amount: true } },
      },
    });

    return NextResponse.json(
      { success: true, data: override, message: 'Student fee override applied successfully' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Student fee override error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
