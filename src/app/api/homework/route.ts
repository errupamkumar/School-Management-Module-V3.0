import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, owned, query, route } from '@/server/api';
import { classLabel, dayUTC } from '@/server/common';
import { hasSchoolWideScope, ownClassSectionPairs, teacherSectionIds } from '@/server/scope';
import { notifyUsers } from '@/server/services/notify';

export const GET = route({ module: 'homework' }, async (ctx, req) => {
  const q = query(req, z.object({ classId: z.string().optional(), sectionId: z.string().optional(), subjectId: z.string().optional(), from: z.string().optional(), to: z.string().optional(), studentId: z.string().optional() }));
  const and: Prisma.HomeworkWhereInput[] = [];
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  let familyStudent: string | null = null;
  if (family) {
    const pairs = await ownClassSectionPairs(ctx);
    const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
    if (!p) throw forbidden();
    familyStudent = p.studentId;
    and.push({ classId: p.classId, OR: [{ sectionId: null }, { sectionId: p.sectionId }] });
  } else if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    const classIds = (await ctx.db.section.findMany({ where: { id: { in: secs } }, select: { classId: true } })).map((s) => s.classId);
    and.push({ OR: [{ sectionId: { in: secs } }, { sectionId: null, classId: { in: classIds } }, { createdById: ctx.user.id }] });
  } else if (!hasSchoolWideScope(ctx)) throw forbidden();
  if (q.classId) and.push({ classId: q.classId });
  if (q.sectionId) and.push({ OR: [{ sectionId: q.sectionId }, { sectionId: null }] });
  if (q.subjectId) and.push({ subjectId: q.subjectId });
  if (q.from) and.push({ assignedOn: { gte: dayUTC(q.from) } });
  if (q.to) and.push({ assignedOn: { lte: dayUTC(q.to) } });

  const rows = await ctx.db.homework.findMany({
    where: { AND: and },
    orderBy: [{ assignedOn: 'desc' }, { createdAt: 'desc' }],
    take: 200,
    include: {
      _count: { select: { submissions: true } },
      ...(familyStudent ? { submissions: { where: { studentId: familyStudent } } } : {}),
    },
  });
  const [subjects, classes, files] = await Promise.all([
    ctx.db.subject.findMany({ select: { id: true, name: true } }),
    ctx.db.class.findMany({ select: { id: true, name: true, sections: { select: { id: true, name: true } } } }),
    ctx.db.storedFile.findMany({ where: { id: { in: rows.map((r) => r.attachmentId).filter(Boolean) as string[] } }, select: { id: true, fileName: true } }),
  ]);
  return rows.map((h) => {
    const cls = classes.find((c) => c.id === h.classId);
    const sec = cls?.sections.find((s) => s.id === h.sectionId);
    return {
      ...h,
      subject: subjects.find((s) => s.id === h.subjectId)?.name ?? '',
      classLabel: cls ? (sec ? classLabel(cls, sec) : `${classLabel(cls)} (all sections)`) : '',
      attachment: files.find((f) => f.id === h.attachmentId) ?? null,
      submissionCount: h._count.submissions,
      mySubmission: familyStudent ? (h as unknown as { submissions?: unknown[] }).submissions?.[0] ?? null : undefined,
      submissions: undefined,
    };
  });
});

export const POST = route({ module: 'homework', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      classId: z.string().min(1),
      sectionId: z.string().optional().nullable(),
      subjectId: z.string().min(1),
      title: z.string().trim().min(2).max(150),
      description: z.string().trim().min(2).max(5000),
      assignedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      attachmentId: z.string().optional().nullable(),
      notify: z.boolean().default(true),
    })
  );
  if (input.dueOn < input.assignedOn) throw badRequest('Due date cannot be before the assigned date.');
  await owned(ctx.db.class, input.classId, 'Class');
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  if (input.attachmentId) await owned(ctx.db.storedFile, input.attachmentId, 'Attachment');
  if (input.sectionId) {
    const s = await ctx.db.section.findUnique({ where: { id: input.sectionId } });
    if (!s || s.classId !== input.classId) throw badRequest('Section does not belong to the class.');
  }
  if (ctx.user.role === 'TEACHER') {
    const secs = await teacherSectionIds(ctx);
    if (!input.sectionId || !secs.includes(input.sectionId)) throw forbidden('Choose one of your sections.');
  }
  const hw = await ctx.db.homework.create({
    data: { schoolId: ctx.user.schoolId, classId: input.classId, sectionId: input.sectionId || null, subjectId: input.subjectId, title: input.title, description: input.description, assignedOn: dayUTC(input.assignedOn), dueOn: dayUTC(input.dueOn), attachmentId: input.attachmentId || null, createdById: ctx.user.id, createdByName: ctx.user.name },
  });
  if (input.notify) {
    const students = await ctx.db.student.findMany({ where: { classId: input.classId, ...(input.sectionId ? { sectionId: input.sectionId } : {}), status: 'ACTIVE' }, select: { userId: true, guardian: { select: { userId: true } } } });
    await notifyUsers(ctx.db, ctx.user.schoolId, students.flatMap((s) => [s.userId, s.guardian?.userId]), { title: `Homework: ${input.title}`, body: `Due ${input.dueOn}.`, link: '/homework' });
  }
  await ctx.audit('CREATE', 'Homework', hw.id, input.title);
  return hw;
});
