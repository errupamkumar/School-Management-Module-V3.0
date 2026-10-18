import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, ok, paginate, pageQuery, query, route } from '@/server/api';
import { dayUTC } from '@/server/common';
import { fromPaise } from '@/server/services/money';
import { positiveMoney } from '@/lib/validators';

export const GET = route({ module: 'accounts' }, async (ctx, req) => {
  const q = query(
    req,
    pageQuery.extend({
      type: z.enum(['INCOME', 'EXPENSE']).optional(),
      headId: z.string().optional(),
      source: z.string().max(20).optional(),
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
  );
  const and: Prisma.LedgerEntryWhereInput[] = [];
  if (q.type) and.push({ type: q.type });
  if (q.headId) and.push({ headId: q.headId });
  if (q.source) and.push({ source: q.source });
  if (q.from) and.push({ date: { gte: dayUTC(q.from) } });
  if (q.to) and.push({ date: { lte: dayUTC(q.to) } });
  if (q.search) and.push({ OR: [{ description: { contains: q.search } }, { party: { contains: q.search } }, { referenceNo: { contains: q.search } }] });
  const where = and.length ? { AND: and } : {};
  const [rows, total, sum] = await Promise.all([
    ctx.db.ledgerEntry.findMany({ where, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }], ...paginate(q.page, q.pageSize), include: { head: { select: { name: true } } } }),
    ctx.db.ledgerEntry.count({ where }),
    ctx.db.ledgerEntry.aggregate({ where, _sum: { amount: true } }),
  ]);
  return ok(rows, { meta: { total, page: q.page, pageSize: q.pageSize, sumAmount: Number(sum._sum.amount ?? 0) } });
});

export const POST = route({ module: 'accounts', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      headId: z.string().min(1, 'Choose an account head'),
      amount: positiveMoney,
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date is required'),
      description: z.string().trim().min(2, 'Description is required').max(200),
      mode: z.enum(['CASH', 'UPI', 'CARD', 'NET_BANKING', 'CHEQUE', 'DD', 'BANK_TRANSFER']).optional().nullable(),
      referenceNo: z.string().trim().max(60).optional().nullable(),
      party: z.string().trim().max(100).optional().nullable(),
    })
  );
  const head = await ctx.db.accountHead.findUnique({ where: { id: input.headId } });
  if (!head) throw badRequest('Unknown account head.');
  if (head.isSystem) throw badRequest('System heads are posted automatically (fees, salaries, store). Use a manual head.');
  const date = dayUTC(input.date);
  if (date > new Date(Date.now() + 86_400_000)) throw badRequest('Date cannot be in the future.');
  const entry = await ctx.db.ledgerEntry.create({
    data: {
      schoolId: ctx.user.schoolId,
      headId: head.id,
      type: head.type,
      amount: fromPaise(Math.round(input.amount * 100)),
      date,
      description: input.description,
      mode: input.mode ?? null,
      referenceNo: input.referenceNo ?? null,
      party: input.party ?? null,
      source: 'MANUAL',
      createdById: ctx.user.id,
    },
  });
  await ctx.audit('CREATE', 'LedgerEntry', entry.id, `${head.type} ₹${input.amount} — ${head.name}: ${input.description}`);
  return entry;
});
