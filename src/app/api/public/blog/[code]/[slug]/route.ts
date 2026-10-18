import { notFound, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { PUBLIC_POST, publicBlogSchool } from '@/server/services/public-blog';

export const GET = publicRoute({ name: 'public-blog', limit: 600, windowSec: 600 }, async (_req, { code, slug }) => {
  const { id, ...school } = await publicBlogSchool(code);
  const post = await prisma.blogPost.findFirst({ where: { schoolId: id, slug, ...PUBLIC_POST }, select: { title: true, slug: true, excerpt: true, body: true, coverFileId: true, authorName: true, publishedAt: true } });
  if (!post) throw notFound('Post');
  return { school, post };
});
