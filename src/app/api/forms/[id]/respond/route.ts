import { z } from 'zod';
import { badRequest, body, conflict, notFound, route } from '@/server/api';
import { audienceFilter } from '@/server/services/audience';
import { readFields, validateAnswers } from '@/server/services/forms';

/** Submit (or, when allowed, change) this user's response. One response per person. */
export const POST = route({ module: 'polls' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ answers: z.record(z.string(), z.unknown()) }));
  const f = await ctx.db.form.findUnique({ where: { id } });
  if (!f || f.status === 'DRAFT' || !(await audienceFilter(ctx))(f.audience)) throw notFound('Form');
  if (f.status !== 'OPEN' || (f.closesAt && f.closesAt <= new Date())) throw badRequest('This form is closed.');
  const checked = validateAnswers(readFields(f.fields), input.answers);
  if (!checked.ok) throw badRequest(checked.error);
  const existing = await ctx.db.formResponse.findUnique({ where: { formId_userId: { formId: id, userId: ctx.user.id } } });
  if (existing && !f.allowEdit) throw conflict('You have already responded.');
  const row = existing
    ? await ctx.db.formResponse.update({ where: { id: existing.id }, data: { answers: checked.answers } })
    : await ctx.db.formResponse.create({ data: { schoolId: ctx.user.schoolId, formId: id, userId: ctx.user.id, userName: ctx.user.name, userRole: ctx.user.role, answers: checked.answers } });
  // Anonymous forms: the audit records that someone answered, never what.
  await ctx.audit(existing ? 'UPDATE' : 'CREATE', 'FormResponse', row.id, f.anonymous ? `Response to "${f.title}"` : `Response to "${f.title}" by ${ctx.user.name}`);
  return { ok: true, answers: checked.answers };
});
