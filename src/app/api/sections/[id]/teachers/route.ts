import { z } from 'zod';
import { body, owned, route } from '@/server/api';
import { displayName } from '@/server/common';

/** Subject teacher allocation for one section. */
export const GET = route({ module: 'academics' }, async (ctx, _req, { id }) => {
  const section = await ctx.db.section.findUniqueOrThrow({ where: { id }, select: { classId: true } });
  const [subjects, assignments] = await Promise.all([
    ctx.db.classSubject.findMany({ where: { classId: section.classId }, include: { subject: { select: { id: true, name: true } } } }),
    ctx.db.teacherAssignment.findMany({ where: { sectionId: id }, include: { employee: { select: { id: true, firstName: true, lastName: true } } } }),
  ]);
  return subjects.map((s) => {
    const a = assignments.find((x) => x.subjectId === s.subjectId);
    return { subjectId: s.subjectId, subjectName: s.subject.name, employeeId: a?.employeeId ?? null, employeeName: a ? displayName(a.employee) : null };
  });
});

export const PUT = route({ module: 'academics', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ assignments: z.array(z.object({ subjectId: z.string().min(1), employeeId: z.string().nullable() })).max(40) }));
  await owned(ctx.db.section, id, 'Section');
  for (const a of input.assignments) {
    await owned(ctx.db.subject, a.subjectId, 'Subject');
    await owned(ctx.db.employee, a.employeeId, 'Teacher');
  }
  await ctx.db.$transaction(
    input.assignments.map((a) =>
      a.employeeId
        ? ctx.db.teacherAssignment.upsert({
            where: { sectionId_subjectId: { sectionId: id, subjectId: a.subjectId } },
            update: { employeeId: a.employeeId },
            create: { schoolId: ctx.user.schoolId, sectionId: id, subjectId: a.subjectId, employeeId: a.employeeId },
          })
        : ctx.db.teacherAssignment.deleteMany({ where: { sectionId: id, subjectId: a.subjectId } })
    )
  );
  await ctx.audit('UPDATE', 'TeacherAssignment', id, `${input.assignments.length} subjects`);
  return { updated: input.assignments.length };
});
