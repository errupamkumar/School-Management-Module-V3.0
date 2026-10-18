import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { ok, paginate, pageQuery, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { teacherSectionIds } from '@/server/scope';

export const GET = route({ module: 'guardians' }, async (ctx, req) => {
  const q = query(req, pageQuery.extend({ phone: z.string().max(15).optional(), classId: z.string().optional() }));
  const and: Prisma.GuardianWhereInput[] = [];
  if (ctx.user.role === 'TEACHER') and.push({ students: { some: { sectionId: { in: await teacherSectionIds(ctx) } } } });
  if (q.phone) and.push({ primaryPhone: q.phone.replace(/\D/g, '').slice(-10) });
  if (q.classId) and.push({ students: { some: { classId: q.classId } } });
  if (q.search) {
    and.push({
      OR: [
        { fatherName: { contains: q.search } },
        { motherName: { contains: q.search } },
        { guardianName: { contains: q.search } },
        { primaryPhone: { contains: q.search } },
        { familyCode: { contains: q.search } },
        { students: { some: { OR: [{ firstName: { contains: q.search } }, { admissionNo: { contains: q.search } }] } } },
      ],
    });
  }
  const where = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    ctx.db.guardian.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      ...paginate(q.page, q.pageSize),
      include: {
        students: { select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true, class: { select: { name: true } }, section: { select: { name: true } } } },
        user: { select: { username: true, isActive: true, lastLoginAt: true } },
      },
    }),
    ctx.db.guardian.count({ where }),
  ]);
  return ok(
    rows.map((g) => ({
      ...g,
      displayName: g.fatherName || g.motherName || g.guardianName || 'Guardian',
      students: g.students.map((s) => ({ ...s, name: displayName(s), classLabel: classLabel(s.class, s.section) })),
    })),
    { meta: { total, page: q.page, pageSize: q.pageSize } }
  );
});
