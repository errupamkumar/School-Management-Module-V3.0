import { z } from 'zod';
import type { Prisma, Role } from '@prisma/client';
import { badRequest, body, conflict, forbidden, route } from '@/server/api';
import { classLabel, displayName } from '@/server/common';
import { aadhaarFields, createLogin } from '@/server/services/people';
import { fromPaise } from '@/server/services/money';
import { employeeSchema } from '@/server/resources/employees';
import { checkPhoto } from '@/server/resources/students';
import { STAFF_ROLES } from '@/lib/modules';

export const GET = route({ anyOf: [{ module: 'employees' }, { module: 'payroll' }] }, async (ctx, _req, { id }) => {
  // Staff without the employees module may still view their own record (via payroll).
  if (!ctx.can('employees') && ctx.user.employeeId !== id) throw forbidden();
  const e = await ctx.db.employee.findUniqueOrThrow({
    where: { id },
    include: {
      campus: { select: { name: true } },
      user: { select: { id: true, username: true, role: true, isActive: true, lastLoginAt: true } },
      classTeacherOf: { include: { class: { select: { name: true } } } },
      assignments: { include: { section: { include: { class: { select: { name: true } } } }, subject: { select: { name: true } } } },
    },
  });
  const showPay = ctx.can('payroll', 'create') || ctx.user.employeeId === id;
  return {
    ...e,
    name: displayName(e),
    aadhaarMasked: e.aadhaarLast4 ? `XXXX XXXX ${e.aadhaarLast4}` : null,
    bankAccount: e.bankAccount ? `XXXX${e.bankAccount.slice(-4)}` : null,
    basicSalary: showPay ? e.basicSalary : null,
    allowances: showPay ? e.allowances : null,
    deductions: showPay ? e.deductions : null,
    classTeacherOf: e.classTeacherOf.map((s) => classLabel(s.class, s)),
    teaches: e.assignments.map((a) => `${a.subject.name} · ${classLabel(a.section.class, a.section)}`),
  };
});

export const PUT = route({ module: 'employees', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, employeeSchema.partial().extend({ status: z.enum(['ACTIVE', 'INACTIVE']).optional(), leftOn: z.string().optional().nullable() }));
  try {
    checkPhoto(input.photoUrl);
  } catch (e) {
    throw badRequest((e as Error).message);
  }
  const current = await ctx.db.employee.findUniqueOrThrow({ where: { id }, select: { userId: true, user: { select: { role: true } } } });
  if (current.user && (current.user.role === 'SUPER_ADMIN' || current.user.role === 'ADMIN') && ctx.user.role !== 'SUPER_ADMIN') {
    throw forbidden('Only the school owner can edit administrator records.');
  }
  const { aadhaar, dob, joiningDate, basicSalary, allowances, deductions, leftOn, campusId: _c, ...rest } = input;
  const data: Prisma.EmployeeUncheckedUpdateInput = {
    ...rest,
    ...(aadhaar !== undefined ? (aadhaar ? aadhaarFields(aadhaar) : { aadhaarEnc: null, aadhaarLast4: null }) : {}),
    ...(dob !== undefined ? { dob: dob ? new Date(dob) : null } : {}),
    ...(joiningDate ? { joiningDate: new Date(joiningDate) } : {}),
    ...(basicSalary !== undefined ? { basicSalary: fromPaise(Math.round(basicSalary * 100)) } : {}),
    ...(allowances !== undefined ? { allowances: fromPaise(Math.round(allowances * 100)) } : {}),
    ...(deductions !== undefined ? { deductions: fromPaise(Math.round(deductions * 100)) } : {}),
    ...(input.status === 'INACTIVE' ? { leftOn: leftOn ? new Date(leftOn) : new Date() } : input.status === 'ACTIVE' ? { leftOn: null } : {}),
  };
  await ctx.db.$transaction(async (tx) => {
    await tx.employee.update({ where: { id }, data });
    if (current.userId && input.status) {
      await tx.user.update({ where: { id: current.userId }, data: { isActive: input.status === 'ACTIVE', ...(input.status === 'INACTIVE' ? { sessionVersion: { increment: 1 } } : {}) } });
    }
    if (current.userId && (input.firstName || input.lastName)) {
      const e = await tx.employee.findUniqueOrThrow({ where: { id } });
      await tx.user.update({ where: { id: current.userId }, data: { name: displayName(e) } });
    }
  });
  await ctx.audit('UPDATE', 'Employee', id, `Updated ${Object.keys(input).filter((k) => k !== 'aadhaar').join(', ')}`);
  return { id };
});

/** Create a login for an existing employee who has none. */
export const POST = route({ module: 'employees', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ role: z.enum(STAFF_ROLES as [string, ...string[]]), username: z.string().trim().toLowerCase().regex(/^[a-z0-9._-]{3,40}$/).optional() }));
  if ((input.role === 'SUPER_ADMIN' || input.role === 'ADMIN') && ctx.user.role !== 'SUPER_ADMIN') throw forbidden('Only the owner can grant administrator access.');
  const e = await ctx.db.employee.findUniqueOrThrow({ where: { id } });
  if (e.userId) throw conflict('This employee already has a login.');
  const res = await ctx.db.$transaction(async (tx) => {
    const login = await createLogin(tx, ctx.user.schoolId, { username: input.username || e.employeeCode, name: displayName(e), role: input.role as Role, email: e.email, phone: e.phone, campusId: e.campusId });
    await tx.employee.update({ where: { id }, data: { userId: login.userId } });
    return login;
  });
  await ctx.audit('CREATE', 'User', res.userId, `Login ${res.credential.username} (${input.role}) for employee ${e.employeeCode}`);
  return res.credential;
});

export const DELETE = route({ module: 'employees', action: 'delete' }, async (ctx, _req, { id }) => {
  const [salaries, user] = await Promise.all([ctx.db.salaryPayment.count({ where: { employeeId: id } }), ctx.db.employee.findUniqueOrThrow({ where: { id }, select: { userId: true, user: { select: { role: true } } } })]);
  if (salaries) throw conflict('This employee has salary records. Mark them inactive instead of deleting.');
  if (user.user?.role === 'SUPER_ADMIN' || user.user?.role === 'ADMIN') throw forbidden('Administrator records cannot be deleted here.');
  await ctx.db.$transaction(async (tx) => {
    await tx.employee.delete({ where: { id } });
    if (user.userId) await tx.user.delete({ where: { id: user.userId } });
  });
  await ctx.audit('DELETE', 'Employee', id);
  return { deleted: true };
});
