'use server';

import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { generateAdmissionNo } from '@/utils/helpers';
import { AdmissionStatus, Gender, BloodGroup, Religion } from '@prisma/client';

import {
  publicApplicationSchema,
  PublicApplicationInput,
  inquiryStatusSchema,
  enrollStudentSchema,
  EnrollStudentInput,
} from '@/lib/validations/admission';

const BLOOD_GROUP_MAP: Record<string, BloodGroup> = {
  'A+': BloodGroup.A_POSITIVE,
  'A-': BloodGroup.A_NEGATIVE,
  'B+': BloodGroup.B_POSITIVE,
  'B-': BloodGroup.B_NEGATIVE,
  'AB+': BloodGroup.AB_POSITIVE,
  'AB-': BloodGroup.AB_NEGATIVE,
  'O+': BloodGroup.O_POSITIVE,
  'O-': BloodGroup.O_NEGATIVE,
  A_POSITIVE: BloodGroup.A_POSITIVE,
  A_NEGATIVE: BloodGroup.A_NEGATIVE,
  B_POSITIVE: BloodGroup.B_POSITIVE,
  B_NEGATIVE: BloodGroup.B_NEGATIVE,
  AB_POSITIVE: BloodGroup.AB_POSITIVE,
  AB_NEGATIVE: BloodGroup.AB_NEGATIVE,
  O_POSITIVE: BloodGroup.O_POSITIVE,
  O_NEGATIVE: BloodGroup.O_NEGATIVE,
};

const RELIGION_MAP: Record<string, Religion> = {
  HINDU: Religion.HINDU,
  MUSLIM: Religion.MUSLIM,
  CHRISTIAN: Religion.CHRISTIAN,
  SIKH: Religion.SIKH,
  BUDDHIST: Religion.BUDDHIST,
  JAIN: Religion.JAIN,
  OTHER: Religion.OTHER,
};

// ==================== CAPACITY CHECK SERVICE ====================

