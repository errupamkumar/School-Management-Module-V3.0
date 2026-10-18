import { z } from 'zod';
import { badRequest, body, owned, query, route } from '@/server/api';
import { classLabel, currentAcademicYear } from '@/server/common';
import { fromPaise } from '@/server/services/money';
import { money } from '@/lib/validators';

const ay = z.string().regex(/^\d{4}-\d{2}$/, 'Use 2026-27');

/** Fee structure matrix: every class × fee head for an academic year. */
export const GET = route({ module: 'fees' }, async (ctx, req) => {
  const q = query(req, z.object({ academicYear: ay.optional() }));
  const year = q.academicYear ?? (await currentAcademicYear(ctx));
  const [classes, heads, structures] = await Promise.all([
    ctx.db.class.findMany({ where: { isActive: true }, orderBy: { numericOrder: 'asc' }, select: { id: true, name: true, _count: { select: { students: { where: { status: 'ACTIVE' } } } } } }),
    ctx.db.feeHead.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] }),
    ctx.db.feeStructure.findMany({ where: { academicYear: year } }),
  ]);
  return {
    academicYear: year,
    heads,
    classes: classes.map((c) => {
      const items = structures.filter((s) => s.classId === c.id);
      return {
        id: c.id,
        label: classLabel(c),
        students: c._count.students,
        items: items.map((s) => ({ feeHeadId: s.feeHeadId, amount: s.amount, frequency: s.frequency, months: s.months, dueDay: s.dueDay, lateFeeType: s.lateFeeType, lateFeeAmount: s.lateFeeAmount })),
      };
    }),
  };
});

const itemSchema = z.object({
  feeHeadId: z.string().min(1),
  amount: money,
  frequency: z.enum(['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY', 'ONE_TIME']),
  months: z.array(z.number().int().min(1).max(12)).max(12).nullable().optional(),
  dueDay: z.coerce.number().int().min(1).max(28).default(10),
  lateFeeType: z.enum(['NONE', 'FIXED', 'PER_DAY']).default('NONE'),
  lateFeeAmount: money.default(0),
});

/** Replace one class's fee structure, or copy all classes from another year (`copyFrom`). */
export const PUT = route({ module: 'fees', action: 'edit' }, async (ctx, req) => {
  const input = await body(
    req,
    z.union([
      z.object({ academicYear: ay, classIds: z.array(z.string()).min(1).max(50), items: z.array(itemSchema).max(30) }),
      z.object({ academicYear: ay, copyFrom: ay, increasePercent: z.coerce.number().min(-50).max(100).default(0) }),
    ])
  );

  if ('copyFrom' in input) {
    if (input.copyFrom === input.academicYear) throw badRequest('Choose a different year to copy from.');
    const source = await ctx.db.feeStructure.findMany({ where: { academicYear: input.copyFrom } });
    if (!source.length) throw badRequest(`No fee structure found for ${input.copyFrom}.`);
    const factor = 1 + input.increasePercent / 100;
    await ctx.db.$transaction([
      ctx.db.feeStructure.deleteMany({ where: { academicYear: input.academicYear } }),
      ctx.db.feeStructure.createMany({
        data: source.map((s) => ({
          schoolId: ctx.user.schoolId,
          academicYear: input.academicYear,
          classId: s.classId,
          feeHeadId: s.feeHeadId,
          amount: fromPaise(Math.round(Number(s.amount) * factor) * 100),
          frequency: s.frequency,
          months: s.months ?? undefined,
          dueDay: s.dueDay,
          lateFeeType: s.lateFeeType,
          lateFeeAmount: s.lateFeeAmount,
        })),
      }),
    ]);
    await ctx.audit('UPDATE', 'FeeStructure', null, `Copied ${input.copyFrom} → ${input.academicYear} (+${input.increasePercent}%)`);
    return { copied: source.length };
  }

  for (const id of input.classIds) await owned(ctx.db.class, id, 'Class');
  const headIds = [...new Set(input.items.map((i) => i.feeHeadId))];
  if (headIds.length !== input.items.length) throw badRequest('Each fee head can appear only once.');
  const found = await ctx.db.feeHead.count({ where: { id: { in: headIds } } });
  if (found !== headIds.length) throw badRequest('Unknown fee head.');

  await ctx.db.$transaction(async (tx) => {
    for (const classId of input.classIds) {
      await tx.feeStructure.deleteMany({ where: { academicYear: input.academicYear, classId } });
      if (input.items.length) {
        await tx.feeStructure.createMany({
          data: input.items
            .filter((i) => i.amount > 0)
            .map((i) => ({
              schoolId: ctx.user.schoolId,
              academicYear: input.academicYear,
              classId,
              feeHeadId: i.feeHeadId,
              amount: fromPaise(Math.round(i.amount * 100)),
              frequency: i.frequency,
              months: i.months?.length ? i.months : undefined,
              dueDay: i.dueDay,
              lateFeeType: i.lateFeeType,
              lateFeeAmount: fromPaise(Math.round(i.lateFeeAmount * 100)),
            })),
        });
      }
    }
  });
  await ctx.audit('UPDATE', 'FeeStructure', null, `${input.academicYear}: ${input.classIds.length} class(es), ${input.items.length} heads`);
  return { updated: input.classIds.length };
});
