import { z } from 'zod';
import { badRequest, body, owned, query, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { ownClassSectionPairs } from '@/server/scope';

/** Date sheet / exam setup for one class (or every class when classId is omitted, for the family view). */
export const GET = route({ module: 'exams' }, async (ctx, req, { id }) => {
  const q = query(req, z.object({ classId: z.string().optional() }));
  const exam = await ctx.db.exam.findUniqueOrThrow({ where: { id } });
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  let classIds: string[] | undefined = q.classId ? [q.classId] : undefined;
  if (family) {
    // Families may see the date sheet even before results are published.
    const own = (await ownClassSectionPairs(ctx)).map((p) => p.classId);
    classIds = classIds ? classIds.filter((c) => own.includes(c)) : own;
  }
  const [schedules, subjects, classes] = await Promise.all([
    ctx.db.examSchedule.findMany({ where: { examId: id, ...(classIds ? { classId: { in: classIds } } : {}) }, orderBy: [{ date: 'asc' }, { startTime: 'asc' }] }),
    ctx.db.subject.findMany({ select: { id: true, name: true, code: true } }),
    ctx.db.class.findMany({ where: classIds ? { id: { in: classIds } } : {}, select: { id: true, name: true, numericOrder: true, subjects: { select: { subjectId: true, fullMarks: true, passMarks: true } } }, orderBy: { numericOrder: 'asc' } }),
  ]);
  const sname = (sid: string) => subjects.find((s) => s.id === sid)?.name ?? 'Subject';
  if (q.classId && !family) {
    const cls = classes.find((c) => c.id === q.classId);
    // Merge the class's subject list with any existing schedule rows so new subjects appear.
    const rows = (cls?.subjects ?? []).map((cs) => {
      const s = schedules.find((x) => x.subjectId === cs.subjectId);
      return { subjectId: cs.subjectId, subjectName: sname(cs.subjectId), included: !!s, date: s?.date ?? null, startTime: s?.startTime ?? null, endTime: s?.endTime ?? null, maxMarks: s ? Number(s.maxMarks) : cs.fullMarks, passMarks: s ? Number(s.passMarks) : cs.passMarks, room: s?.room ?? null };
    });
    return { exam, classLabel: cls ? classLabel(cls) : '', rows };
  }
  return {
    exam,
    classes: classes.map((c) => ({
      classId: c.id,
      classLabel: classLabel(c),
      rows: schedules.filter((s) => s.classId === c.id).map((s) => ({ subjectId: s.subjectId, subjectName: sname(s.subjectId), date: s.date, startTime: s.startTime, endTime: s.endTime, maxMarks: Number(s.maxMarks), passMarks: Number(s.passMarks), room: s.room })),
    })),
  };
});

export const PUT = route({ module: 'exams', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      classIds: z.array(z.string()).min(1).max(50),
      rows: z
        .array(
          z.object({
            subjectId: z.string().min(1),
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
            startTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional().or(z.literal('').transform(() => null)),
            endTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional().or(z.literal('').transform(() => null)),
            maxMarks: z.coerce.number().min(1).max(1000),
            passMarks: z.coerce.number().min(0).max(1000),
            room: z.string().trim().max(30).nullable().optional(),
          })
        )
        .max(40),
    })
  );
  await ctx.db.exam.findUniqueOrThrow({ where: { id } });
  for (const c of input.classIds) await owned(ctx.db.class, c, 'Class');
  for (const r of input.rows) if (r.passMarks > r.maxMarks) throw badRequest('Pass marks cannot exceed maximum marks.');
  const subjectIds = input.rows.map((r) => r.subjectId);
  const lowered = await ctx.db.examMark.count({ where: { examId: id, classId: { in: input.classIds }, subjectId: { notIn: subjectIds } } });
  if (lowered) throw badRequest('Marks already exist for a subject you removed. Delete those marks first.');
  await ctx.db.$transaction([
    ctx.db.examSchedule.deleteMany({ where: { examId: id, classId: { in: input.classIds }, subjectId: { notIn: subjectIds } } }),
    ...input.classIds.flatMap((classId) =>
      input.rows.map((r) =>
        ctx.db.examSchedule.upsert({
          where: { examId_classId_subjectId: { examId: id, classId, subjectId: r.subjectId } },
          update: { date: r.date ? new Date(r.date) : null, startTime: r.startTime ?? null, endTime: r.endTime ?? null, maxMarks: r.maxMarks, passMarks: r.passMarks, room: r.room ?? null },
          create: { schoolId: ctx.user.schoolId, examId: id, classId, subjectId: r.subjectId, date: r.date ? new Date(r.date) : null, startTime: r.startTime ?? null, endTime: r.endTime ?? null, maxMarks: r.maxMarks, passMarks: r.passMarks, room: r.room ?? null },
        })
      )
    ),
  ]);
  await ctx.audit('UPDATE', 'ExamSchedule', id, `${input.classIds.length} class(es), ${input.rows.length} subjects`);
  return { saved: input.rows.length * input.classIds.length };
});
