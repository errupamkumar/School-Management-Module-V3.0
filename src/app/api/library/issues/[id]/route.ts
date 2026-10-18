import { z } from 'zod';
import { badRequest, body, route } from '@/server/api';
import { todayUTC } from '@/server/common';
import { fromPaise } from '@/server/services/money';

const FINE_PER_DAY = 2; // ₹ per overdue day (configurable later per school)

/** Return a book. Fine defaults to ₹2/day overdue and is posted to Accounts when collected. */
export const PATCH = route({ module: 'library', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ fine: z.coerce.number().min(0).max(100_000).optional(), collectFine: z.boolean().default(true) }));
  const issue = await ctx.db.bookIssue.findUniqueOrThrow({ where: { id } });
  if (issue.returnedOn) throw badRequest('Already returned.');
  const today = todayUTC();
  const late = Math.max(0, Math.floor((today.getTime() - issue.dueOn.getTime()) / 86_400_000));
  const fine = input.fine ?? late * FINE_PER_DAY;
  await ctx.db.$transaction(async (tx) => {
    await tx.bookIssue.update({ where: { id }, data: { returnedOn: today, fine: fromPaise(Math.round(fine * 100)) } });
    await tx.book.update({ where: { id: issue.bookId }, data: { available: { increment: 1 } } });
    if (fine > 0 && input.collectFine) {
      const head = await tx.accountHead.upsert({ where: { schoolId_name_type: { schoolId: ctx.user.schoolId, name: 'Library Fines', type: 'INCOME' } }, update: {}, create: { schoolId: ctx.user.schoolId, name: 'Library Fines', type: 'INCOME' } });
      await tx.ledgerEntry.create({ data: { schoolId: ctx.user.schoolId, headId: head.id, type: 'INCOME', amount: fromPaise(Math.round(fine * 100)), date: today, description: `Library fine — ${issue.borrowerName}`, mode: 'CASH', party: issue.borrowerName, source: 'MANUAL', createdById: ctx.user.id } });
    }
  });
  await ctx.audit('UPDATE', 'BookIssue', id, `Returned; fine ₹${fine}`);
  return { returned: true, lateDays: late, fine };
});
