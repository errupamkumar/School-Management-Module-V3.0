import { z } from 'zod';
import { body, forbidden, owned, query, route } from '@/server/api';
import { hasSchoolWideScope } from '@/server/scope';
import { displayName, classLabel } from '@/server/common';
import { fromPaise } from '@/server/services/money';

export const GET = route({ module: 'fees' }, async (ctx, req) => {
  // Concessions reveal RTE / financial-aid status — never show them to families.
  if (!hasSchoolWideScope(ctx)) throw forbidden();
  const q = query(req, z.object({ studentId: z.string().optional() }));
  const rows = await ctx.db.feeConcession.findMany({ where: q.studentId ? { studentId: q.studentId } : {}, orderBy: { createdAt: 'desc' }, take: 500 });
  const students = await ctx.db.student.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.studentId))] } }, select: { id: true, firstName: true, lastName: true, admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } });
  const heads = await ctx.db.feeHead.findMany({ select: { id: true, name: true } });
  return rows.map((r) => {
    const s = students.find((x) => x.id === r.studentId);
    return { ...r, studentName: s ? displayName(s) : '—', admissionNo: s?.admissionNo, classLabel: s ? classLabel(s.class, s.section) : '', headName: r.feeHeadId ? heads.find((h) => h.id === r.feeHeadId)?.name : 'All heads' };
  });
});

export const POST = route({ module: 'fees', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      studentId: z.string().min(1),
      feeHeadId: z.string().nullable().optional(),
      kind: z.enum(['PERCENT', 'FIXED']),
      value: z.coerce.number().positive('Value must be positive').max(1_000_000),
      reason: z.enum(['SIBLING', 'STAFF_WARD', 'MERIT', 'RTE', 'SPORTS', 'FINANCIAL_AID', 'OTHER']).default('OTHER'),
    }).refine((v) => v.kind !== 'PERCENT' || v.value <= 100, { path: ['value'], message: 'Percentage cannot exceed 100' })
  );
  await owned(ctx.db.student, input.studentId, 'Student');
  await owned(ctx.db.feeHead, input.feeHeadId, 'Fee head');
  const row = await ctx.db.feeConcession.create({ data: { schoolId: ctx.user.schoolId, studentId: input.studentId, feeHeadId: input.feeHeadId || null, kind: input.kind, value: fromPaise(Math.round(input.value * 100)), reason: input.reason } });
  await ctx.audit('CREATE', 'FeeConcession', row.id, `${input.kind} ${input.value} (${input.reason}) for student ${input.studentId}`);
  return row;
});
