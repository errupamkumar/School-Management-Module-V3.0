import { z } from 'zod';
import { body, forbidden, route } from '@/server/api';
import { notifyFamilies } from '@/server/services/notify';

/** Publish (or withhold) results. Publishing notifies every family whose child has marks. */
export const POST = route({ module: 'exams', action: 'edit' }, async (ctx, req, { id }) => {
  if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN') throw forbidden('Only the principal can publish results.');
  const input = await body(req, z.object({ publish: z.boolean() }));
  const exam = await ctx.db.exam.update({ where: { id }, data: { isPublished: input.publish } });
  if (input.publish) {
    const students = await ctx.db.examMark.findMany({ where: { examId: id }, distinct: ['studentId'], select: { studentId: true } });
    await notifyFamilies(ctx.db, ctx.user.schoolId, students.map((s) => s.studentId), { title: `${exam.name} results published`, body: 'Report cards are now available in the parent and student portal.', link: '/exams' }, { includeStudents: true });
  }
  await ctx.audit('UPDATE', 'Exam', id, input.publish ? 'Published results' : 'Withheld results');
  return { isPublished: exam.isPublished };
});
