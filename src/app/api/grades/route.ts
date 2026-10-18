import { z } from 'zod';
import { badRequest, body, forbidden, route } from '@/server/api';
import { loadGradeScale } from '@/server/services/exams';
import { settingsSchema } from '@/server/settings';

export const GET = route({ module: 'exams' }, async (ctx) => ({ grades: await loadGradeScale(ctx.db), criteria: ctx.school.settings.exams }));

/** Replace the grading scale and pass/fail criteria. Ranges must cover 0–100 without overlap. */
export const PUT = route({ anyOf: [{ module: 'settings', action: 'edit' }, { module: 'exams', action: 'edit' }] }, async (ctx, req) => {
  if (ctx.user.role !== 'SUPER_ADMIN' && ctx.user.role !== 'ADMIN' && !ctx.can('settings', 'edit')) throw forbidden('Only administrators can change grading.');
  const input = await body(
    req,
    z.object({
      grades: z
        .array(z.object({ grade: z.string().trim().min(1).max(4), minPercent: z.coerce.number().min(0).max(100), maxPercent: z.coerce.number().min(0).max(100), gradePoint: z.coerce.number().min(0).max(10).nullable().optional(), remark: z.string().trim().max(40).nullable().optional(), isPass: z.boolean() }))
        .min(2)
        .max(15),
      criteria: settingsSchema.shape.exams.unwrap().optional(),
    })
  );
  const sorted = [...input.grades].sort((a, b) => a.minPercent - b.minPercent);
  if (sorted[0].minPercent !== 0) throw badRequest('The lowest grade must start at 0%.');
  if (Math.abs(sorted[sorted.length - 1].maxPercent - 100) > 0.01) throw badRequest('The highest grade must end at 100%.');
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].minPercent > sorted[i].maxPercent) throw badRequest(`Grade ${sorted[i].grade}: “from” is above “to”.`);
    if (i > 0 && sorted[i].minPercent <= sorted[i - 1].maxPercent - 0.001) throw badRequest(`Grades ${sorted[i - 1].grade} and ${sorted[i].grade} overlap.`);
    if (i > 0 && sorted[i].minPercent - sorted[i - 1].maxPercent > 1.0001) throw badRequest(`There is a gap between ${sorted[i - 1].grade} and ${sorted[i].grade}.`);
  }
  await ctx.db.$transaction(async (tx) => {
    await tx.gradeScale.deleteMany({ where: {} });
    await tx.gradeScale.createMany({ data: sorted.map((g) => ({ schoolId: ctx.user.schoolId, grade: g.grade, minPercent: g.minPercent, maxPercent: g.maxPercent, gradePoint: g.gradePoint ?? null, remark: g.remark ?? null, isPass: g.isPass })) });
    if (input.criteria) {
      const school = await tx.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { settings: true } });
      await tx.school.update({ where: { id: ctx.user.schoolId }, data: { settings: { ...((school.settings as object) ?? {}), exams: input.criteria } } });
    }
  });
  await ctx.audit('UPDATE', 'GradeScale', null, `${sorted.length} grades${input.criteria ? ' + pass criteria' : ''}`);
  return { saved: sorted.length };
});
