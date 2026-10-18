import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ok, paginate, pageQuery, query, route } from '@/server/api';
import { classLabel, dayUTC, displayName } from '@/server/common';
import { studentWhere } from '@/server/scope';

export const GET = route({ module: 'fees' }, async (ctx, req) => {
  const q = query(
    req,
    pageQuery.extend({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      mode: z.string().max(20).optional(),
      status: z.enum(['SUCCESS', 'CANCELLED', 'PENDING', 'FAILED']).optional(),
      collectedById: z.string().optional(),
      studentId: z.string().optional(),
    })
  );
  const and: Prisma.FeePaymentWhereInput[] = [{ student: await studentWhere(ctx) }, { status: q.status ?? { in: ['SUCCESS', 'CANCELLED'] } }];
  if (q.from) and.push({ paidAt: { gte: dayUTC(q.from) } });
  if (q.to) and.push({ paidAt: { lt: new Date(dayUTC(q.to).getTime() + 86_400_000) } });
  if (q.mode) and.push({ mode: q.mode as never });
  if (q.collectedById) and.push({ collectedById: q.collectedById });
  if (q.studentId) and.push({ studentId: q.studentId });
  if (q.search) and.push({ OR: [{ receiptNo: { contains: q.search } }, { referenceNo: { contains: q.search } }, { student: { OR: [{ firstName: { contains: q.search } }, { admissionNo: { contains: q.search } }] } }] });
  const where = { AND: and };
  const [rows, total, sum] = await Promise.all([
    ctx.db.feePayment.findMany({
      where,
      orderBy: { paidAt: 'desc' },
      ...paginate(q.page, q.pageSize),
      include: { student: { select: { firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
    }),
    ctx.db.feePayment.count({ where }),
    ctx.db.feePayment.aggregate({ where: { AND: [...and, { status: 'SUCCESS' }] }, _sum: { amount: true } }),
  ]);
  return ok(
    rows.map((r) => ({ ...r, studentName: displayName(r.student), admissionNo: r.student.admissionNo, classLabel: classLabel(r.student.class, r.student.section) })),
    { meta: { total, page: q.page, pageSize: q.pageSize, sumAmount: Number(sum._sum.amount ?? 0) } }
  );
});