export async function checkCapacity(classId: string, sectionId?: string, academicYear = '2025-26') {
  try {
    if (!classId) throw new Error('Class ID is required');

    let capacity = await prisma.classCapacity.findFirst({
      where: {
        classId,
        ...(sectionId ? { sectionId } : {}),
        academicYear,
      },
    });

    // Fallback: If no capacity record yet, fetch from Section model or default 40
    let maxCapacity = 40;
    if (capacity) {
      maxCapacity = capacity.maxCapacity;
    } else if (sectionId) {
      const section = await prisma.section.findUnique({ where: { id: sectionId } });
      if (section?.capacity) maxCapacity = section.capacity;
    }

    // Live count of active students
    const enrolledCount = await prisma.student.count({
      where: {
        classId,
        ...(sectionId ? { sectionId } : {}),
        isActive: true,
      },
    });

    const availableSeats = Math.max(0, maxCapacity - enrolledCount);
    const occupancyRate = maxCapacity > 0 ? Math.round((enrolledCount / maxCapacity) * 100) : 0;
    const isHouseFull = availableSeats <= 0;

    return {
      success: true,
      data: {
        maxCapacity,
        enrolledCount,
        availableSeats,
        occupancyRate,
        isHouseFull,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== DUPLICATE IDENTITY VERIFICATION ====================

export async function checkDuplicateIdentity(criteria: {
  aadhaarNo?: string | null;
  phone?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
}) {
  try {
    const matches: Array<{ type: string; matchedWith: string; recordId: string; description: string }> = [];

    // 1. Check Aadhaar in Student
    if (criteria.aadhaarNo && criteria.aadhaarNo.trim().length === 12) {
      const existingStudent = await prisma.student.findFirst({
        where: { aadhaarNo: criteria.aadhaarNo.trim() },
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      });
      if (existingStudent) {
        matches.push({
          type: 'STUDENT_AADHAAR',
          matchedWith: criteria.aadhaarNo,
          recordId: existingStudent.id,
          description: `Existing Student: ${existingStudent.firstName} ${existingStudent.lastName} (Adm No: ${existingStudent.admissionNo})`,
        });
      }

      // Check Aadhaar in AdmissionInquiry
      const existingInquiry = await prisma.admissionInquiry.findFirst({
        where: { aadhaarNo: criteria.aadhaarNo.trim() },
        select: { id: true, firstName: true, lastName: true, applicationNo: true, status: true },
      });
      if (existingInquiry) {
        matches.push({
          type: 'INQUIRY_AADHAAR',
          matchedWith: criteria.aadhaarNo,
          recordId: existingInquiry.id,
          description: `Existing Inquiry: ${existingInquiry.firstName} ${existingInquiry.lastName} (App No: ${existingInquiry.applicationNo}, Status: ${existingInquiry.status})`,
        });
      }
    }

    // 2. Check Parent Phone in Parent or Inquiry
    if (criteria.phone && criteria.phone.trim().length === 10) {
      const existingParent = await prisma.parent.findFirst({
        where: {
          OR: [{ fatherPhone: criteria.phone.trim() }, { motherPhone: criteria.phone.trim() }],
        },
        select: { id: true, fatherName: true, students: { select: { admissionNo: true, firstName: true } } },
      });
      if (existingParent) {
        matches.push({
          type: 'PARENT_PHONE',
          matchedWith: criteria.phone,
          recordId: existingParent.id,
          description: `Existing Guardian Record: ${existingParent.fatherName} (${existingParent.students.length} linked students)`,
        });
      }
    }

    // 3. Name & DOB duplicate check
    if (criteria.firstName && criteria.lastName && criteria.dob) {
      const existingByNameDob = await prisma.student.findFirst({
        where: {
          firstName: { equals: criteria.firstName.trim() },
          lastName: { equals: criteria.lastName.trim() },
          dob: new Date(criteria.dob),
        },
        select: { id: true, firstName: true, lastName: true, admissionNo: true },
      });
      if (existingByNameDob) {
        matches.push({
          type: 'STUDENT_NAME_DOB',
          matchedWith: `${criteria.firstName} ${criteria.lastName}`,
          recordId: existingByNameDob.id,
          description: `Identical Name & DOB student found: Adm No ${existingByNameDob.admissionNo}`,
        });
      }
    }

    return {
      success: true,
      isDuplicate: matches.length > 0,
      matches,
    };
  } catch (error: any) {
    return { success: false, error: error.message, isDuplicate: false, matches: [] };
  }
}

// ==================== PUBLIC APPLICATION ACTION ====================

export async function submitPublicApplication(rawInput: PublicApplicationInput) {
  try {
    const validated = publicApplicationSchema.parse(rawInput);

    // Auto-generate application number & token
    const year = new Date().getFullYear();
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const applicationNo = `APP-${year}-${randomSeq}`;
    const token = `TK-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Map blood group & religion
    const bloodGroup = validated.bloodGroup ? BLOOD_GROUP_MAP[validated.bloodGroup] || null : null;
    const religion = validated.religion ? RELIGION_MAP[validated.religion] || null : null;
    const annualIncome = validated.annualIncome ? parseFloat(validated.annualIncome) : null;

    // Check duplicate identity warnings
    const dupCheck = await checkDuplicateIdentity({
      aadhaarNo: validated.aadhaarNo,
      phone: validated.parentPhone,
      firstName: validated.firstName,
      lastName: validated.lastName,
      dob: validated.dob,
    });

    const inquiry = await prisma.admissionInquiry.create({
      data: {
        applicationNo,
        token,
        campusId: validated.campusId,
        classId: validated.classId,
        sectionId: validated.sectionId || null,
        firstName: validated.firstName.trim(),
        lastName: validated.lastName.trim(),
        gender: validated.gender as Gender,
        dob: new Date(validated.dob),
        bloodGroup,
        religion,
        caste: validated.caste || null,
        category: validated.category || null,
        nationality: validated.nationality || 'Indian',
        aadhaarNo: validated.aadhaarNo || null,
        previousSchool: validated.previousSchool || null,
        previousGrade: validated.previousGrade || null,

        parentName: validated.parentName.trim(),
        parentPhone: validated.parentPhone.trim(),
        parentEmail: validated.parentEmail || null,
        parentRelation: validated.parentRelation || 'FATHER',
        parentAadhaar: validated.parentAadhaar || null,
        parentOccupation: validated.parentOccupation || null,
        annualIncome,

        streetAddress: validated.streetAddress || null,
        city: validated.city || null,
        state: validated.state || 'Uttar Pradesh',
        pincode: validated.pincode || null,

        status: AdmissionStatus.FORM_SUBMITTED,
        source: 'ONLINE_PORTAL',
        priority: 'MEDIUM',
        notes: validated.notes || null,
      },
      include: {
        class: { select: { name: true } },
        campus: { select: { name: true } },
      },
    });

    return {
      success: true,
      data: {
        id: inquiry.id,
        applicationNo: inquiry.applicationNo,
        token: inquiry.token,
        status: inquiry.status,
        studentName: `${inquiry.firstName} ${inquiry.lastName}`,
        className: inquiry.class?.name || 'Class',
        campusName: inquiry.campus?.name || 'Campus',
        isDuplicateWarn: dupCheck.isDuplicate,
        duplicateMatches: dupCheck.matches,
      },
      message: 'Application submitted successfully! Please retain your Application Number and Token.',
    };
  } catch (error: any) {
    console.error('Error submitting public application:', error);
    return {
      success: false,
      error: error.message || 'Validation or processing error occurred while submitting application',
    };
  }
}

// ==================== INQUIRY STATUS STATE MACHINE ====================

const STATUS_ORDER: Record<AdmissionStatus, number> = {
  INQUIRY: 1,
  FORM_SUBMITTED: 2,
  DOCS_VERIFIED: 3,
  SEAT_OFFERED: 4,
  FEES_PAID: 5,
  ENROLLED: 6,
  REJECTED: 99,
  WITHDRAWN: 99,
};

export async function updateInquiryStatus(
  inquiryId: string,
  newStatus: AdmissionStatus,
  notes?: string,
  rejectionReason?: string
) {
  try {
    const inquiry = await prisma.admissionInquiry.findUnique({
      where: { id: inquiryId },
      include: { student: true },
    });

    if (!inquiry) throw new Error('Inquiry record not found');

    // Prevent direct status leap from INQUIRY to ENROLLED without atomic enrollment action
    if (newStatus === AdmissionStatus.ENROLLED && !inquiry.student) {
      throw new Error('Please use the atomic "Enroll Student" action to provision SIS records and reserve seat.');
    }

    const updated = await prisma.admissionInquiry.update({
      where: { id: inquiryId },
      data: {
        status: newStatus,
        notes: notes ? `${inquiry.notes ? inquiry.notes + '\n' : ''}[${new Date().toISOString()}] ${notes}` : inquiry.notes,
        rejectionReason: rejectionReason || inquiry.rejectionReason,
      },
    });

    return { success: true, data: updated, message: `Status updated to ${newStatus}` };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ==================== ATOMIC STUDENT ENROLLMENT & SEAT ASSIGNMENT ====================

export async function enrollStudentFromInquiry(input: EnrollStudentInput) {
  try {
    const validated = enrollStudentSchema.parse(input);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch Inquiry
      const inquiry = await tx.admissionInquiry.findUnique({
        where: { id: validated.inquiryId },
      });

      if (!inquiry) throw new Error(`Inquiry with ID ${validated.inquiryId} not found`);
      if (inquiry.status === AdmissionStatus.ENROLLED) {
        throw new Error('This applicant is already enrolled in the system');
      }

      // 2. Fetch or initialize ClassCapacity for this Class + Section
      let capacity = await tx.classCapacity.findFirst({
        where: {
          classId: validated.classId,
          sectionId: validated.sectionId,
          academicYear: validated.academicYear,
        },
      });

      if (!capacity) {
        const section = await tx.section.findUnique({ where: { id: validated.sectionId } });
        capacity = await tx.classCapacity.create({
          data: {
            classId: validated.classId,
            sectionId: validated.sectionId,
            academicYear: validated.academicYear,
            maxCapacity: section?.capacity || 40,
            enrolledCount: await tx.student.count({
              where: { classId: validated.classId, sectionId: validated.sectionId, isActive: true },
            }),
          },
        });
      }

      // 3. Concurrency check: Ensure section capacity is not exceeded
      if (capacity.enrolledCount >= capacity.maxCapacity) {
        throw new Error(
          `CAPACITY_EXCEEDED: Class section has reached full capacity of ${capacity.maxCapacity} students.`
        );
      }

      // Optimistic concurrency locking: atomic increment
      const capUpdate = await tx.classCapacity.updateMany({
        where: {
          id: capacity.id,
          enrolledCount: { lt: capacity.maxCapacity },
          version: capacity.version,
        },
        data: {
          enrolledCount: { increment: 1 },
          version: { increment: 1 },
        },
      });

      if (capUpdate.count === 0) {
        throw new Error(
          'CONCURRENCY_CONFLICT: Another student claimed the last available seat concurrently. Please try another section.'
        );
      }

      // 4. Generate Unique Roll Number within Section
      let rollNo = validated.rollNo;
      if (!rollNo) {
        const existingStudents = await tx.student.findMany({
          where: { sectionId: validated.sectionId, isActive: true },
          select: { rollNo: true },
        });

        const numericRolls = existingStudents
          .map((s) => (s.rollNo ? parseInt(s.rollNo, 10) : 0))
          .filter((n) => !isNaN(n) && n > 0);

        const nextRoll = numericRolls.length > 0 ? Math.max(...numericRolls) + 1 : 1;
        rollNo = String(nextRoll);
      } else {
        // Verify uniqueness of provided roll number in section
        const existingWithRoll = await tx.student.findFirst({
          where: { sectionId: validated.sectionId, rollNo, isActive: true },
        });
        if (existingWithRoll) {
          throw new Error(`Roll number ${rollNo} is already assigned in this section.`);
        }
      }

      // 5. Generate unique Admission Number
      const admissionNo = generateAdmissionNo();

      // 6. Provision NextAuth Parent User & Parent Model
      let parentId: string | null = null;
      if (inquiry.parentPhone || inquiry.parentName) {
        // Look up existing parent by phone
        let existingParent = inquiry.parentPhone
          ? await tx.parent.findFirst({
              where: { fatherPhone: inquiry.parentPhone },
            })
          : null;

        if (existingParent) {
          parentId = existingParent.id;
        } else {
          const parentEmail =
            inquiry.parentEmail && inquiry.parentEmail.trim().length > 0
              ? inquiry.parentEmail.trim()
              : `parent.${admissionNo.toLowerCase()}@vidyalaya.com`;

          const parentUser = await tx.user.create({
            data: {
              email: parentEmail,
              phone: inquiry.parentPhone || null,
              password: await bcrypt.hash('parent123', 10),
              role: 'PARENT',
              campusId: validated.campusId,
            },
          });

          const newParent = await tx.parent.create({
            data: {
              userId: parentUser.id,
              fatherName: inquiry.parentName,
              fatherPhone: inquiry.parentPhone,
              fatherEmail: inquiry.parentEmail,
              fatherIdCard: inquiry.parentAadhaar,
              fatherOccupation: inquiry.parentOccupation,
              religion: inquiry.religion,
              annualIncome: inquiry.annualIncome,
            },
          });
          parentId = newParent.id;
        }
      }

      // 7. Provision NextAuth Student User
      const studentEmail = `${admissionNo.toLowerCase()}@student.vidyalaya.com`;
      const studentUser = await tx.user.create({
        data: {
          email: studentEmail,
          password: await bcrypt.hash('student123', 10),
          role: 'STUDENT',
          campusId: validated.campusId,
        },
      });

      // 8. Create Student SIS record
      const student = await tx.student.create({
        data: {
          admissionNo,
          rollNo,
          firstName: inquiry.firstName,
          lastName: inquiry.lastName,
          gender: inquiry.gender,
          dob: inquiry.dob,
          bloodGroup: inquiry.bloodGroup,
          religion: inquiry.religion,
          caste: inquiry.caste,
          category: inquiry.category,
          nationality: inquiry.nationality,
          aadhaarNo: inquiry.aadhaarNo,
          photo: inquiry.photo,
          streetAddress: inquiry.streetAddress,
          city: inquiry.city,
          state: inquiry.state,
          pincode: inquiry.pincode,
          previousSchool: inquiry.previousSchool,
          userId: studentUser.id,
          campusId: validated.campusId,
          classId: validated.classId,
          sectionId: validated.sectionId,
          parentId,
          admissionInquiryId: inquiry.id,
          applicationToken: inquiry.token,
          isActive: true,
        },
      });

      // 9. Update AdmissionInquiry to ENROLLED
      await tx.admissionInquiry.update({
        where: { id: inquiry.id },
        data: {
          status: AdmissionStatus.ENROLLED,
          sectionId: validated.sectionId,
          assignedStaffId: validated.assignedStaffId || null,
        },
      });

      return {
        student,
        admissionNo,
        rollNo,
        studentEmail,
      };
    });

    return {
      success: true,
      data: result,
      message: `Student enrolled successfully! Admission No: ${result.admissionNo}, Roll No: ${result.rollNo}`,
    };
  } catch (error: any) {
    console.error('Error during atomic enrollment:', error);
    return {
      success: false,
      error: error.message || 'Transaction failed during student enrollment',
    };
  }
}
