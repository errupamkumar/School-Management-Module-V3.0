import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route } from '@/server/api';
import { audienceFilter } from '@/server/services/audience';
import { notifyUsers } from '@/server/services/notify';

/** Reply to a discussion. Locked topics take no replies; the author hears about new replies. */
export const POST = route({ module: 'discussion', action: 'create' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ body: z.string().trim().min(1, 'Write a reply').max(5000) }));
  const t = await ctx.db.discussionTopic.findUnique({ where: { id } });
  if (!t || (!ctx.can('discussion', 'edit') && t.authorId !== ctx.user.id && !(await audienceFilter(ctx))(t.audience))) throw notFound('Discussion');
  if (t.locked) throw badRequest('This discussion is locked.');
  const [post] = await ctx.db.$transaction([
    ctx.db.discussionPost.create({ data: { schoolId: ctx.user.schoolId, topicId: id, body: input.body, authorId: ctx.user.id, authorName: ctx.user.name, authorRole: ctx.user.role } }),
    ctx.db.discussionTopic.update({ where: { id }, data: { postCount: { increment: 1 }, lastPostAt: new Date() } }),
  ]);
  if (t.authorId !== ctx.user.id) await notifyUsers(ctx.db, ctx.user.schoolId, [t.authorId], { title: `New reply: ${t.title}`, body: `${ctx.user.name}: ${input.body.slice(0, 120)}`, link: `/discussions?topic=${id}` });
  await ctx.audit('CREATE', 'DiscussionPost', post.id, `Reply in "${t.title}"`);
  return post;
});

/** Remove a reply (its author or a moderator). The text is hidden; a placeholder keeps the thread readable. */
export const DELETE = route({ module: 'discussion' }, async (ctx, req, { id }) => {
  const postId = req.nextUrl.searchParams.get('postId') ?? '';
  const p = await ctx.db.discussionPost.findFirst({ where: { id: postId, topicId: id } });
  if (!p || p.removedAt) throw notFound('Reply');
  if (p.authorId !== ctx.user.id && !ctx.can('discussion', 'edit')) throw forbidden();
  await ctx.db.discussionPost.update({ where: { id: p.id }, data: { removedAt: new Date(), removedBy: ctx.user.name, body: '' } });
  await ctx.audit('DELETE', 'DiscussionPost', p.id, p.authorId === ctx.user.id ? 'Removed own reply' : `Moderated reply by ${p.authorName}`);
  return { removed: true };
});
