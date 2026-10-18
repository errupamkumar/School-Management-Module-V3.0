import { z } from 'zod';
import { badRequest, body, conflict, forbidden, notFound, route, type Ctx } from '@/server/api';
import { classLabel } from '@/server/common';
import { assertSectionAccess, hasSchoolWideScope, teacherSectionIds } from '@/server/scope';
import { notifyFamilies } from '@/server/services/notify';
import { forStudent, readQuestions } from '@/server/services/online-exams';

const FAMILY = ['PARENT', 'STUDENT'];

/** Staff who may manage this exam: school-wide roles, its author, or a teacher of its section/class. */
async function managed(ctx: Ctx, id: string) {
  if (FAMILY.includes(ctx.user.role)) throw forbidden();
  const e = await ctx.db.onlineExam.findUnique({ where: { id } });
  if (!e) throw notFound('Exam');
  if (!hasSchoolWideScope(ctx) && e.createdById !== ctx.user.id) {
    if (e.sectionId) await assertSectionAccess(ctx, e.sectionId);
    else if (!(await ctx.db.section.count({ where: { id: { in: await teacherSectionIds(ctx) }, classId: e.classId } }))) throw notFound('Exam');
  }
  return e;
}

export const GET = route({ module: 'online_exams' }, async (ctx, _req, { id }) => {
  if (FAMILY.includes(ctx.user.role)) {
    // Families get the cover page only; questions come with /attempt.
    const e = await ctx.db.onlineExam.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true, title: true, instructions: true, startsAt: true, endsAt: true, durationMins: true, totalMarks: true, negativeMarks: true, resultsPublished: true, questions: true } });
    if (!e) throw notFound('Exam');
    const { questions, ...rest } = e;
    return { ...rest, questionCount: readQuestions(questions).length };
  }
  const e = await managed(ctx, id);
  const [cls, subject] = await Promise.all([
    ctx.db.class.findUnique({ where: { id: e.classId }, select: { name: true, sections: { select: { id: true, name: true } } } }),
    ctx.db.subject.findUnique({ where: { id: e.subjectId }, select: { name: true } }),
  ]);
  return { ...e, classLabel: cls ? classLabel(cls, cls.sections.find((s) => s.id === e.sectionId)) : '', subjectName: subject?.name ?? '', preview: readQuestions(e.questions).map(forStudent) };
});

/** Publish / unpublish, publish results, or change timings (timings lock once attempts exist). */
export const PUT = route({ module: 'online_exams', action: 'edit' }, async (ctx, req, { id }) => {
  const e = await managed(ctx, id);
  const input = await body(
    req,
    z.object({
      status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
      resultsPublished: z.boolean().optional(),
      title: z.string().trim().min(3).max(150).optional(),
      instructions: z.string().trim().max(3000).nullable().optional(),
      startsAt: z.string().datetime({ offset: true }).optional(),
      endsAt: z.string().datetime({ offset: true }).optional(),
      durationMins: z.coerce.number().int().min(5).max(360).optional(),
    })
  );
  const attempts = await ctx.db.onlineExamAttempt.count({ where: { examId: id } });
  if (attempts && (input.startsAt || input.durationMins || input.status === 'DRAFT')) throw conflict('Students have already started this exam; its timing can no longer change (you may extend the end time).');
  const startsAt = input.startsAt ? new Date(input.startsAt) : e.startsAt;
  const endsAt = input.endsAt ? new Date(input.endsAt) : e.endsAt;
  const duration = input.durationMins ?? e.durationMins;
  if (endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() < duration * 60_000) throw badRequest('The window must be at least as long as the exam.');
  if (input.resultsPublished && attempts) {
    const pending = await ctx.db.onlineExamAttempt.count({ where: { examId: id, status: 'SUBMITTED' } });
    if (pending) throw conflict(`${pending} answer sheet(s) still need marking.`);
  }
  const row = await ctx.db.onlineExam.update({ where: { id }, data: { ...input, ...(input.startsAt ? { startsAt } : {}), ...(input.endsAt ? { endsAt } : {}) } });
  const students = async () =>
    (await ctx.db.student.findMany({ where: { status: 'ACTIVE', classId: e.classId, ...(e.sectionId ? { sectionId: e.sectionId } : {}) }, select: { id: true } })).map((s) => s.id);
  if (input.status === 'PUBLISHED' && e.status !== 'PUBLISHED') {
    await notifyFamilies(ctx.db, ctx.user.schoolId, await students(), { title: `Online exam: ${row.title}`, body: `Opens ${row.startsAt.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })} · ${row.durationMins} minutes.`, link: '/online-exams' }, { includeStudents: true });
  }
  if (input.resultsPublished && !e.resultsPublished) {
    const taken = (await ctx.db.onlineExamAttempt.findMany({ where: { examId: id }, select: { studentId: true } })).map((a) => a.studentId);
    await notifyFamilies(ctx.db, ctx.user.schoolId, taken, { title: `Result: ${row.title}`, body: 'The online exam result is out.', link: '/online-exams' }, { includeStudents: true });
  }
  await ctx.audit('UPDATE', 'OnlineExam', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'online_exams', action: 'delete' }, async (ctx, _req, { id }) => {
  const e = await managed(ctx, id);
  const attempts = await ctx.db.onlineExamAttempt.count({ where: { examId: id } });
  if (attempts && e.resultsPublished) throw conflict('Results are published; unpublish them first.');
  await ctx.db.onlineExam.delete({ where: { id } });
  await ctx.audit('DELETE', 'OnlineExam', id, `${e.title}${attempts ? ` (${attempts} attempts)` : ''}`);
  return { deleted: true };
});

