import { z } from 'zod';
import { badRequest, body, conflict, route } from '@/server/api';
import { currentAcademicYear } from '@/server/common';

export const POST = route({ module: 'students', action: 'edit' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      studentIds: z.array(z.string().min(1)).min(1, 'Select at least one student').max(500),
      result: z.enum(['PROMOTED', 'DETAINED', 'PASSED_OUT']),
      toClassId: z.string().optional(),
      toSectionId: z.string().optional(),
    })
  );
  const students = await ctx.db.student.findMany({ where: { id: { in: input.studentIds }, status: 'ACTIVE' }, select: { id: true, classId: true, sectionId: true, userId: true } });
  if (students.length !== input.studentIds.length) throw badRequest('Some selected students were not found or are not active.');

  if (input.result === 'PROMOTED') {
    if (!input.toClassId || !input.toSectionId) throw badRequest('Choose the class and section to promote into.');
    const section = await ctx.db.section.findUnique({ where: { id: input.toSectionId }, include: { _count: { select: { students: { where: { status: 'ACTIVE' } } } } } });
    if (!section || section.classId !== input.toClassId) throw badRequest('Target section does not belong to the target class.');
    const incoming = students.filter((s) => s.sectionId !== section.id).length;
    if (section._count.students + incoming > section.capacity) {
      throw conflict(`Target section has ${section.capacity - section._count.students} free seats but ${incoming} students were selected.`);
    }
  }

  const ay = await currentAcademicYear(ctx);
  await ctx.db.$transaction(
    async (tx) => {
      for (const s of students) {
        const toClassId = input.result === 'PROMOTED' ? input.toClassId! : s.classId;
        const toSectionId = input.result === 'PROMOTED' ? input.toSectionId! : s.sectionId;
        await tx.studentPromotion.create({
          data: { schoolId: ctx.user.schoolId, studentId: s.id, fromClassId: s.classId, fromSectionId: s.sectionId, toClassId, toSectionId, academicYear: ay, result: input.result, promotedById: ctx.user.id },
        });
        if (input.result === 'PROMOTED') {
          await tx.student.update({ where: { id: s.id }, data: { classId: toClassId, sectionId: toSectionId, rollNo: null } });
        } else if (input.result === 'PASSED_OUT') {
          await tx.student.update({ where: { id: s.id }, data: { status: 'PASSED_OUT', leftOn: new Date(), leavingReason: 'Passed out' } });
          if (s.userId) await tx.user.update({ where: { id: s.userId }, data: { isActive: false } });
        }
      }
    },
    { timeout: 60_000 }
  );
  await ctx.audit('UPDATE', 'Student', null, `${input.result} ${students.length} students`);
  return { count: students.length, result: input.result };
});
