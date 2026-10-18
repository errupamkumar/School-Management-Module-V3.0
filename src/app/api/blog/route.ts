import { z } from 'zod';
import { badRequest, body, query, route } from '@/server/api';
import { blogInput, uniqueSlug } from '@/server/services/blog';
import { notifyRoles } from '@/server/services/notify';
import { plainExcerpt } from '@/lib/markdown';

/** Published posts for everyone; authors also see their drafts; editors see the review queue. */
export const GET = route({ module: 'blog' }, async (ctx, req) => {
  const q = query(req, z.object({ status: z.enum(['PUBLISHED', 'PENDING', 'DRAFT', 'REJECTED', 'MINE', 'ALL']).default('PUBLISHED') }));
  const editor = ctx.can('blog', 'edit');
  const where =
    q.status === 'PUBLISHED'
      ? { status: 'PUBLISHED' }
      : q.status === 'MINE'
        ? { authorId: ctx.user.id }
        : editor
          ? q.status === 'ALL'
            ? {}
            : { status: q.status }
          : { authorId: ctx.user.id, status: q.status === 'ALL' ? undefined : q.status };
  const rows = await ctx.db.blogPost.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }], take: 200, select: { id: true, title: true, slug: true, excerpt: true, body: true, coverFileId: true, status: true, isPublic: true, authorId: true, authorName: true, authorRole: true, reviewNote: true, publishedAt: true, updatedAt: true } });
  return rows.map(({ body: text, ...r }) => ({ ...r, excerpt: r.excerpt || plainExcerpt(text), mine: r.authorId === ctx.user.id, canEdit: editor || (r.authorId === ctx.user.id && r.status !== 'PUBLISHED') }));
});

/**
 * Write a post. `submit` sends it for review; editors (blog edit right) can
 * publish straight away and choose to show it on the public news page.
 */
export const POST = route({ module: 'blog', action: 'create' }, async (ctx, req) => {
  const input = await body(req, blogInput);
  const editor = ctx.can('blog', 'edit');
  if (input.coverFileId && !(await ctx.db.storedFile.count({ where: { id: input.coverFileId, purpose: 'BLOG' } }))) throw badRequest('Upload the cover image first.');
  const status = input.action === 'publish' ? (editor ? 'PUBLISHED' : 'PENDING') : input.action === 'submit' ? 'PENDING' : 'DRAFT';
  const row = await ctx.db.blogPost.create({
    data: {
      schoolId: ctx.user.schoolId,
      title: input.title,
      slug: await uniqueSlug(ctx, input.title),
      excerpt: input.excerpt ?? null,
      body: input.body,
      coverFileId: input.coverFileId ?? null,
      status,
      isPublic: editor ? input.isPublic : false,
      authorId: ctx.user.id,
      authorName: ctx.user.name,
      authorRole: ctx.user.role,
      publishedAt: status === 'PUBLISHED' ? new Date() : null,
    },
  });
  if (status === 'PENDING') await notifyRoles(ctx.db, ctx.user.schoolId, ['ADMIN'], { title: 'Blog post waiting for review', body: `"${input.title}" by ${ctx.user.name}`, link: '/blog?tab=review' });
  await ctx.audit('CREATE', 'BlogPost', row.id, `${input.title} (${status})`);
  return row;
});
