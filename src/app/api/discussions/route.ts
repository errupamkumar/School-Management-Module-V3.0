import { z } from 'zod';
import { badRequest, body, route } from '@/server/api';
import { audienceFilter, audienceSchema, audienceUserIds, checkAudience, viewerClassIds } from '@/server/services/audience';
import { notifyUsers } from '@/server/services/notify';

const FAMILY = ['PARENT', 'STUDENT'];

/** Topics this user can read: pinned first, then most recently active. */
export const GET = route({ module: 'discussion' }, async (ctx) => {
  const moderator = ctx.can('discussion', 'edit');
  const rows = await ctx.db.discussionTopic.findMany({ orderBy: [{ pinned: 'desc' }, { lastPostAt: 'desc' }], take: 300 });
  const visible = await audienceFilter(ctx);
  return rows.filter((t) => moderator || t.authorId === ctx.user.id || visible(t.audience)).map((t) => ({ ...t, body: t.body.slice(0, 280), canModerate: moderator }));
});

export const POST = route({ module: 'discussion', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ title: z.string().trim().min(3).max(150), body: z.string().trim().min(1).max(10_000), audience: audienceSchema, notify: z.boolean().default(false) }));
  let audience = await checkAudience(ctx, input.audience);
  // Families start topics only for their own children's classes, with teachers and admins in the loop.
  if (FAMILY.includes(ctx.user.role)) {
    const own = await viewerClassIds(ctx);
    const classIds = audience.classIds.length ? audience.classIds : own;
    if (!classIds.length || classIds.some((c) => !own.includes(c))) throw badRequest('You can start discussions for your own class only.');
    if (audience.roles.some((r) => !['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'].includes(r))) throw badRequest('Family discussions can include parents, students and teachers.');
    audience = { roles: [...new Set([...audience.roles, ctx.user.role as 'PARENT' | 'STUDENT', 'TEACHER' as const])], classIds };
  }
  const row = await ctx.db.discussionTopic.create({
    data: { schoolId: ctx.user.schoolId, title: input.title, body: input.body, audience, authorId: ctx.user.id, authorName: ctx.user.name, authorRole: ctx.user.role },
  });
  if (input.notify && ctx.can('discussion', 'edit')) {
    const ids = (await audienceUserIds(ctx.db, audience)).filter((id) => id !== ctx.user.id);
    await notifyUsers(ctx.db, ctx.user.schoolId, ids, { title: `New discussion: ${input.title}`, body: input.body.slice(0, 140), link: `/discussions?topic=${row.id}` });
  }
  await ctx.audit('CREATE', 'DiscussionTopic', row.id, input.title);
  return row;
});
