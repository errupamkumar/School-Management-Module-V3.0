import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET /api/fees/groups: List all fee groups
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');
    const academicYear = searchParams.get('academicYear') || '2025-26';

    const where: any = { academicYear };
    if (campusId && campusId !== 'ALL') {
      where.campusId = campusId;
    }

    const groups = await prisma.feeGroup.findMany({
      where,
      include: {
        campus: { select: { id: true, name: true } },
        feeStructures: {
          include: {
            class: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { studentOverrides: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: groups });
  } catch (error: any) {
    console.error('Fee groups error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST /api/fees/groups: Create a new fee group package (SA-08)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, academicYear = '2025-26', campusId, feeStructureIds = [] } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Fee group name is required' }, { status: 400 });
    }

    // Resolve campusId
    let resolvedCampusId = campusId;
    if (!resolvedCampusId || resolvedCampusId === 'ALL') {
      const firstCampus = await prisma.campus.findFirst({ where: { isActive: true } });
      if (firstCampus) resolvedCampusId = firstCampus.id;
    }

    if (!resolvedCampusId) {
      return NextResponse.json({ success: false, error: 'Valid campusId is required' }, { status: 400 });
    }

    const group = await prisma.feeGroup.create({
      data: {
        name: name.trim(),
        description: description || null,
        academicYear,
        campusId: resolvedCampusId,
        feeStructures: feeStructureIds.length > 0 ? {
          connect: feeStructureIds.map((id: string) => ({ id })),
        } : undefined,
      },
      include: {
        feeStructures: {
          include: { class: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: group, message: 'Fee group package created successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Create fee group error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
