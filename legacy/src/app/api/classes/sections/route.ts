import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// POST: Add a new section to an existing class
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, classId, campusId, capacity = 40, classTeacherId } = body;

    if (!name || !classId) {
      return NextResponse.json(
        { success: false, error: 'Section name and classId are required.' },
        { status: 400 }
      );
    }

    // Lookup campusId from class if not provided
    let finalCampusId = campusId;
    if (!finalCampusId) {
      const cls = await prisma.class.findUnique({
        where: { id: classId },
        select: { campusId: true },
      });
      if (cls) finalCampusId = cls.campusId;
    }

    const section = await prisma.section.create({
      data: {
        name: name.toUpperCase().trim(),
        classId,
        campusId: finalCampusId,
        capacity: Number(capacity) || 40,
        classTeacherId: classTeacherId || null,
      },
      include: {
        classTeacher: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, data: section }, { status: 201 });
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'A section with this name already exists in this class.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT: Update an existing section (capacity, classTeacherId)
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, capacity, classTeacherId } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Section ID is required.' },
        { status: 400 }
      );
    }

    const updated = await prisma.section.update({
      where: { id },
      data: {
        ...(capacity !== undefined ? { capacity: Number(capacity) } : {}),
        ...(classTeacherId !== undefined ? { classTeacherId: classTeacherId || null } : {}),
      },
      include: {
        classTeacher: { select: { firstName: true, lastName: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
