import { z } from 'zod';
import { body, conflict, route } from '@/server/api';

/** Manual stock adjustment (purchase received, damage, audit correction). */
export const POST = route({ module: 'store', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ delta: z.coerce.number().int().min(-100_000).max(100_000).refine((v) => v !== 0, 'Enter a non-zero quantity'), reason: z.enum(['PURCHASE', 'RETURN', 'DAMAGE', 'AUDIT', 'OTHER']), note: z.string().trim().max(200).optional() }));
  await ctx.db.product.findUniqueOrThrow({ where: { id } });
  // Conditional update keeps stock from going negative under concurrent sales.
  const res = await ctx.db.product.updateMany({ where: { id, ...(input.delta < 0 ? { stock: { gte: -input.delta } } : {}) }, data: { stock: { increment: input.delta } } });
  if (!res.count) throw conflict('Not enough stock to remove that many.');
  const p = await ctx.db.product.findUniqueOrThrow({ where: { id }, select: { stock: true, name: true } });
  await ctx.audit('UPDATE', 'Product', id, `Stock ${input.delta > 0 ? '+' : ''}${input.delta} (${input.reason}${input.note ? `: ${input.note}` : ''}) → ${p.stock}`);
  return { stock: p.stock };
});
