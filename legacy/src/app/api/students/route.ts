import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { generateAdmissionNo } from '@/utils/helpers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');
    const sectionId = searchParams.get('sectionId');
    const campusId = searchParams.get('campusId');
    const session = searchParams.get('session');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');

    const where: any = { isActive: true };
    if (classId) where.classId = classId;
    if (sectionId) where.sectionId = sectionId;
    if (campusId && campusId !== 'ALL') where.campusId = campusId;
    if (session && session !== 'ALL') where.session = session;
    if (search && search.trim()) {
      const trimmedSearch = search.trim();
      const searchTokens = trimmedSearch.split(/\s+/).filter(Boolean);

      const conditions: any[] = [
        { firstName: { contains: trimmedSearch } },
        { lastName: { contains: trimmedSearch } },
        { admissionNo: { contains: trimmedSearch } },
        { rollNo: { contains: trimmedSearch } },
        { parent: { fatherName: { contains: trimmedSearch } } },
        { parent: { fatherPhone: { contains: trimmedSearch } } },
      ];

      // Multi-word search support (e.g. "Manish Kumar" matches firstName: Manish AND lastName: Kumar)
      if (searchTokens.length >= 2) {
        conditions.push({
          AND: [
            { firstName: { contains: searchTokens[0] } },
            { lastName: { contains: searchTokens.slice(1).join(' ') } },
          ],
        });
      }

      where.OR = conditions;
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          class: true,
          section: true,
          parent: true,
          user: { select: { email: true, phone: true } },
          classEnrollments: {
            include: { class: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: [{ createdAt: 'desc' }, { admissionNo: 'desc' }],
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: students,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

const BLOOD_GROUP_MAP: Record<string, any> = {
  'A+': 'A_POSITIVE',
  'A-': 'A_NEGATIVE',
  'B+': 'B_POSITIVE',
  'B-': 'B_NEGATIVE',
  'AB+': 'AB_POSITIVE',
  'AB-': 'AB_NEGATIVE',
  'O+': 'O_POSITIVE',
  'O-': 'O_NEGATIVE',
  'A_POSITIVE': 'A_POSITIVE',
  'A_NEGATIVE': 'A_NEGATIVE',
  'B_POSITIVE': 'B_POSITIVE',
  'B_NEGATIVE': 'B_NEGATIVE',
  'AB_POSITIVE': 'AB_POSITIVE',
  'AB_NEGATIVE': 'AB_NEGATIVE',
  'O_POSITIVE': 'O_POSITIVE',
  'O_NEGATIVE': 'O_NEGATIVE',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const admissionNo = generateAdmissionNo();
    const defaultPassword = await bcrypt.hash('student123', 10);

    // Resolve campusId: if missing or invalid, resolve to first active campus
    let campusId = body.campusId;
    const campusExists = campusId ? await prisma.campus.findUnique({ where: { id: campusId } }) : null;
    if (!campusExists) {
      const defaultCampus = await prisma.campus.findFirst({ where: { isActive: true } });
      if (defaultCampus) campusId = defaultCampus.id;
    }

    // Resolve classId: if passed by name (e.g. "10"), resolve to Class ID
    let classId = body.classId;
    const classExists = classId ? await prisma.class.findUnique({ where: { id: classId } }) : null;
    if (!classExists && campusId) {
      const foundClass = await prisma.class.findFirst({
        where: { OR: [{ id: classId }, { name: classId }], campusId },
      });
      if (foundClass) classId = foundClass.id;
    }

    // Resolve sectionId: if passed by name (e.g. "A"), resolve to Section ID
    let sectionId = body.sectionId;
    const sectionExists = sectionId ? await prisma.section.findUnique({ where: { id: sectionId } }) : null;
    if (!sectionExists && classId) {
      const foundSection = await prisma.section.findFirst({
        where: { OR: [{ id: sectionId }, { name: sectionId }], classId },
      });
      if (foundSection) sectionId = foundSection.id;
    }

    // Validate all mandatory student fields
    const missingFields: string[] = [];
    if (!body.firstName?.trim()) missingFields.push('First Name');
    if (!body.lastName?.trim()) missingFields.push('Last Name');
    if (!body.gender) missingFields.push('Gender');
    if (!body.dob) missingFields.push('Date of Birth');
    if (!classId) missingFields.push('Class');
    if (!sectionId) missingFields.push('Section');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Missing required admission fields: ${missingFields.join(', ')}. Please fill all required fields.`,
        },
        { status: 400 }
      );
    }

    const bloodGroup = body.bloodGroup ? BLOOD_GROUP_MAP[body.bloodGroup] || null : null;

    // Unique student user email
    const studentEmail = body.studentEmail || `${admissionNo.toLowerCase()}@student.vidyalaya.com`;

    const result = await prisma.$transaction(async (tx) => {
      // Create parent user & parent record (or link existing parent)
      let parentId: string | undefined;
      if (body.fatherName) {
        let parentUser = body.fatherPhone
          ? await tx.user.findFirst({ where: { phone: body.fatherPhone } })
          : null;

        if (!parentUser) {
          parentUser = await tx.user.create({
            data: {
              email: `parent.${admissionNo.toLowerCase()}@vidyalaya.com`,
              phone: body.fatherPhone || null,
              password: await bcrypt.hash('parent123', 10),
              role: 'PARENT',
              campusId: campusId || null,
            },
          });
        }

        let parent = await tx.parent.findUnique({
          where: { userId: parentUser.id },
        });

        if (!parent) {
          parent = await tx.parent.create({
            data: {
              userId: parentUser.id,
              fatherName: body.fatherName,
              fatherPhone: body.fatherPhone,
              fatherEmail: body.fatherEmail,
              fatherIdCard: body.fatherIdCard,
              fatherOccupation: body.fatherOccupation,
              motherName: body.motherName,
              motherPhone: body.motherPhone,
              motherOccupation: body.motherOccupation,
              religion: body.religion || null,
              annualIncome: body.annualIncome ? parseFloat(body.annualIncome) : null,
            },
          });
        }
        parentId = parent.id;
      }

      // Create student user
      const studentUser = await tx.user.create({
        data: {
          email: studentEmail,
          password: defaultPassword,
          role: 'STUDENT',
          campusId: campusId || null,
        },
      });

      // Create student
      const student = await tx.student.create({
        data: {
          admissionNo,
          firstName: body.firstName,
          lastName: body.lastName,
          gender: body.gender,
          dob: new Date(body.dob),
          bloodGroup,
          religion: body.religion || null,
          caste: body.caste || null,
          category: body.category || null,
          nationality: body.nationality || 'Indian',
          aadhaarNo: body.aadhaarNo || null,
          streetAddress: body.streetAddress || null,
          village: body.village || null,
          post: body.post || null,
          policeStation: body.policeStation || null,
          city: body.city || null,
          district: body.district || null,
          state: body.state || 'Uttar Pradesh',
          pincode: body.pincode || null,
          previousSchool: body.previousSchool || null,
          tcNumber: body.tcNumber || null,
          admissionDate: body.admissionDate ? new Date(body.admissionDate) : new Date(),
          session: body.session || '2025-26',
          userId: studentUser.id,
          campusId: campusId!,
          classId: classId!,
          sectionId: sectionId!,
          parentId: parentId || null,
        },
      });

      // Auto-create primary class enrollment
      try {
        await tx.studentClassEnrollment.create({
          data: {
            studentId: student.id,
            classId: classId!,
            isPrimary: true,
          },
        });
      } catch (enrollErr) {
        console.warn('Class enrollment auto-link warning:', enrollErr);
      }

      if (body.inquiryId) {
        try {
          await tx.admissionInquiry.update({
            where: { id: body.inquiryId },
            data: { status: 'ENROLLED' },
          });
        } catch {
          // Ignore if inquiryId is a custom demo ID
        }
      }

      const enrolledStudent = await tx.student.findUnique({
        where: { id: student.id },
        include: {
          class: true,
          section: true,
          parent: true,
        },
      });

      return enrolledStudent || student;
    });

    return NextResponse.json({ success: true, data: result, message: 'Student admitted successfully' }, { status: 201 });
  } catch (error: any) {
    console.error('Admission error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
