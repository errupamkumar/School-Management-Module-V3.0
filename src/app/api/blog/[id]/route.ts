import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route, type Ctx } from '@/server/api';
import { blogInput, uniqueSlug } from '@/server/services/blog';
import { notifyRoles, notifyUsers } from '@/server/services/notify';

async function load(ctx: Ctx, id: string) {
  const p = await ctx.db.blogPost.findUnique({ where: { id } });
  const editor = ctx.can('blog', 'edit');
  if (!p || (p.status !== 'PUBLISHED' && p.authorId !== ctx.user.id && !editor)) throw notFound('Post');
  return { p, editor };
}

export const GET = route({ module: 'blog' }, async (ctx, _req, { id }) => {
  const { p, editor } = await load(ctx, id);
  return { ...p, canEdit: editor || (p.authorId === ctx.user.id && p.status !== 'PUBLISHED'), canReview: editor };
});

/**
 * Edit content (author while unpublished, or an editor) and move through the
 * workflow: draft → submit (PENDING) → publish / reject (editors) → unpublish.
 */
export const PUT = route({ module: 'blog' }, async (ctx, req, { id }) => {
  const { p, editor } = await load(ctx, id);
  const input = await body(req, blogInput.partial().extend({ action: z.enum(['draft', 'submit', 'publish', 'reject', 'unpublish']).optional(), reviewNote: z.string().trim().max(300).optional().nullable() }));
  const own = p.authorId === ctx.user.id;
  if (!editor && (!own || p.status === 'PUBLISHED')) throw forbidden('Published posts can only be changed by an editor.');
  if (['reject', 'unpublish'].includes(input.action ?? '') && !editor) throw forbidden();
  if (input.coverFileId && !(await ctx.db.storedFile.count({ where: { id: input.coverFileId, purpose: 'BLOG' } }))) throw badRequest('Upload the cover image first.');

  const data: Record<string, unknown> = {};
  for (const k of ['title', 'excerpt', 'body', 'coverFileId'] as const) if (input[k] !== undefined) data[k] = input[k];
  if (input.title && input.title !== p.title && p.status !== 'PUBLISHED') data.slug = await uniqueSlug(ctx, input.title, id);
  if (input.isPublic !== undefined && editor) data.isPublic = input.isPublic;
  switch (input.action) {
    case 'draft':
      data.status = 'DRAFT';
      break;
    case 'submit':
      data.status = editor ? p.status : 'PENDING';
      break;
    case 'publish':
      data.status = editor ? 'PUBLISHED' : 'PENDING';
      if (editor) {
        data.publishedAt = p.publishedAt ?? new Date();
        data.reviewNote = null;
      }
      break;
    case 'reject':
      data.status = 'REJECTED';
      data.reviewNote = input.reviewNote ?? null;
      break;
    case 'unpublish':
      data.status = 'DRAFT';
      data.isPublic = false;
      break;
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.blogPost.update({ where: { id }, data });
  if (data.status === 'PENDING' && p.status !== 'PENDING') await notifyRoles(ctx.db, ctx.user.schoolId, ['ADMIN'], { title: 'Blog post waiting for review', body: `"${row.title}" by ${row.authorName}`, link: '/blog?tab=review' });
  if (!own && (data.status === 'PUBLISHED' || data.status === 'REJECTED') && data.status !== p.status) {
    await notifyUsers(ctx.db, ctx.user.schoolId, [p.authorId], { title: data.status === 'PUBLISHED' ? `Published: ${row.title}` : `Changes requested: ${row.title}`, body: data.status === 'PUBLISHED' ? 'Your post is now live on the school blog.' : row.reviewNote || 'An editor sent your post back.', link: '/blog' });
  }
  await ctx.audit('UPDATE', 'BlogPost', id, `${input.action ?? 'edit'}: ${row.title}`);
  return row;
});

export const DELETE = route({ module: 'blog' }, async (ctx, _req, { id }) => {
  const { p } = await load(ctx, id);
  if (!(ctx.can('blog', 'delete') || (p.authorId === ctx.user.id && p.status !== 'PUBLISHED'))) throw forbidden();
  await ctx.db.blogPost.delete({ where: { id } });
  await ctx.audit('DELETE', 'BlogPost', id, p.title);
  return { deleted: true };
});
