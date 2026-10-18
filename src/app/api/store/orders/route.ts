import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { badRequest, body, conflict, ok, owned, paginate, pageQuery, query, route } from '@/server/api';
import { dayUTC, displayName } from '@/server/common';
import { formatNumber, reserveSequence } from '@/server/db';
import { fromPaise, toPaise } from '@/server/services/money';
import { postLedger } from '@/server/services/ledger';

export const GET = route({ module: 'store' }, async (ctx, req) => {
  const q = query(req, pageQuery.extend({ from: z.string().optional(), to: z.string().optional() }));
  const where: Prisma.StoreOrderWhereInput = {
    ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: dayUTC(q.from) } : {}), ...(q.to ? { lt: new Date(dayUTC(q.to).getTime() + 86_400_000) } : {}) } } : {}),
    ...(q.search ? { OR: [{ orderNo: { contains: q.search } }, { customerName: { contains: q.search } }] } : {}),
  };
  const [rows, total, sum] = await Promise.all([
    ctx.db.storeOrder.findMany({ where, orderBy: { createdAt: 'desc' }, ...paginate(q.page, q.pageSize), include: { items: true } }),
    ctx.db.storeOrder.count({ where }),
    ctx.db.storeOrder.aggregate({ where: { ...where, status: 'PAID' }, _sum: { total: true, tax: true } }),
  ]);
  return ok(rows, { meta: { total, page: q.page, pageSize: q.pageSize, sumTotal: Number(sum._sum.total ?? 0), sumTax: Number(sum._sum.tax ?? 0) } });
});

/** Point-of-sale order: checks and decrements stock atomically, computes GST, posts income. */
export const POST = route({ module: 'store', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      items: z.array(z.object({ productId: z.string().min(1), qty: z.coerce.number().int().min(1).max(1000) })).min(1).max(50),
      studentId: z.string().optional().nullable(),
      customerName: z.string().trim().max(100).optional().nullable(),
      mode: z.enum(['CASH', 'UPI', 'CARD', 'BANK_TRANSFER']),
    })
  );
  const ids = input.items.map((i) => i.productId);
  if (new Set(ids).size !== ids.length) throw badRequest('Each product can appear once — adjust the quantity instead.');
  let customer = input.customerName?.trim() || 'Walk-in customer';
  if (input.studentId) {
    await owned(ctx.db.student, input.studentId, 'Student');
    const s = await ctx.db.student.findUniqueOrThrow({ where: { id: input.studentId }, select: { firstName: true, lastName: true, admissionNo: true } });
    customer = `${displayName(s)} (${s.admissionNo})`;
  }

  const order = await ctx.db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM Product WHERE schoolId = ${ctx.user.schoolId} AND id IN (${Prisma.join(ids)}) FOR UPDATE`;
    const products = await tx.product.findMany({ where: { id: { in: ids } } });
    if (products.length !== ids.length) throw badRequest('Unknown product.');
    let sub = 0;
    let tax = 0;
    const lines = input.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      if (!p.isActive) throw badRequest(`${p.name} is not available for sale.`);
      if (p.stock < i.qty) throw conflict(`Only ${p.stock} ${p.unit} of ${p.name} in stock.`);
      const base = toPaise(p.price) * i.qty;
      const gst = Math.round((base * Number(p.gstPercent)) / 100);
      sub += base;
      tax += gst;
      return { schoolId: ctx.user.schoolId, productId: p.id, name: p.name, qty: i.qty, unitPrice: p.price, gstPercent: p.gstPercent, lineTotal: fromPaise(base + gst) };
    });
    const n = await reserveSequence(tx, ctx.user.schoolId, 'order', 1);
    const created = await tx.storeOrder.create({
      data: { schoolId: ctx.user.schoolId, orderNo: formatNumber(ctx.school.settings.numbering.orderPrefix, n, 5), studentId: input.studentId ?? null, customerName: customer, subtotal: fromPaise(sub), tax: fromPaise(tax), total: fromPaise(sub + tax), mode: input.mode, soldById: ctx.user.id, items: { create: lines } },
      include: { items: true },
    });
    for (const i of input.items) await tx.product.update({ where: { id: i.productId }, data: { stock: { decrement: i.qty } } });
    await postLedger(tx, ctx.user.schoolId, { kind: 'STORE', amount: sub + tax, date: new Date(), description: `Store sale ${created.orderNo} — ${customer}`, mode: input.mode, referenceNo: created.orderNo, party: customer, sourceId: created.id, createdById: ctx.user.id });
    return created;
  });
  await ctx.audit('CREATE', 'StoreOrder', order.id, `${order.orderNo} ₹${Number(order.total)}`);
  return order;
});
