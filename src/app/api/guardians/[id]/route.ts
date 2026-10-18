import { body, conflict, route } from '@/server/api';
import { guardianInputSchema } from '@/server/resources/students';
import { fromPaise } from '@/server/services/money';

export const PUT = route({ module: 'guardians', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, guardianInputSchema.partial());
  const current = await ctx.db.guardian.findUniqueOrThrow({ where: { id } });
  if (input.primaryPhone && input.primaryPhone !== current.primaryPhone) {
    const clash = await ctx.db.guardian.count({ where: { primaryPhone: input.primaryPhone, id: { not: id } } });
    if (clash) throw conflict('Another family already uses this mobile number. Merge siblings by editing the student instead.');
  }
  const { annualIncome, ...rest } = input;
  await ctx.db.$transaction(async (tx) => {
    await tx.guardian.update({
      where: { id },
      data: { ...rest, ...(annualIncome !== undefined ? { annualIncome: annualIncome == null ? null : fromPaise(Math.round(annualIncome * 100)) } : {}) },
    });
    // Keep the parent login's phone/name in step with the family record.
    if (current.userId && (input.primaryPhone || input.fatherName || input.motherName)) {
      await tx.user.update({
        where: { id: current.userId },
        data: {
          ...(input.primaryPhone ? { phone: input.primaryPhone } : {}),
          ...(input.fatherName || input.motherName ? { name: input.fatherName || input.motherName || undefined } : {}),
        },
      });
    }
  });
  await ctx.audit('UPDATE', 'Guardian', id, `Updated ${Object.keys(input).join(', ')}`);
  return { id };
});
