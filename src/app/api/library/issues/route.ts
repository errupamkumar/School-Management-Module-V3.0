import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, conflict, forbidden, query, route } from '@/server/api';
import { dayUTC, displayName, todayUTC } from '@/server/common';
import { hasSchoolWideScope, ownClassSectionPairs } from '@/server/scope';

export const GET = route({ module: 'library' }, async (ctx, req) => {
  const q = query(req, z.object({ status: z.enum(['OUT', 'OVERDUE', 'RETURNED', 'ALL']).default('OUT'), borrowerId: z.string().optional(), studentId: z.string().optional() }));
  const where: Prisma.BookIssueWhereInput = {};
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
    if (!p) throw forbidden();
    where.borrowerId = p.studentId;
  } else if (!hasSchoolWideScope(ctx)) {
    // Teachers see their own borrowings.
    if (!ctx.user.employeeId) throw forbidden();
    where.borrowerId = ctx.user.employeeId;
  } else if (q.borrowerId) where.borrowerId = q.borrowerId;
  if (q.status === 'OUT') where.returnedOn = null;
  if (q.status === 'OVERDUE') Object.assign(where, { returnedOn: null, dueOn: { lt: todayUTC() } });
  if (q.status === 'RETURNED') where.returnedOn = { not: null };
  const rows = await ctx.db.bookIssue.findMany({ where, orderBy: { issuedOn: 'desc' }, take: 500, include: { book: { select: { title: true, author: true, rackNo: true } } } });
  const today = todayUTC();
  return rows.map((r) => ({ ...r, overdueDays: !r.returnedOn && r.dueOn < today ? Math.floor((today.getTime() - r.dueOn.getTime()) / 86_400_000) : 0 }));
});

/** Issue a book to a student or employee. */
export const POST = route({ module: 'library', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ bookId: z.string().min(1), borrowerType: z.enum(['STUDENT', 'EMPLOYEE']), borrowerId: z.string().min(1), dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }));
  const due = dayUTC(input.dueOn);
  if (due < todayUTC()) throw badRequest('Due date cannot be in the past.');
  let name: string;
  if (input.borrowerType === 'STUDENT') {
    const s = await ctx.db.student.findUnique({ where: { id: input.borrowerId }, select: { firstName: true, lastName: true, status: true } });
    if (!s || s.status !== 'ACTIVE') throw badRequest('Student not found or not active.');
    name = displayName(s);
  } else {
    const e = await ctx.db.employee.findUnique({ where: { id: input.borrowerId }, select: { firstName: true, lastName: true, status: true } });
    if (!e || e.status !== 'ACTIVE') throw badRequest('Employee not found or not active.');
    name = displayName(e);
  }
  const open = await ctx.db.bookIssue.count({ where: { borrowerId: input.borrowerId, returnedOn: null } });
  if (open >= 5) throw conflict(`${name} already has ${open} books issued (limit 5).`);
  const issue = await ctx.db.$transaction(async (tx) => {
    // Conditional decrement guards against issuing the last copy twice at once.
    const res = await tx.book.updateMany({ where: { id: input.bookId, available: { gt: 0 } }, data: { available: { decrement: 1 } } });
    if (!res.count) throw conflict('No copies of this book are available.');
    return tx.bookIssue.create({ data: { schoolId: ctx.user.schoolId, bookId: input.bookId, borrowerType: input.borrowerType, borrowerId: input.borrowerId, borrowerName: name, issuedOn: todayUTC(), dueOn: due, issuedById: ctx.user.id } });
  });
  await ctx.audit('CREATE', 'BookIssue', issue.id, `${name} — due ${input.dueOn}`);
  return issue;
});
