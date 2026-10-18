import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, ok, owned, paginate, pageQuery, query, route } from '@/server/api';
import { zDate } from '@/server/crud';
import { applyAdvance, createInstantInvoices } from '@/server/services/fees';
import { formatINR } from '@/server/services/money';
import { notifyFamilies } from '@/server/services/notify';
import { classLabel, displayName } from '@/server/common';
import { studentWhere } from '@/server/scope';

export const GET = route({ module: 'fees' }, async (ctx, req) => {
  const q = query(
    req,
    pageQuery.extend({
      period: z.string().regex(/^(\d{4}-\d{2}|INSTANT)$/).optional(),
      classId: z.string().optional(),
      sectionId: z.string().optional(),
      status: z.enum(['UNPAID', 'PARTIAL', 'PAID', 'CANCELLED', 'DUE']).optional(),
      studentId: z.string().optional(),
    })
  );
  const and: Prisma.FeeInvoiceWhereInput[] = [{ student: await studentWhere(ctx) }];
  if (q.period === 'INSTANT') and.push({ period: { startsWith: 'X-' } });
  else if (q.period) and.push({ period: q.period });
  if (q.classId) and.push({ student: { classId: q.classId } });
  if (q.sectionId) and.push({ student: { sectionId: q.sectionId } });
  if (q.studentId) and.push({ studentId: q.studentId });
  if (q.status === 'DUE') and.push({ status: { in: ['UNPAID', 'PARTIAL'] } });
  else if (q.status) and.push({ status: q.status });
  if (q.search) and.push({ OR: [{ invoiceNo: { contains: q.search } }, { student: { OR: [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { admissionNo: { contains: q.search } }] } }] });
  const where = { AND: and };
  const [rows, total, sums] = await Promise.all([
    ctx.db.feeInvoice.findMany({
      where,
      orderBy: [{ period: 'desc' }, { invoiceNo: 'desc' }],
      ...paginate(q.page, q.pageSize),
      include: { student: { select: { id: true, firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } } },
    }),
    ctx.db.feeInvoice.count({ where }),
    ctx.db.feeInvoice.aggregate({ where, _sum: { total: true, paidAmount: true } }),
  ]);
  return ok(
    rows.map((r) => ({ ...r, studentName: displayName(r.student), admissionNo: r.student.admissionNo, classLabel: classLabel(r.student.class, r.student.section), balance: Number(r.total) - Number(r.paidAmount) })),
    { meta: { total, page: q.page, pageSize: q.pageSize, sumTotal: Number(sums._sum.total ?? 0), sumPaid: Number(sums._sum.paidAmount ?? 0) } }
  );
});

/**
 * Instant fees: a one-off invoice (trip, costume, re-exam…) for chosen students,
 * a whole class or a section, outside the monthly fee structure.
 */
export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z
      .object({
        title: z.string().trim().min(3).max(80),
        studentIds: z.array(z.string().min(1)).max(2000).default([]),
        classId: z.string().optional(),
        sectionId: z.string().optional(),
        dueDate: zDate,
        items: z.array(z.object({ description: z.string().trim().min(1).max(120), amount: z.coerce.number().positive().max(10_000_000), feeHeadId: z.string().optional().nullable() })).min(1).max(20),
        notify: z.boolean().default(true),
      })
      .refine((v) => v.studentIds.length || v.classId || v.sectionId, { message: 'Choose students, a class or a section', path: ['studentIds'] })
  );
  let studentIds = input.studentIds;
  if (!studentIds.length) {
    await owned(ctx.db.class, input.classId, 'Class');
    await owned(ctx.db.section, input.sectionId, 'Section');
    studentIds = (await ctx.db.student.findMany({ where: { status: 'ACTIVE', ...(input.sectionId ? { sectionId: input.sectionId } : { classId: input.classId }) }, select: { id: true } })).map((s) => s.id);
    if (!studentIds.length) throw badRequest('No active students in that class or section.');
  } else {
    const found = await ctx.db.student.count({ where: { id: { in: studentIds }, status: 'ACTIVE' } });
    if (found !== new Set(studentIds).size) throw badRequest('Some students were not found or are not active.');
    studentIds = [...new Set(studentIds)];
  }
  for (const it of input.items) await owned(ctx.db.feeHead, it.feeHeadId, 'Fee head');
  const ids = await createInstantInvoices(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    studentIds,
    title: input.title,
    items: input.items.map((i) => ({ description: i.description, amount: Math.round(i.amount * 100), feeHeadId: i.feeHeadId ?? null })),
    dueDate: new Date(`${input.dueDate}T00:00:00.000Z`),
  });
  const advance = await applyAdvance(ctx.db, ctx.user.schoolId, studentIds);
  const total = input.items.reduce((a, i) => a + Math.round(i.amount * 100), 0);
  if (input.notify) {
    await notifyFamilies(ctx.db, ctx.user.schoolId, studentIds, { title: `New fee: ${input.title}`, body: `${formatINR(total)} due by ${input.dueDate}. You can view and pay it from the Fees section.`, link: '/fees' });
  }
  await ctx.audit('CREATE', 'FeeInvoice', null, `Instant invoice "${input.title}" ${formatINR(total)} for ${studentIds.length} students`);
  return { created: ids.length, total: total / 100, advanceApplied: advance.applied / 100 };
});
