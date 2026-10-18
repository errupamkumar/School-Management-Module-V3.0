import { z } from 'zod';
import { badRequest, body, conflict, forbidden, notFound, route, type Ctx } from '@/server/api';
import { audienceFilter } from '@/server/services/audience';

async function loadTopic(ctx: Ctx, id: string) {
  const t = await ctx.db.discussionTopic.findUnique({ where: { id } });
  if (!t) throw notFound('Discussion');
  const moderator = ctx.can('discussion', 'edit');
  if (!moderator && t.authorId !== ctx.user.id && !(await audienceFilter(ctx))(t.audience)) throw notFound('Discussion');
  return { t, moderator };
}

export const GET = route({ module: 'discussion' }, async (ctx, _req, { id }) => {
  const { t, moderator } = await loadTopic(ctx, id);
  const posts = await ctx.db.discussionPost.findMany({ where: { topicId: id }, orderBy: { createdAt: 'asc' }, take: 1000 });
  return {
    ...t,
    canModerate: moderator,
    canReply: !t.locked && ctx.can('discussion', 'create'),
    posts: posts.map((p) => (p.removedAt ? { id: p.id, removed: true, authorName: p.authorName, createdAt: p.createdAt } : { ...p, removed: false, mine: p.authorId === ctx.user.id })),
  };
});

/** Moderators pin or lock; authors may fix their own wording. */
export const PATCH = route({ module: 'discussion' }, async (ctx, req, { id }) => {
  const { t, moderator } = await loadTopic(ctx, id);
  const input = await body(req, z.object({ pinned: z.boolean().optional(), locked: z.boolean().optional(), title: z.string().trim().min(3).max(150).optional(), body: z.string().trim().min(1).max(10_000).optional() }));
  if ((input.pinned !== undefined || input.locked !== undefined) && !moderator) throw forbidden('Only moderators can pin or lock discussions.');
  if ((input.title !== undefined || input.body !== undefined) && t.authorId !== ctx.user.id && !moderator) throw forbidden();
  if (!Object.keys(input).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.discussionTopic.update({ where: { id }, data: input });
  await ctx.audit('UPDATE', 'DiscussionTopic', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'discussion' }, async (ctx, _req, { id }) => {
  const { t } = await loadTopic(ctx, id);
  const canDelete = ctx.can('discussion', 'delete') || (t.authorId === ctx.user.id && t.postCount === 0);
  if (!canDelete) throw t.authorId === ctx.user.id ? conflict('Others have replied, so the topic stays. Ask a moderator to remove it.') : forbidden();
  await ctx.db.discussionTopic.delete({ where: { id } });
  await ctx.audit('DELETE', 'DiscussionTopic', id, t.title);
  return { deleted: true };
});
