import { badRequest, body, route } from '@/server/api';
import { audienceFilter, audienceUserIds, checkAudience } from '@/server/services/audience';
import { formInput, readFields, tally } from '@/server/services/forms';
import { notifyUsers } from '@/server/services/notify';

/** Polls and forms this user can answer (or manages), newest first, with their own answer and visible results. */
export const GET = route({ module: 'polls' }, async (ctx) => {
  const manager = ctx.can('polls', 'edit');
  const rows = await ctx.db.form.findMany({
    where: manager ? {} : { OR: [{ status: { in: ['OPEN', 'CLOSED'] } }, { createdById: ctx.user.id }] },
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { _count: { select: { responses: true } }, responses: { where: { userId: ctx.user.id }, select: { answers: true, updatedAt: true } } },
  });
  const visible = await audienceFilter(ctx);
  const now = new Date();
  const out = [];
  for (const f of rows) {
    const mine = f.createdById === ctx.user.id;
    if (!manager && !mine && !visible(f.audience)) continue;
    const myAnswer = f.responses[0]?.answers ?? null;
    const isOpen = f.status === 'OPEN' && (!f.closesAt || f.closesAt > now);
    // Others see the tally once they have answered (or the poll has closed), unless results are private.
    const canSeeResults = manager || mine || (f.resultsVisible === 'AFTER_RESPONSE' && (!!myAnswer || !isOpen));
    let results = null;
    if (canSeeResults && f.kind === 'POLL') {
      const responses = await ctx.db.formResponse.findMany({ where: { formId: f.id }, select: { answers: true } });
      results = tally(readFields(f.fields), responses, { withText: false, names: false });
    }
    out.push({
      id: f.id,
      title: f.title,
      description: f.description,
      kind: f.kind,
      fields: f.fields,
      audience: f.audience,
      anonymous: f.anonymous,
      allowEdit: f.allowEdit,
      resultsVisible: f.resultsVisible,
      status: f.status,
      isOpen,
      closesAt: f.closesAt,
      createdById: f.createdById,
      createdByName: f.createdByName,
      createdAt: f.createdAt,
      responseCount: f._count.responses,
      myAnswer,
      canManage: manager || mine,
      canSeeResults,
      results,
    });
  }
  return out;
});

export const POST = route({ module: 'polls', action: 'create' }, async (ctx, req) => {
  const input = await body(req, formInput);
  if (input.kind === 'POLL' && (input.fields.length !== 1 || !['SINGLE', 'MULTI'].includes(input.fields[0].type))) throw badRequest('A poll has exactly one choice question.');
  const closesAt = input.closesAt ? new Date(input.closesAt) : null;
  if (closesAt && closesAt <= new Date()) throw badRequest('The closing time must be in the future.');
  const audience = await checkAudience(ctx, input.audience);
  const row = await ctx.db.form.create({
    data: {
      schoolId: ctx.user.schoolId,
      title: input.title,
      description: input.description ?? null,
      kind: input.kind,
      fields: input.fields,
      audience,
      anonymous: input.anonymous,
      allowEdit: input.allowEdit,
      resultsVisible: input.resultsVisible,
      closesAt,
      createdById: ctx.user.id,
      createdByName: ctx.user.name,
    },
  });
  if (input.notify) {
    const ids = (await audienceUserIds(ctx.db, audience)).filter((id) => id !== ctx.user.id);
    await notifyUsers(ctx.db, ctx.user.schoolId, ids, { title: `${input.kind === 'POLL' ? 'New poll' : 'Please fill'}: ${input.title}`, body: input.description?.slice(0, 140) || 'Your response is requested.', link: '/polls' });
  }
  await ctx.audit('CREATE', 'Form', row.id, `${input.kind} "${input.title}"`);
  return row;
});
