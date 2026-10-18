import { publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { PUBLIC_POST, publicBlogSchool } from '@/server/services/public-blog';
import { plainExcerpt } from '@/lib/markdown';

/** Public school news page: posts marked "show on public page", newest first. */
export const GET = publicRoute({ name: 'public-blog', limit: 600, windowSec: 600 }, async (_req, { code }) => {
  const { id, ...school } = await publicBlogSchool(code);
  const posts = await prisma.blogPost.findMany({ where: { schoolId: id, ...PUBLIC_POST }, orderBy: { publishedAt: 'desc' }, take: 50, select: { title: true, slug: true, excerpt: true, body: true, coverFileId: true, authorName: true, publishedAt: true } });
  return { school, posts: posts.map(({ body, ...p }) => ({ ...p, excerpt: p.excerpt || plainExcerpt(body) })) };
});
