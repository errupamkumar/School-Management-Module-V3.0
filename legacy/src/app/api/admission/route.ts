import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  submitPublicApplication,
  updateInquiryStatus,
  enrollStudentFromInquiry,
  checkCapacity,
  checkDuplicateIdentity,
} from '@/app/actions/admission';
import { AdmissionStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. Check duplicate identity
    if (action === 'check-duplicate') {
      const aadhaarNo = searchParams.get('aadhaarNo');
      const phone = searchParams.get('phone');
      const firstName = searchParams.get('firstName');
      const lastName = searchParams.get('lastName');
      const dob = searchParams.get('dob');
      const res = await checkDuplicateIdentity({ aadhaarNo, phone, firstName, lastName, dob });
      return NextResponse.json(res);
    }

    // 2. Check capacity
    if (action === 'check-capacity') {
      const classId = searchParams.get('classId');
      const sectionId = searchParams.get('sectionId') || undefined;
      if (!classId) return NextResponse.json({ success: false, error: 'classId is required' }, { status: 400 });
      const res = await checkCapacity(classId, sectionId);
      return NextResponse.json(res);
    }

    // 3. Lead CRM / Inquiries Query
    const status = searchParams.get('status') as AdmissionStatus | null;
    const classId = searchParams.get('classId');
    const search = searchParams.get('search');

    const where: any = {};
    if (status) where.status = status;
    if (classId) where.classId = classId;
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { applicationNo: { contains: search } },
        { parentName: { contains: search } },
        { parentPhone: { contains: search } },
      ];
    }

    const [inquiries, counts] = await Promise.all([
      prisma.admissionInquiry.findMany({
        where,
        include: {
          class: { select: { id: true, name: true } },
          section: { select: { id: true, name: true, capacity: true } },
          campus: { select: { id: true, name: true } },
          student: { select: { id: true, admissionNo: true, rollNo: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.admissionInquiry.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

    const stats: Record<string, number> = {
      INQUIRY: 0,
      FORM_SUBMITTED: 0,
      DOCS_VERIFIED: 0,
      SEAT_OFFERED: 0,
      FEES_PAID: 0,
      ENROLLED: 0,
      REJECTED: 0,
      WITHDRAWN: 0,
    };
    counts.forEach((c) => {
      stats[c.status] = c._count.status;
    });

    return NextResponse.json({
      success: true,
      data: inquiries,
      stats,
      total: inquiries.length,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action || 'submit-application';

    if (action === 'enroll') {
      const res = await enrollStudentFromInquiry({
        inquiryId: body.inquiryId,
        campusId: body.campusId,
        classId: body.classId,
        sectionId: body.sectionId,
        rollNo: body.rollNo,
        academicYear: body.academicYear || '2025-26',
      });
      return NextResponse.json(res, { status: res.success ? 201 : 400 });
    }

    // Default: submit public self application
    const res = await submitPublicApplication(body);
    return NextResponse.json(res, { status: res.success ? 201 : 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { inquiryId, status, notes, rejectionReason } = body;
    if (!inquiryId || !status) {
      return NextResponse.json({ success: false, error: 'inquiryId and status are required' }, { status: 400 });
    }
    const res = await updateInquiryStatus(inquiryId, status as AdmissionStatus, notes, rejectionReason);
    return NextResponse.json(res);
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
