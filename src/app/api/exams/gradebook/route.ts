import { z } from 'zod';
import { badRequest, forbidden, query, route } from '@/server/api';
import { assertSectionAccess } from '@/server/scope';
import { computeClassResults, loadGradeScale } from '@/server/services/exams';
import { weightedGradebook } from '@/server/services/gradebook';

/**
 * Weighted gradebook for a section across up to 6 exams.
 * ?sectionId=…&exams=examId:weight,examId:weight   (weights are relative, e.g. 20,30,50)
 */
export const GET = route({ module: 'exams' }, async (ctx, req) => {
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') throw forbidden();
  const q = query(req, z.object({ sectionId: z.string().min(1), exams: z.string().min(1) }));
  await assertSectionAccess(ctx, q.sectionId);
  const parts = q.exams.split(',').slice(0, 6).map((p) => {
    const [id, w] = p.split(':');
    return { id, weight: Number(w ?? 1) };
  });
  if (parts.some((p) => !p.id || !Number.isFinite(p.weight) || p.weight <= 0 || p.weight > 100)) throw badRequest('Each exam needs a weight between 1 and 100.');
  const section = await ctx.db.section.findUniqueOrThrow({ where: { id: q.sectionId }, select: { classId: true } });
  const exams = await ctx.db.exam.findMany({ where: { id: { in: parts.map((p) => p.id) } }, select: { id: true, name: true } });
  if (exams.length !== parts.length) throw badRequest('Unknown exam.');
  const [scale, slices] = await Promise.all([
    loadGradeScale(ctx.db),
    Promise.all(parts.map(async (p) => ({ examId: p.id, weight: p.weight, ...(await computeClassResults(ctx.db, ctx.school.settings, p.id, section.classId, { sectionId: q.sectionId })) }))),
  ]);
  const book = weightedGradebook(slices, scale);
  const totalW = parts.reduce((a, p) => a + p.weight, 0);
  return { exams: parts.map((p) => ({ id: p.id, name: exams.find((e) => e.id === p.id)!.name, weight: p.weight, share: Math.round((p.weight / totalW) * 1000) / 10 })), ...book };
});
