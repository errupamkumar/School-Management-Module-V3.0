import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { body, owned, query, route } from '@/server/api';
import { classLabel, currentAcademicYear } from '@/server/common';
import { formatNumber, nextSequence } from '@/server/db';
import { optionalText, phoneIN } from '@/lib/validators';

const STAGES = ['ENQUIRY', 'APPLIED', 'DOCS_VERIFIED', 'TEST_SCHEDULED', 'SEAT_OFFERED', 'ADMITTED', 'REJECTED', 'WITHDRAWN'] as const;

export const GET = route({ module: 'admissions' }, async (ctx, req) => {
  const q = query(req, z.object({ stage: z.enum(STAGES).optional(), classId: z.string().optional(), search: z.string().max(80).optional(), source: z.string().max(20).optional() }));
  const where: Prisma.AdmissionApplicationWhereInput = {
    ...(q.stage ? { stage: q.stage } : {}),
    ...(q.classId ? { classId: q.classId } : {}),
    ...(q.source ? { source: q.source } : {}),
    ...(q.search ? { OR: [{ studentName: { contains: q.search } }, { guardianName: { contains: q.search } }, { guardianPhone: { contains: q.search } }, { applicationNo: { contains: q.search } }] } : {}),
  };
  const [rows, byStage, classes] = await Promise.all([
    ctx.db.admissionApplication.findMany({ where, orderBy: [{ followUpAt: 'asc' }, { createdAt: 'desc' }], take: 500 }),
    ctx.db.admissionApplication.groupBy({ by: ['stage'], _count: true }),
    ctx.db.class.findMany({ select: { id: true, name: true } }),
  ]);
  return {
    rows: rows.map((r) => ({ ...r, classLabel: classLabel(classes.find((c) => c.id === r.classId) ?? { name: '?' }) })),
    stages: Object.fromEntries(STAGES.map((s) => [s, byStage.find((b) => b.stage === s)?._count ?? 0])),
  };
});

export const POST = route({ module: 'admissions', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      studentName: z.string().trim().min(2).max(100),
      gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional().nullable(),
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('').transform(() => null)),
      classId: z.string().min(1, 'Choose the class applied for'),
      guardianName: z.string().trim().min(2).max(100),
      guardianPhone: phoneIN,
      guardianEmail: z.email().optional().nullable().or(z.literal('').transform(() => null)),
      address: optionalText(300),
      previousSchool: optionalText(120),
      source: z.enum(['WALK_IN', 'ONLINE', 'PHONE', 'REFERRAL', 'CAMPAIGN']).default('WALK_IN'),
      notes: optionalText(2000),
      followUpAt: z.string().optional().nullable().or(z.literal('').transform(() => null)),
      consentGiven: z.boolean().default(false),
    })
  );
  await owned(ctx.db.class, input.classId, 'Class');
  const ay = await currentAcademicYear(ctx);
  const app = await ctx.db.$transaction(async (tx) => {
    const n = await nextSequence(tx, ctx.user.schoolId, 'application');
    return tx.admissionApplication.create({
      data: {
        schoolId: ctx.user.schoolId,
        applicationNo: formatNumber(ctx.school.settings.numbering.applicationPrefix, n, 5),
        stage: 'ENQUIRY',
        ...input,
        dob: input.dob ? new Date(input.dob) : null,
        followUpAt: input.followUpAt ? new Date(input.followUpAt) : null,
        academicYear: ay,
        assignedToId: ctx.user.id,
      },
    });
  });
  await ctx.audit('CREATE', 'AdmissionApplication', app.id, `${app.applicationNo} ${input.studentName}`);
  return app;
});
