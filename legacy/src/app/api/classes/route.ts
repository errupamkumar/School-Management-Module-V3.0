import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET all classes with sections
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const campusId = searchParams.get('campusId');

    const where: any = { isActive: true };
    if (campusId) where.campusId = campusId;

    const classes = await prisma.class.findMany({
      where,
      include: {
        sections: { include: { classTeacher: { select: { firstName: true, lastName: true } }, _count: { select: { students: true } } } },
        _count: { select: { students: true } },
      },
      orderBy: { numericOrder: 'asc' },
    });

    return NextResponse.json({ success: true, data: classes });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const classRecord = await prisma.class.create({
      data: {
        name: body.name,
        numericOrder: body.numericOrder,
        campusId: body.campusId,
        sections: {
          create: (body.sections || ['A']).map((s: string) => ({
            name: s,
            campusId: body.campusId,
            capacity: body.capacity || 40,
          })),
        },
      },
      include: { sections: true },
    });

    return NextResponse.json({ success: true, data: classRecord }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
