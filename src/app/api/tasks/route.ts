import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, query, route } from '@/server/api';
import { zDate } from '@/server/crud';
import { notifyUsers } from '@/server/services/notify';

/** My tasks (assigned to me), tasks I gave, or every task (managers). */
export const GET = route({ module: 'tasks' }, async (ctx, req) => {
  const q = query(req, z.object({ scope: z.enum(['mine', 'given', 'all']).default('mine'), status: z.enum(['ACTIVE', 'DONE', 'ALL']).default('ACTIVE') }));
  const and: Prisma.TaskWhereInput[] = [];
  if (q.scope === 'mine') and.push({ assignees: { some: { userId: ctx.user.id } } });
  else if (q.scope === 'given') and.push({ createdById: ctx.user.id });
  else if (!ctx.can('tasks', 'edit')) and.push({ OR: [{ createdById: ctx.user.id }, { assignees: { some: { userId: ctx.user.id } } }] });
  if (q.status === 'ACTIVE') and.push({ status: { in: ['OPEN', 'IN_PROGRESS'] } });
  else if (q.status === 'DONE') and.push({ status: { in: ['DONE', 'CANCELLED'] } });
  const rows = await ctx.db.task.findMany({
    where: { AND: and },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    take: 500,
    include: { assignees: { select: { userId: true, userName: true, status: true, completedAt: true } }, _count: { select: { comments: true } } },
  });
  const today = new Date(new Date().toISOString().slice(0, 10));
  return rows.map((t) => ({ ...t, overdue: !!t.dueDate && t.dueDate < today && ['OPEN', 'IN_PROGRESS'].includes(t.status), myStatus: t.assignees.find((a) => a.userId === ctx.user.id)?.status ?? null, canManage: ctx.can('tasks', 'edit') || t.createdById === ctx.user.id }));
});

export const POST = route({ module: 'tasks', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      title: z.string().trim().min(3).max(150),
      description: z.string().trim().max(5000).optional().nullable(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
      dueDate: zDate.optional().nullable(),
      assigneeIds: z.array(z.string().min(1)).min(1, 'Assign it to someone').max(50),
    })
  );
  const ids = [...new Set(input.assigneeIds)];
  const users = await ctx.db.user.findMany({ where: { id: { in: ids }, isActive: true, role: { notIn: ['PARENT', 'STUDENT', 'PLATFORM_ADMIN'] } }, select: { id: true, name: true } });
  if (users.length !== ids.length) throw badRequest('Tasks can only be assigned to active staff.');
  const task = await ctx.db.task.create({
    data: {
      schoolId: ctx.user.schoolId,
      title: input.title,
      description: input.description ?? null,
      priority: input.priority,
      dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null,
      createdById: ctx.user.id,
      createdByName: ctx.user.name,
      assignees: { create: users.map((u) => ({ schoolId: ctx.user.schoolId, userId: u.id, userName: u.name })) },
    },
  });
  await notifyUsers(ctx.db, ctx.user.schoolId, ids.filter((id) => id !== ctx.user.id), { title: `New task: ${input.title}`, body: `From ${ctx.user.name}${input.dueDate ? ` · due ${input.dueDate}` : ''}`, link: `/tasks?task=${task.id}` });
  await ctx.audit('CREATE', 'Task', task.id, `${input.title} → ${users.map((u) => u.name).join(', ')}`);
  return task;
});
