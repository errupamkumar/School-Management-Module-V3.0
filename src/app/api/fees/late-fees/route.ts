import { route } from '@/server/api';
import { todayUTC } from '@/server/common';
import { applyLateFees } from '@/server/services/fees';

/** Applies each class's late-fee rule to overdue invoices (idempotent for fixed fines). */
export const POST = route({ module: 'fees', action: 'edit' }, async (ctx) => {
  const res = await applyLateFees(ctx.db, todayUTC());
  await ctx.audit('UPDATE', 'FeeInvoice', null, `Late fees applied to ${res.updated} invoices`);
  return res;
});
