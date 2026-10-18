import { z } from 'zod';
import { badRequest, body, conflict, forbidden, notFound, route, type Ctx } from '@/server/api';
import { audienceFilter } from '@/server/services/audience';
import { readFields, tally } from '@/server/services/forms';

async function load(ctx: Ctx, id: string) {
  const f = await ctx.db.form.findUnique({ where: { id } });
  if (!f) throw notFound('Form');
  const manage = ctx.can('polls', 'edit') || f.createdById === ctx.user.id;
  if (!manage && (f.status === 'DRAFT' || !(await audienceFilter(ctx))(f.audience))) throw notFound('Form');
  return { f, manage };
}

/** Full results. Managers see every answer (names unless anonymous); others the tally once allowed. */
export const GET = route({ module: 'polls' }, async (ctx, _req, { id }) => {
  const { f, manage } = await load(ctx, id);
  const responses = await ctx.db.formResponse.findMany({ where: { formId: id }, orderBy: { createdAt: 'asc' }, select: { userId: true, userName: true, userRole: true, answers: true, createdAt: true } });
  const mine = responses.find((r) => r.userId === ctx.user.id) ?? null;
  const isOpen = f.status === 'OPEN' && (!f.closesAt || f.closesAt > new Date());
  const canSee = manage || (f.resultsVisible === 'AFTER_RESPONSE' && (!!mine || !isOpen));
  if (!canSee) throw forbidden('Results are shared after you respond.');
  const fields = readFields(f.fields);
  return {
    id: f.id,
    title: f.title,
    kind: f.kind,
    anonymous: f.anonymous,
    responseCount: responses.length,
    results: tally(fields, responses, { withText: manage, names: manage && !f.anonymous }),
    // Individual responses for export: managers only, never for anonymous forms.
    responses: manage && !f.anonymous ? responses.map((r) => ({ name: r.userName, role: r.userRole, at: r.createdAt, answers: r.answers })) : [],
  };
});

/** Close/reopen, extend, or edit wording. Questions are locked once anyone has answered. */
export const PUT = route({ module: 'polls' }, async (ctx, req, { id }) => {
  const { f, manage } = await load(ctx, id);
  if (!manage) throw forbidden();
  const input = await body(
    req,
    z.object({
      title: z.string().trim().min(3).max(150).optional(),
      description: z.string().trim().max(2000).nullable().optional(),
      status: z.enum(['OPEN', 'CLOSED']).optional(),
      closesAt: z.string().datetime({ offset: true }).nullable().optional(),
      resultsVisible: z.enum(['AFTER_RESPONSE', 'CREATOR_ONLY']).optional(),
    })
  );
  const data: Record<string, unknown> = { ...input };
  if (input.closesAt !== undefined) data.closesAt = input.closesAt ? new Date(input.closesAt) : null;
  if (input.status === 'OPEN' && f.closesAt && f.closesAt <= new Date() && input.closesAt === undefined) data.closesAt = null;
  if (!Object.keys(data).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.form.update({ where: { id }, data });
  await ctx.audit('UPDATE', 'Form', id, Object.keys(data).join(', '));
  return row;
});

export const DELETE = route({ module: 'polls' }, async (ctx, _req, { id }) => {
  const { f } = await load(ctx, id);
  if (!(ctx.can('polls', 'delete') || f.createdById === ctx.user.id)) throw forbidden();
  const n = await ctx.db.formResponse.count({ where: { formId: id } });
  if (n && !ctx.can('polls', 'delete')) throw conflict(`${n} people have already responded. Close it instead, or ask an admin to delete it.`);
  await ctx.db.form.delete({ where: { id } });
  await ctx.audit('DELETE', 'Form', id, f.title);
  return { deleted: true };
});
