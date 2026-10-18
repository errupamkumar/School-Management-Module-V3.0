import { z } from 'zod';
import type { Prisma, Role } from '@prisma/client';
import { badRequest, body, forbidden, ok, owned, paginate, pageQuery, query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { hireEmployee } from '@/server/services/people';
import { employeeSchema } from '@/server/resources/employees';
import { checkPhoto } from '@/server/resources/students';
import { STAFF_ROLES } from '@/lib/modules';

export const GET = route({ module: 'employees' }, async (ctx, req) => {
  const q = query(req, pageQuery.extend({ status: z.enum(['ACTIVE', 'INACTIVE', 'ALL']).default('ACTIVE'), teaching: z.enum(['yes', 'no']).optional(), department: z.string().max(60).optional() }));
  const and: Prisma.EmployeeWhereInput[] = [];
  if (q.status !== 'ALL') and.push({ status: q.status });
  if (q.teaching) and.push({ isTeaching: q.teaching === 'yes' });
  if (q.department) and.push({ department: q.department });
  if (q.search) and.push({ OR: [{ firstName: { contains: q.search } }, { lastName: { contains: q.search } }, { employeeCode: { contains: q.search } }, { phone: { contains: q.search } }, { designation: { contains: q.search } }] });
  const where = and.length ? { AND: and } : {};
  const [rows, total] = await Promise.all([
    ctx.db.employee.findMany({
      where,
      orderBy: [{ isTeaching: 'desc' }, { firstName: 'asc' }],
      ...paginate(q.page, q.pageSize),
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        gender: true,
        phone: true,
        email: true,
        designation: true,
        department: true,
        isTeaching: true,
        joiningDate: true,
        status: true,
        photoUrl: true,
        basicSalary: true,
        allowances: true,
        deductions: true,
        user: { select: { id: true, username: true, role: true, isActive: true } },
        _count: { select: { classTeacherOf: true, assignments: true } },
      },
    }),
    ctx.db.employee.count({ where }),
  ]);
  // Salary is visible only to payroll managers (payroll "view" alone means own payslips).
  const showPay = ctx.can('payroll', 'create');
  return ok(
    rows.map((e) => ({
      ...e,
      name: displayName(e),
      basicSalary: showPay ? e.basicSalary : null,
      allowances: showPay ? e.allowances : null,
      deductions: showPay ? e.deductions : null,
    })),
    { meta: { total, page: q.page, pageSize: q.pageSize } }
  );
});

export const POST = route({ module: 'employees', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      employee: employeeSchema,
      loginRole: z.enum(STAFF_ROLES as [string, ...string[]]).nullable().optional(),
      username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/, 'Username: 3–40 letters, numbers, dot, dash or underscore').optional().nullable().or(z.literal('').transform(() => null)),
    })
  );
  try {
    checkPhoto(input.employee.photoUrl);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  if ((input.loginRole === 'SUPER_ADMIN' || input.loginRole === 'ADMIN') && ctx.user.role !== 'SUPER_ADMIN') {
    throw forbidden('Only the school owner can create administrator logins.');
  }
  const campusId = input.employee.campusId ?? (await ctx.db.campus.findFirstOrThrow({ where: { isMain: true } })).id;
  await owned(ctx.db.campus, campusId, 'Campus');
  const result = await hireEmployee(ctx.db, ctx.user.schoolId, ctx.school.settings, {
    employee: { ...input.employee, campusId },
    loginRole: (input.loginRole as Role | null) ?? null,
    username: input.username,
  });
  await ctx.audit('CREATE', 'Employee', result.employeeId, `Hired ${input.employee.firstName} ${input.employee.lastName ?? ''} as ${input.employee.designation}${input.loginRole ? ` with ${input.loginRole} login` : ''}`);
  return result;
});
