import type { Prisma } from '@prisma/client';
import { badRequest, body, conflict, owned, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { assertStudentAccess } from '@/server/scope';
import { aadhaarFields } from '@/server/services/people';
import { checkPhoto, studentInputSchema } from '@/server/resources/students';

export const GET = route({ module: 'students' }, async (ctx, _req, { id }) => {
  await assertStudentAccess(ctx, id);
  const s = await ctx.db.student.findUniqueOrThrow({
    where: { id },
    include: {
      class: { select: { id: true, name: true } },
      section: { select: { id: true, name: true, classTeacher: { select: { firstName: true, lastName: true } } } },
      campus: { select: { name: true } },
      guardian: true,
      user: { select: { id: true, username: true, isActive: true, lastLoginAt: true } },
      transport: { include: { route: { select: { name: true } }, stop: { select: { name: true, pickupTime: true, dropTime: true, monthlyFee: true } } } },
      documents: true,
      promotions: { orderBy: { createdAt: 'desc' } },
    },
  });
  const siblings = s.guardianId
    ? await ctx.db.student.findMany({
        where: { guardianId: s.guardianId, id: { not: s.id } },
        select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true, class: { select: { name: true } }, section: { select: { name: true } } },
      })
    : [];
  const consents = await ctx.db.consent.findMany({ where: { studentId: id }, orderBy: { createdAt: 'desc' } });
  const parentUser = s.guardian?.userId ? await ctx.db.user.findUnique({ where: { id: s.guardian.userId }, select: { id: true, username: true, isActive: true, lastLoginAt: true } }) : null;
  return {
    ...s,
    name: displayName(s),
    classLabel: classLabel(s.class, s.section),
    classTeacher: s.section.classTeacher ? displayName(s.section.classTeacher) : null,
    aadhaarMasked: s.aadhaarLast4 ? `XXXX XXXX ${s.aadhaarLast4}` : null,
    siblings: siblings.map((x) => ({ id: x.id, name: displayName(x), admissionNo: x.admissionNo, status: x.status, classLabel: classLabel(x.class, x.section) })),
    consents,
    parentUser,
  };
});

export const PUT = route({ module: 'students', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, studentInputSchema.partial());
  const current = await ctx.db.student.findUniqueOrThrow({ where: { id }, select: { classId: true, sectionId: true } });
  try {
    checkPhoto(input.photoUrl);
  } catch (e) {
    throw badRequest((e as Error).message);
  }

  if ((input.sectionId && input.sectionId !== current.sectionId) || (input.classId && input.classId !== current.classId)) {
    const sectionId = input.sectionId ?? current.sectionId;
    const classId = input.classId ?? current.classId;
    const section = await ctx.db.section.findUnique({ where: { id: sectionId }, include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } });
    if (!section || section.classId !== classId) throw badRequest('Selected section does not belong to the selected class.');
    if (section._count.students >= section.capacity) throw conflict('The selected section is full.');
  }
  if (input.admissionNo) {
    const clash = await ctx.db.student.count({ where: { admissionNo: input.admissionNo, id: { not: id } } });
    if (clash) throw conflict('Admission number already in use.');
  }
  await owned(ctx.db.campus, input.campusId, 'Campus');

  const { aadhaar, dob, admissionDate, admissionNo, ...rest } = input;
  const data: Prisma.StudentUncheckedUpdateInput = {
    ...rest,
    ...(aadhaar !== undefined ? (aadhaar ? aadhaarFields(aadhaar) : { aadhaarEnc: null, aadhaarLast4: null }) : {}),
    ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}),
    ...(admissionDate ? { admissionDate: new Date(admissionDate) } : {}),
    ...(admissionNo ? { admissionNo } : {}),
  };
  const s = await ctx.db.student.update({ where: { id }, data });
  if (input.apaarConsent) {
    await ctx.db.consent.create({ data: { schoolId: ctx.user.schoolId, studentId: id, purpose: 'APAAR', status: input.apaarConsent, recordedBy: ctx.user.id, ip: ctx.ip, decidedAt: new Date() } });
  }
  const changed = Object.keys(input).filter((k) => k !== 'aadhaar' && k !== 'photoUrl');
  await ctx.audit('UPDATE', 'Student', id, `Updated ${changed.join(', ')}${aadhaar !== undefined ? ', aadhaar' : ''}`);
  return { id: s.id };
});

export const DELETE = route({ module: 'students', action: 'delete' }, async (ctx, _req, { id }) => {
  const payments = await ctx.db.feePayment.count({ where: { studentId: id } });
  if (payments) throw conflict('This student has fee receipts on record. Mark the student as left or transferred instead of deleting.');
  const s = await ctx.db.student.findUniqueOrThrow({ where: { id }, select: { userId: true, admissionNo: true, guardianId: true } });
  let familyRemoved = false;
  await ctx.db.$transaction(async (tx) => {
    await tx.admissionApplication.updateMany({ where: { studentId: id }, data: { studentId: null } });
    await tx.consent.deleteMany({ where: { studentId: id } });
    await tx.student.delete({ where: { id } });
    if (s.userId) await tx.user.delete({ where: { id: s.userId } });
    // An only child's family record (and its parent login) would otherwise be orphaned.
    if (s.guardianId && (await tx.student.count({ where: { guardianId: s.guardianId } })) === 0) {
      const g = await tx.guardian.findUnique({ where: { id: s.guardianId }, select: { userId: true } });
      await tx.consent.deleteMany({ where: { guardianId: s.guardianId } });
      await tx.guardian.delete({ where: { id: s.guardianId } });
      if (g?.userId) await tx.user.delete({ where: { id: g.userId } });
      familyRemoved = true;
    }
  });
  await ctx.audit('DELETE', 'Student', id, `Deleted ${s.admissionNo}${familyRemoved ? ' and the now-empty family record' : ''}`);
  return { deleted: true };
});
