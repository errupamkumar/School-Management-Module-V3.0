import { z } from 'zod';
import { badRequest, body, forbidden, query, route, type Ctx } from '@/server/api';
import { displayName } from '@/server/common';
import { hasSchoolWideScope } from '@/server/scope';

/** Teachers may enter marks only for subjects they teach in that section (or as class teacher). */
async function assertCanEnter(ctx: Ctx, sectionId: string, subjectId: string) {
  if (ctx.user.role === 'SUPER_ADMIN' || ctx.user.role === 'ADMIN') return;
  if (ctx.user.role === 'TEACHER' && ctx.user.employeeId) {
    const [assigned, classTeacher] = await Promise.all([
      ctx.db.teacherAssignment.count({ where: { sectionId, subjectId, employeeId: ctx.user.employeeId } }),
      ctx.db.section.count({ where: { id: sectionId, classTeacherId: ctx.user.employeeId } }),
    ]);
    if (assigned || classTeacher) return;
  } else if (hasSchoolWideScope(ctx)) return;
  throw forbidden('You can only enter marks for subjects you teach in this section.');
}

export const GET = route({ module: 'exams', action: 'edit' }, async (ctx, req, { id }) => {
  const q = query(req, z.object({ sectionId: z.string().min(1), subjectId: z.string().min(1) }));
  const section = await ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, select: { classId: true, name: true } });
  await assertCanEnter(ctx, q.sectionId, q.subjectId);
  const [exam, schedule, students, marks] = await Promise.all([
    ctx.db.exam.findUniqueOrThrow({ where: { id } }),
    ctx.db.examSchedule.findUnique({ where: { examId_classId_subjectId: { examId: id, classId: section.classId, subjectId: q.subjectId } } }),
    ctx.db.student.findMany({ where: { sectionId: q.sectionId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, rollNo: true, admissionNo: true } }),
    ctx.db.examMark.findMany({ where: { examId: id, subjectId: q.subjectId, student: { sectionId: q.sectionId } } }),
  ]);
  if (!schedule) throw badRequest('This subject is not part of the exam for this class. Set up the date sheet first.');
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  return {
    exam: { id: exam.id, name: exam.name, isPublished: exam.isPublished },
    maxMarks: Number(schedule.maxMarks),
    passMarks: Number(schedule.passMarks),
    locked: exam.isPublished && ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN',
    rows: students.map((s) => {
      const m = marks.find((x) => x.studentId === s.id);
      return { studentId: s.id, name: displayName(s), rollNo: s.rollNo, admissionNo: s.admissionNo, marks: m?.marksObtained ?? null, isAbsent: m?.isAbsent ?? false, remarks: m?.remarks ?? null };
    }),
  };
});

export const PUT = route({ module: 'exams', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      sectionId: z.string().min(1),
      subjectId: z.string().min(1),
      entries: z
        .array(z.object({ studentId: z.string().min(1), marks: z.coerce.number().min(0).max(1000).nullable(), isAbsent: z.boolean().default(false), remarks: z.string().trim().max(120).nullable().optional() }))
        .min(1)
        .max(200),
    })
  );
  const section = await ctx.db.section.findUniqueOrThrow({ where: { id: input.sectionId }, select: { classId: true } });
  await assertCanEnter(ctx, input.sectionId, input.subjectId);
  const [exam, schedule] = await Promise.all([
    ctx.db.exam.findUniqueOrThrow({ where: { id } }),
    ctx.db.examSchedule.findUnique({ where: { examId_classId_subjectId: { examId: id, classId: section.classId, subjectId: input.subjectId } } }),
  ]);
  if (!schedule) throw badRequest('Subject not scheduled for this exam.');
  if (exam.isPublished && ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') throw forbidden('Results are published. Ask the principal to unpublish before changing marks.');
  const max = Number(schedule.maxMarks);
  const bad = input.entries.find((e) => !e.isAbsent && e.marks !== null && e.marks > max);
  if (bad) throw badRequest(`Marks cannot exceed the maximum of ${max}.`);
  const valid = await ctx.db.student.count({ where: { id: { in: input.entries.map((e) => e.studentId) }, sectionId: input.sectionId } });
  if (valid !== new Set(input.entries.map((e) => e.studentId)).size) throw badRequest('Some students are not in this section.');

  await ctx.db.$transaction(
    input.entries.map((e) =>
      ctx.db.examMark.upsert({
        where: { examId_studentId_subjectId: { examId: id, studentId: e.studentId, subjectId: input.subjectId } },
        update: { marksObtained: e.isAbsent ? null : e.marks, isAbsent: e.isAbsent, remarks: e.remarks ?? null, enteredById: ctx.user.id },
        create: { schoolId: ctx.user.schoolId, examId: id, studentId: e.studentId, classId: section.classId, subjectId: input.subjectId, marksObtained: e.isAbsent ? null : e.marks, isAbsent: e.isAbsent, remarks: e.remarks ?? null, enteredById: ctx.user.id },
      })
    )
  );
  await ctx.audit('UPDATE', 'ExamMark', id, `${exam.name}: ${input.entries.length} marks for subject ${input.subjectId} in section ${input.sectionId}`);
  return { saved: input.entries.length };
});
