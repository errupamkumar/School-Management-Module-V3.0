import { z } from 'zod';
import { badRequest, body, notFound, route } from '@/server/api';
import { assertStudentAccess } from '@/server/scope';

/** Record the action taken, change severity or close the incident. */
export const PUT = route({ module: 'discipline', action: 'edit' }, async (ctx, req, { id }) => {
  const r = await ctx.db.disciplineIncident.findUnique({ where: { id } });
  if (!r) throw notFound('Incident');
  await assertStudentAccess(ctx, r.studentId);
  const input = await body(
    req,
    z
      .object({
        category: z.string().trim().min(2).max(40),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
        title: z.string().trim().min(3).max(150),
        description: z.string().trim().min(3).max(5000),
        actionTaken: z.string().trim().max(2000).nullable(),
        status: z.enum(['OPEN', 'ACTION_TAKEN', 'RESOLVED']),
        visibleToFamily: z.boolean(),
      })
      .partial()
  );
  if (input.category && !ctx.school.settings.disciplineCategories.includes(input.category) && input.category !== r.category) throw badRequest('Choose a category from the list.');
  const data: Record<string, unknown> = { ...input };
  if (input.status === 'RESOLVED' && r.status !== 'RESOLVED') data.resolvedAt = new Date();
  if (input.status && input.status !== 'RESOLVED') data.resolvedAt = null;
  if (input.actionTaken && !input.status && r.status === 'OPEN') data.status = 'ACTION_TAKEN';
  if (!Object.keys(data).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.disciplineIncident.update({ where: { id }, data });
  await ctx.audit('UPDATE', 'DisciplineIncident', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'discipline', action: 'delete' }, async (ctx, _req, { id }) => {
  const r = await ctx.db.disciplineIncident.findUnique({ where: { id } });
  if (!r) throw notFound('Incident');
  await ctx.db.disciplineIncident.delete({ where: { id } });
  await ctx.audit('DELETE', 'DisciplineIncident', id, r.title);
  return { deleted: true };
});
