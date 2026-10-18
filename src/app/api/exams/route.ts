import { z } from 'zod';
import { badRequest, body, route } from '@/server/api';
import { currentAcademicYear } from '@/server/common';
import { ownClassSectionPairs } from '@/server/scope';
import { toDate, zDate } from '@/server/crud';

export const GET = route({ module: 'exams' }, async (ctx, req) => {
  const year = req.nextUrl.searchParams.get('academicYear') ?? (await currentAcademicYear(ctx));
  const family = ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT';
  const classIds = family ? (await ownClassSectionPairs(ctx)).map((p) => p.classId) : null;
  const exams = await ctx.db.exam.findMany({
    where: { academicYear: year, ...(family ? { isPublished: true, schedules: { some: { classId: { in: classIds! } } } } : {}) },
    orderBy: { startDate: 'asc' },
    include: { _count: { select: { marks: true } }, schedules: { select: { classId: true } } },
  });
  return exams.map((e) => ({ ...e, classCount: new Set(e.schedules.map((s) => s.classId)).size, schedules: undefined }));
});

export const POST = route({ module: 'exams', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().min(2, 'Exam name is required').max(80),
      term: z.string().trim().max(20).optional().nullable(),
      startDate: zDate,
      endDate: zDate,
      academicYear: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      classIds: z.array(z.string()).max(50).optional(),
      maxMarks: z.coerce.number().min(1).max(1000).default(100),
    })
  );
  if (input.endDate < input.startDate) throw badRequest('End date must be after start date.');
  const year = input.academicYear ?? (await currentAcademicYear(ctx));
  const exam = await ctx.db.$transaction(async (tx) => {
    const e = await tx.exam.create({ data: { schoolId: ctx.user.schoolId, name: input.name, term: input.term ?? null, startDate: toDate(input.startDate)!, endDate: toDate(input.endDate)!, academicYear: year } });
    // Seed the date sheet from each class's subject list so setup is one click away.
    if (input.classIds?.length) {
      const subjects = await tx.classSubject.findMany({ where: { classId: { in: input.classIds } } });
      const pass = (max: number) => Math.round((max * ctx.school.settings.exams.subjectPassPercent) / 100);
      await tx.examSchedule.createMany({
        data: subjects.map((s) => ({ schoolId: ctx.user.schoolId, examId: e.id, classId: s.classId, subjectId: s.subjectId, maxMarks: input.maxMarks, passMarks: pass(input.maxMarks) })),
      });
    }
    return e;
  });
  await ctx.audit('CREATE', 'Exam', exam.id, `${input.name} (${year})`);
  return exam;
});
