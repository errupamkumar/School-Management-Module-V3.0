import { z } from 'zod';
import { body, conflict, route } from '@/server/api';
import { removeLedgerForSource } from '@/server/services/ledger';

/** Order with lines (receipt). */
export const GET = route({ module: 'store' }, async (ctx, _req, { id }) => {
  const order = await ctx.db.storeOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true } });
  const soldBy = await ctx.db.user.findUnique({ where: { id: order.soldById }, select: { name: true } });
  return { ...order, school, soldByName: soldBy?.name ?? '' };
});

/** Cancel a sale: restores stock and removes the ledger posting. */
export const POST = route({ module: 'store', action: 'delete' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ reason: z.string().trim().min(3).max(200) }));
  const order = await ctx.db.storeOrder.findUniqueOrThrow({ where: { id }, include: { items: true } });
  if (order.status === 'CANCELLED') throw conflict('Already cancelled.');
  await ctx.db.$transaction(async (tx) => {
    for (const it of order.items) await tx.product.update({ where: { id: it.productId }, data: { stock: { increment: it.qty } } });
    await removeLedgerForSource(tx, 'STORE', id);
    await tx.storeOrder.update({ where: { id }, data: { status: 'CANCELLED' } });
  });
  await ctx.audit('CANCEL', 'StoreOrder', id, `${order.orderNo}: ${input.reason}`);
  return { cancelled: true };
});
