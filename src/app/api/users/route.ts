import { z } from 'zod';
import type { Prisma, Role } from '@prisma/client';
import { forbidden, paginate, pageQuery, query, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { hasSchoolWideScope, studentWhere } from '@/server/scope';
import { STAFF_ROLES } from '@/lib/modules';

/** Login accounts by type: student, parent or staff (eSkooly "Manage Login"). Passwords are never returned. */
export const GET = route({ anyOf: [{ module: 'students' }, { module: 'guardians' }, { module: 'employees' }] }, async (ctx, req) => {
  const q = query(req, pageQuery.extend({ type: z.enum(['STUDENT', 'PARENT', 'STAFF']), classId: z.string().optional(), active: z.enum(['true', 'false']).optional() }));
  const mod = q.type === 'STUDENT' ? 'students' : q.type === 'PARENT' ? 'guardians' : 'employees';
  if (!ctx.can(mod)) throw forbidden();
  // Teachers only see logins of students (and their families) in their own sections.
  const scoped = !hasSchoolWideScope(ctx) || !!q.classId;
  const studentFilter: Prisma.StudentWhereInput = { AND: [await studentWhere(ctx), ...(q.classId ? [{ classId: q.classId }] : [])] };

  const where: Prisma.UserWhereInput = {
    role: q.type === 'STAFF' ? { in: STAFF_ROLES as Role[] } : (q.type as Role),
    ...(q.active ? { isActive: q.active === 'true' } : {}),
    ...(q.search ? { OR: [{ name: { contains: q.search } }, { username: { contains: q.search } }, { phone: { contains: q.search } }] } : {}),
    ...(scoped && q.type === 'STUDENT' ? { student: studentFilter } : {}),
    ...(scoped && q.type === 'PARENT' ? { guardian: { students: { some: studentFilter } } } : {}),
  };
  const [rows, total] = await Promise.all([
    ctx.db.user.findMany({
      where,
      orderBy: { name: 'asc' },
      ...paginate(q.page, q.pageSize),
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        phone: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
        mustChangePassword: true,
        lockedUntil: true,
        student: { select: { admissionNo: true, class: { select: { name: true } }, section: { select: { name: true } } } },
        employee: { select: { employeeCode: true, designation: true } },
        guardian: { select: { familyCode: true, _count: { select: { students: true } } } },
      },
    }),
    ctx.db.user.count({ where }),
  ]);
  return Response.json({
    success: true,
    data: rows.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      role: u.role,
      phone: u.phone,
      email: u.email,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      pendingFirstLogin: u.mustChangePassword,
      locked: !!u.lockedUntil && u.lockedUntil > new Date(),
      detail: u.student ? `${u.student.admissionNo} · ${classLabel(u.student.class, u.student.section)}` : u.employee ? `${u.employee.employeeCode} · ${u.employee.designation}` : u.guardian ? `${u.guardian.familyCode ?? ''} · ${u.guardian._count.students} child(ren)` : '',
    })),
    total,
    page: q.page,
    pageSize: q.pageSize,
  });
});
