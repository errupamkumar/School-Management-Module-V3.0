import { z } from 'zod';
import { forbidden, query, route } from '@/server/api';
import { classLabel, dayUTC } from '@/server/common';
import { hasSchoolWideScope } from '@/server/scope';
import { toPaise } from '@/server/services/money';

/** Collection report for a date range: by day, mode, class, fee head and collector. */
export const GET = route({ module: 'fees' }, async (ctx, req) => {
  if (!hasSchoolWideScope(ctx)) throw forbidden();
  const q = query(req, z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  const from = dayUTC(q.from);
  const to = new Date(dayUTC(q.to).getTime() + 86_400_000);
  const payments = await ctx.db.feePayment.findMany({
    where: { status: 'SUCCESS', paidAt: { gte: from, lt: to } },
    select: {
      amount: true,
      mode: true,
      paidAt: true,
      collectedByName: true,
      student: { select: { class: { select: { name: true, numericOrder: true } }, section: { select: { name: true } } } },
      allocations: { select: { amount: true, invoice: { select: { subtotal: true, discount: true, lateFee: true, items: { select: { description: true, amount: true, discount: true } } } } } },
    },
  });

  const add = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
  const byDay = new Map<string, number>();
  const byMode = new Map<string, number>();
  const byClass = new Map<string, { amount: number; order: number }>();
  const byHead = new Map<string, number>();
  const byCollector = new Map<string, number>();
  let total = 0;

  for (const p of payments) {
    const amt = toPaise(p.amount);
    total += amt;
    add(byDay, p.paidAt.toISOString().slice(0, 10), amt);
    add(byMode, p.mode, amt);
    add(byCollector, p.collectedByName ?? 'Online', amt);
    const cl = classLabel(p.student.class, p.student.section);
    byClass.set(cl, { amount: (byClass.get(cl)?.amount ?? 0) + amt, order: p.student.class.numericOrder });
    // Spread each allocation over the invoice's heads in proportion to their net amounts.
    for (const a of p.allocations) {
      const items = a.invoice.items.map((i) => ({ name: i.description, net: toPaise(i.amount) - toPaise(i.discount) }));
      const late = toPaise(a.invoice.lateFee);
      const base = items.reduce((s, i) => s + i.net, 0) + late;
      if (!base) continue;
      const alloc = toPaise(a.amount);
      for (const i of items) add(byHead, i.name.startsWith('Transport') ? 'Transport' : i.name, Math.round((alloc * i.net) / base));
      if (late) add(byHead, 'Late fee', Math.round((alloc * late) / base));
    }
  }
  const list = (m: Map<string, number>) => [...m.entries()].map(([label, v]) => ({ label, amount: v / 100 })).sort((a, b) => b.amount - a.amount);
  return {
    from: q.from,
    to: q.to,
    total: total / 100,
    count: payments.length,
    byDay: [...byDay.entries()].sort().map(([date, v]) => ({ date, amount: v / 100 })),
    byMode: list(byMode),
    byHead: list(byHead),
    byCollector: list(byCollector),
    byClass: [...byClass.entries()].sort((a, b) => a[1].order - b[1].order).map(([label, v]) => ({ label, amount: v.amount / 100 })),
  };
});
