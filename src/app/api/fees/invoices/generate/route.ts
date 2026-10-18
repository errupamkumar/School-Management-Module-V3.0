import { z } from 'zod';
import { body, route } from '@/server/api';
import { applyAdvance, generateInvoices, periodLabel } from '@/server/services/fees';
import { notifyFamilies } from '@/server/services/notify';

export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      period: z.string().regex(/^\d{4}-\d{2}$/, 'Choose a month'),
      classIds: z.array(z.string()).max(50).optional(),
      studentIds: z.array(z.string()).max(2000).optional(),
      dueDay: z.coerce.number().int().min(1).max(28).optional(),
      notify: z.boolean().default(true),
    })
  );
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { academicYearStartMonth: true } });
  const res = await generateInvoices(ctx.db, ctx.user.schoolId, ctx.school.settings, school.academicYearStartMonth, input);
  // Families who paid in advance: settle the new invoices from their balance straight away.
  let advance = { applied: 0, invoices: 0 };
  if (res.invoiceIds.length) {
    const billed = await ctx.db.feeInvoice.findMany({ where: { id: { in: res.invoiceIds } }, select: { studentId: true } });
    advance = await applyAdvance(ctx.db, ctx.user.schoolId, [...new Set(billed.map((b) => b.studentId))]);
  }
  if (input.notify && res.invoiceIds.length) {
    const invs = await ctx.db.feeInvoice.findMany({ where: { id: { in: res.invoiceIds } }, select: { studentId: true } });
    await notifyFamilies(ctx.db, ctx.user.schoolId, invs.map((i) => i.studentId), { title: `Fee invoice for ${periodLabel(input.period)}`, body: 'A new fee invoice has been generated. You can view and pay it from the Fees section.', link: '/fees' }, { includeStudents: false });
  }
  await ctx.audit('CREATE', 'FeeInvoice', null, `Generated ${res.created} invoices for ${input.period} (skipped ${res.skipped} existing, ${res.empty} with no applicable fees)${advance.applied ? `; advance ₹${(advance.applied / 100).toFixed(2)} used on ${advance.invoices}` : ''}`);
  return { created: res.created, skipped: res.skipped, empty: res.empty, advanceApplied: advance.applied / 100, advanceInvoices: advance.invoices };
});
