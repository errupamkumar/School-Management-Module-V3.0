import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, ok, owned, paginate, pageQuery, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { studentWhere } from '@/server/scope';
import { admitStudent } from '@/server/services/people';
import { toPaise } from '@/server/services/money';
import { admitSchema, checkPhoto } from '@/server/resources/students';

const listQuery = pageQuery.extend({
  classId: z.string().optional(),
  sectionId: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'TRANSFERRED', 'PASSED_OUT', 'DROPPED', 'ALL']).default('ACTIVE'),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  category: z.string().max(20).optional(),
  transport: z.enum(['yes', 'no']).optional(),
  rte: z.enum(['yes']).optional(),
  guardianId: z.string().optional(),
  sort: z.enum(['name', 'admissionNo', 'class', 'recent']).default('class'),
});

export const GET = route({ module: 'students' }, async (ctx, req) => {
  const q = query(req, listQuery);
  const and: Prisma.StudentWhereInput[] = [await studentWhere(ctx)];
  if (q.status !== 'ALL') and.push({ status: q.status });
  if (q.classId) and.push({ classId: q.classId });
  if (q.sectionId) and.push({ sectionId: q.sectionId });
  if (q.gender) and.push({ gender: q.gender });
  if (q.category) and.push({ category: q.category });
  if (q.guardianId) and.push({ guardianId: q.guardianId });
  if (q.rte) and.push({ isRte: true });
  if (q.transport === 'yes') and.push({ transport: { isNot: null } });
  if (q.transport === 'no') and.push({ transport: { is: null } });
  if (q.search) {
    const s = q.search;
    const parts = s.split(/\s+/).filter(Boolean);
    and.push({
      OR: [
        { firstName: { contains: s } },
        { lastName: { contains: s } },
        { admissionNo: { contains: s } },
        { rollNo: s },
        { guardian: { fatherName: { contains: s } } },
        { guardian: { motherName: { contains: s } } },
        { guardian: { primaryPhone: { contains: s } } },
        ...(parts.length >= 2 ? [{ AND: [{ firstName: { contains: parts[0] } }, { lastName: { contains: parts.slice(1).join(' ') } }] }] : []),
      ],
    });
  }
  const where = { AND: and };
  const orderBy: Prisma.StudentOrderByWithRelationInput[] =
    q.sort === 'name'
      ? [{ firstName: 'asc' }, { lastName: 'asc' }]
      : q.sort === 'admissionNo'
        ? [{ admissionNo: 'asc' }]
        : q.sort === 'recent'
          ? [{ createdAt: 'desc' }]
          : [{ class: { numericOrder: 'asc' } }, { section: { name: 'asc' } }, { firstName: 'asc' }];

  const [rows, total] = await Promise.all([
    ctx.db.student.findMany({
      where,
      orderBy,
      ...paginate(q.page, q.pageSize),
      select: {
        id: true,
        admissionNo: true,
        rollNo: true,
        firstName: true,
        lastName: true,
        gender: true,
        dob: true,
        status: true,
        photoUrl: true,
        isRte: true,
        apaarConsent: true,
        admissionDate: true,
        category: true,
        classId: true,
        sectionId: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
        guardian: { select: { id: true, fatherName: true, motherName: true, primaryPhone: true } },
        transport: { select: { route: { select: { name: true } } } },
      },
    }),
    ctx.db.student.count({ where }),
  ]);

  let dues = new Map<string, number>();
  if (ctx.can('fees') && rows.length) {
    const inv = await ctx.db.feeInvoice.groupBy({ by: ['studentId'], where: { studentId: { in: rows.map((r) => r.id) }, status: { in: ['UNPAID', 'PARTIAL'] } }, _sum: { total: true, paidAmount: true } });
    dues = new Map(inv.map((i) => [i.studentId, (toPaise(i._sum.total) - toPaise(i._sum.paidAmount)) / 100]));
  }

  return ok(
    rows.map((r) => ({
      ...r,
      name: displayName(r),
      classLabel: classLabel(r.class, r.section),
      dues: ctx.can('fees') ? dues.get(r.id) ?? 0 : null,
      routeName: r.transport?.route.name ?? null,
    })),
    { meta: { total, page: q.page, pageSize: q.pageSize } }
  );
});

export const POST = route({ module: 'students', action: 'create' }, async (ctx, req) => {
  const input = await body(req, admitSchema);
  try {
    checkPhoto(input.student.photoUrl);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  const campusId = input.student.campusId ?? (await ctx.db.class.findUniqueOrThrow({ where: { id: input.student.classId } })).campusId;
  await owned(ctx.db.class, input.student.classId, 'Class');
  await owned(ctx.db.section, input.student.sectionId, 'Section');
  await owned(ctx.db.campus, campusId, 'Campus');

  const result = await admitStudent(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    student: { ...input.student, campusId },
    guardian: input.guardian,
    createLogins: input.createLogins,
  });
  await ctx.db.consent.create({
    data: { schoolId: ctx.user.schoolId, studentId: result.studentId, guardianId: result.guardianId, purpose: 'DATA_PROCESSING', status: 'GRANTED', recordedBy: ctx.user.id, ip: ctx.ip, decidedAt: new Date() },
  });
  if (input.student.apaarConsent && input.student.apaarConsent !== 'PENDING') {
    await ctx.db.consent.create({
      data: { schoolId: ctx.user.schoolId, studentId: result.studentId, guardianId: result.guardianId, purpose: 'APAAR', status: input.student.apaarConsent, recordedBy: ctx.user.id, ip: ctx.ip, decidedAt: new Date() },
    });
  }
  await ctx.audit('CREATE', 'Student', result.studentId, `Admitted ${input.student.firstName} ${input.student.lastName ?? ''} (${result.admissionNo})`);
  return result;
});
