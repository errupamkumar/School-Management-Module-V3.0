import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const notices = await prisma.notice.findMany({
      where: { isPublished: true },
      orderBy: { publishDate: 'desc' },
      take: 50,
    });
    return NextResponse.json({ success: true, data: notices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const notice = await prisma.notice.create({
      data: {
        title: body.title,
        content: body.content,
        type: body.type || 'GENERAL',
        targetRoles: body.targetRoles || [],
        targetClasses: body.targetClasses || [],
        attachmentUrl: body.attachmentUrl || null,
        publishDate: body.publishDate ? new Date(body.publishDate) : new Date(),
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
        campusId: body.campusId,
        createdById: body.createdById,
      },
    });
    return NextResponse.json({ success: true, data: notice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
