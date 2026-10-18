import { z } from 'zod';
import { body, query, route } from '@/server/api';
import { dayUTC, todayUTC } from '@/server/common';
import { formatNumber, nextSequence } from '@/server/db';
import { zDate } from '@/server/crud';
import { phoneIN } from '@/lib/validators';

/** Visitor register for a day (default today); `inside=1` shows only those still on campus. */
export const GET = route({ module: 'gate' }, async (ctx, req) => {
  const q = query(req, z.object({ date: zDate.optional(), inside: z.enum(['0', '1']).default('0'), search: z.string().trim().max(60).optional() }));
  const from = q.date ? dayUTC(q.date) : todayUTC();
  const to = new Date(from.getTime() + 86_400_000);
  return ctx.db.visitor.findMany({
    where: {
      ...(q.inside === '1' ? { outAt: null } : { inAt: { gte: from, lt: to } }),
      ...(q.search ? { OR: [{ name: { contains: q.search } }, { phone: { contains: q.search } }, { passNo: { contains: q.search } }] } : {}),
    },
    orderBy: { inAt: 'desc' },
    take: 500,
  });
});

export const POST = route({ module: 'gate', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      name: z.string().trim().min(2).max(80),
      phone: phoneIN,
      purpose: z.enum(['MEETING', 'ADMISSION', 'PARENT', 'DELIVERY', 'VENDOR', 'INTERVIEW', 'OTHER']),
      whomToMeet: z.string().trim().max(80).optional().nullable(),
      personCount: z.coerce.number().int().min(1).max(50).default(1),
      // Never store full ID numbers: type + last 4 digits is enough to identify the document.
      idProof: z.string().trim().max(40).regex(/^[^0-9]*\d{0,4}[^0-9]*$/, 'Record the ID type and only the last 4 digits').optional().nullable(),
      vehicleNo: z.string().trim().toUpperCase().max(15).optional().nullable(),
      notes: z.string().trim().max(300).optional().nullable(),
    })
  );
  const row = await ctx.db.$transaction(async (tx) => {
    const n = await nextSequence(tx, ctx.user.schoolId, 'visitor');
    return tx.visitor.create({ data: { schoolId: ctx.user.schoolId, passNo: formatNumber('V', n, 6), ...input, whomToMeet: input.whomToMeet ?? null, idProof: input.idProof ?? null, vehicleNo: input.vehicleNo ?? null, notes: input.notes ?? null, createdById: ctx.user.id } });
  });
  await ctx.audit('CREATE', 'Visitor', row.id, `${row.passNo} ${input.name} (${input.purpose})`);
  return row;
});
