import { z } from 'zod';
import { body, query, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';

/** Former students (passed out / transferred) not yet in the alumni directory. */
export const GET = route({ module: 'alumni', action: 'create' }, async (ctx, req) => {
  const q = query(req, z.object({ search: z.string().trim().max(60).optional() }));
  const rows = await ctx.db.student.findMany({
    where: { status: { in: ['PASSED_OUT', 'TRANSFERRED'] }, alumnus: null, ...(q.search ? { OR: [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { admissionNo: { contains: q.search } }] } : {}) },
    orderBy: [{ leftOn: 'desc' }, { firstName: 'asc' }],
    take: 500,
    select: { id: true, firstName: true, lastName: true, admissionNo: true, status: true, leftOn: true, class: { select: { name: true } }, section: { select: { name: true } } },
  });
  return rows.map((s) => ({ id: s.id, name: displayName(s), admissionNo: s.admissionNo, status: s.status, leftOn: s.leftOn, lastClass: classLabel(s.class, s.section) }));
});

/** Adds the chosen former students to the directory, copying name, class, year and contacts. */
export const POST = route({ module: 'alumni', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ studentIds: z.array(z.string().min(1)).min(1).max(500) }));
  const students = await ctx.db.student.findMany({
    where: { id: { in: input.studentIds }, status: { in: ['PASSED_OUT', 'TRANSFERRED'] }, alumnus: null },
    select: { id: true, firstName: true, lastName: true, leftOn: true, updatedAt: true, class: { select: { name: true } }, section: { select: { name: true } }, user: { select: { email: true } }, guardian: { select: { primaryPhone: true } } },
  });
  for (const s of students) {
    await ctx.db.alumnus.create({
      data: { schoolId: ctx.user.schoolId, studentId: s.id, name: displayName(s), passingYear: (s.leftOn ?? s.updatedAt).getUTCFullYear(), lastClass: classLabel(s.class, s.section), email: s.user?.email ?? null, phone: s.guardian?.primaryPhone ?? null },
    });
  }
  await ctx.audit('CREATE', 'Alumnus', null, `Added ${students.length} former students to alumni`);
  return { added: students.length };
});
