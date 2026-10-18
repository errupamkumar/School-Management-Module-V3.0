import { z } from 'zod';
import { query, route } from '@/server/api';
import { dayUTC } from '@/server/common';
import { toPaise } from '@/server/services/money';

/** Account statement with opening balance and running balance (eSkooly "Account Statement"). */
export const GET = route({ module: 'accounts' }, async (ctx, req) => {
  const q = query(req, z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  const from = dayUTC(q.from);
  const to = dayUTC(q.to);
  const [before, rows, heads] = await Promise.all([
    ctx.db.ledgerEntry.groupBy({ by: ['type'], where: { date: { lt: from } }, _sum: { amount: true } }),
    ctx.db.ledgerEntry.findMany({ where: { date: { gte: from, lte: to } }, orderBy: [{ date: 'asc' }, { createdAt: 'asc' }], include: { head: { select: { name: true } } }, take: 5000 }),
    ctx.db.ledgerEntry.groupBy({ by: ['headId', 'type'], where: { date: { gte: from, lte: to } }, _sum: { amount: true } }),
  ]);
  const sum = (t: string) => toPaise(before.find((b) => b.type === t)?._sum.amount);
  const opening = sum('INCOME') - sum('EXPENSE');
  let bal = opening;
  let income = 0;
  let expense = 0;
  const lines = rows.map((r) => {
    const amt = toPaise(r.amount);
    if (r.type === 'INCOME') {
      bal += amt;
      income += amt;
    } else {
      bal -= amt;
      expense += amt;
    }
    return { id: r.id, date: r.date, description: r.description, head: r.head.name, party: r.party, referenceNo: r.referenceNo, source: r.source, income: r.type === 'INCOME' ? amt / 100 : null, expense: r.type === 'EXPENSE' ? amt / 100 : null, balance: bal / 100 };
  });
  const headNames = await ctx.db.accountHead.findMany({ where: { id: { in: heads.map((h) => h.headId) } }, select: { id: true, name: true } });
  return {
    from: q.from,
    to: q.to,
    opening: opening / 100,
    income: income / 100,
    expense: expense / 100,
    closing: bal / 100,
    lines,
    byHead: heads
      .map((h) => ({ head: headNames.find((x) => x.id === h.headId)?.name ?? '—', type: h.type, amount: Number(h._sum.amount ?? 0) }))
      .sort((a, b) => b.amount - a.amount),
  };
});
