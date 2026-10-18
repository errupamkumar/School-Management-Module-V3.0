import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { submitPublicApplication, checkCapacity } from '@/app/actions/admission';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    if (action === 'check-capacity') {
      const classId = searchParams.get('classId');
      const sectionId = searchParams.get('sectionId') || undefined;
      if (!classId) return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
      const res = await checkCapacity(classId, sectionId);
      return NextResponse.json(res);
    }

    // Public fetch of active campuses and classes for admission form
    const [campuses, classes] = await Promise.all([
      prisma.campus.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true, city: true },
      }),
      prisma.class.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          campusId: true,
          sections: { select: { id: true, name: true, capacity: true } },
        },
        orderBy: { numericOrder: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        campuses,
        classes,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await submitPublicApplication(body);
    return NextResponse.json(res, { status: res.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
