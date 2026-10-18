import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const campuses = await prisma.campus.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: campuses });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
