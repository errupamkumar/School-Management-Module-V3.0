import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route, type Ctx } from '@/server/api';
import { zDate } from '@/server/crud';
import { notifyUsers } from '@/server/services/notify';

async function load(ctx: Ctx, id: string) {
  const t = await ctx.db.task.findUnique({ where: { id }, include: { assignees: true } });
  if (!t) throw notFound('Task');
  const manage = ctx.can('tasks', 'edit') || t.createdById === ctx.user.id;
  const assignee = t.assignees.find((a) => a.userId === ctx.user.id) ?? null;
  if (!manage && !assignee) throw notFound('Task');
  return { t, manage, assignee };
}

/** Task status follows its assignees: all done → done; anyone started → in progress. */
function rollUp(statuses: string[], current: string): string {
  if (current === 'CANCELLED') return current;
  if (statuses.length && statuses.every((s) => s === 'DONE')) return 'DONE';
  if (statuses.some((s) => s !== 'OPEN')) return 'IN_PROGRESS';
  return 'OPEN';
}

export const GET = route({ module: 'tasks' }, async (ctx, _req, { id }) => {
  const { t, manage, assignee } = await load(ctx, id);
  const comments = await ctx.db.taskComment.findMany({ where: { taskId: id }, orderBy: { createdAt: 'asc' } });
  return { ...t, comments, canManage: manage, myStatus: assignee?.status ?? null };
});

export const PATCH = route({ module: 'tasks' }, async (ctx, req, { id }) => {
  const { t, manage, assignee } = await load(ctx, id);
  const input = await body(
    req,
    z.object({
      myStatus: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
      title: z.string().trim().min(3).max(150).optional(),
      description: z.string().trim().max(5000).nullable().optional(),
      priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
      dueDate: zDate.nullable().optional(),
      cancel: z.boolean().optional(),
      reopen: z.boolean().optional(),
      addAssigneeIds: z.array(z.string()).max(50).optional(),
      removeAssigneeIds: z.array(z.string()).max(50).optional(),
    })
  );
  const editsTask = ['title', 'description', 'priority', 'dueDate', 'cancel', 'reopen', 'addAssigneeIds', 'removeAssigneeIds'].some((k) => (input as Record<string, unknown>)[k] !== undefined);
  if (editsTask && !manage) throw forbidden('Only the person who gave the task (or a manager) can change it.');
  if (input.myStatus && !assignee) throw badRequest('You are not assigned to this task.');
  if (t.status === 'CANCELLED' && !input.reopen) throw badRequest('This task was cancelled.');

  await ctx.db.$transaction(async (tx) => {
    if (input.myStatus && assignee) await tx.taskAssignee.update({ where: { id: assignee.id }, data: { status: input.myStatus, completedAt: input.myStatus === 'DONE' ? new Date() : null } });
    if (input.addAssigneeIds?.length) {
      const users = await tx.user.findMany({ where: { id: { in: input.addAssigneeIds }, isActive: true, role: { notIn: ['PARENT', 'STUDENT', 'PLATFORM_ADMIN'] } }, select: { id: true, name: true } });
      if (users.length !== new Set(input.addAssigneeIds).size) throw badRequest('Tasks can only be assigned to active staff.');
      for (const u of users) if (!t.assignees.some((a) => a.userId === u.id)) await tx.taskAssignee.create({ data: { schoolId: ctx.user.schoolId, taskId: id, userId: u.id, userName: u.name } });
    }
    if (input.removeAssigneeIds?.length) await tx.taskAssignee.deleteMany({ where: { taskId: id, userId: { in: input.removeAssigneeIds } } });
    const remaining = await tx.taskAssignee.findMany({ where: { taskId: id }, select: { status: true } });
    if (!remaining.length) throw badRequest('A task needs at least one person.');
    const base = input.cancel ? 'CANCELLED' : input.reopen ? 'OPEN' : t.status;
    const status = input.cancel ? 'CANCELLED' : rollUp(remaining.map((r) => r.status), base);
    await tx.task.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.dueDate !== undefined ? { dueDate: input.dueDate ? new Date(`${input.dueDate}T00:00:00.000Z`) : null } : {}),
        status,
        completedAt: status === 'DONE' ? (t.completedAt ?? new Date()) : null,
      },
    });
  });
  if (input.myStatus === 'DONE' && t.createdById !== ctx.user.id) await notifyUsers(ctx.db, ctx.user.schoolId, [t.createdById], { title: `Task done: ${t.title}`, body: `${ctx.user.name} marked it complete.`, link: `/tasks?task=${id}` });
  if (input.addAssigneeIds?.length) await notifyUsers(ctx.db, ctx.user.schoolId, input.addAssigneeIds, { title: `New task: ${t.title}`, body: `From ${t.createdByName}`, link: `/tasks?task=${id}` });
  await ctx.audit('UPDATE', 'Task', id, Object.keys(input).join(', '));
  return ctx.db.task.findUnique({ where: { id }, include: { assignees: true } });
});

export const DELETE = route({ module: 'tasks' }, async (ctx, _req, { id }) => {
  const { t } = await load(ctx, id);
  if (!(ctx.can('tasks', 'delete') || t.createdById === ctx.user.id)) throw forbidden();
  await ctx.db.task.delete({ where: { id } });
  await ctx.audit('DELETE', 'Task', id, t.title);
  return { deleted: true };
});

/** Add a comment (anyone on the task); everyone else on it is notified. */
export const POST = route({ module: 'tasks' }, async (ctx, req, { id }) => {
  const { t } = await load(ctx, id);
  const input = await body(req, z.object({ body: z.string().trim().min(1).max(2000) }));
  const c = await ctx.db.taskComment.create({ data: { schoolId: ctx.user.schoolId, taskId: id, userId: ctx.user.id, userName: ctx.user.name, body: input.body } });
  const others = [t.createdById, ...t.assignees.map((a) => a.userId)].filter((u) => u !== ctx.user.id);
  await notifyUsers(ctx.db, ctx.user.schoolId, others, { title: `Comment on: ${t.title}`, body: `${ctx.user.name}: ${input.body.slice(0, 120)}`, link: `/tasks?task=${id}` });
  return c;
});
