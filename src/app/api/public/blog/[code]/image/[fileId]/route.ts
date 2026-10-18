import { notFound, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { readStored } from '@/server/services/files';
import { PUBLIC_POST, publicBlogSchool } from '@/server/services/public-blog';

/** Cover image of a public post — only files that are the cover of a post shown publicly. */
export const GET = publicRoute({ name: 'public-blog-image', limit: 1200, windowSec: 600 }, async (_req, { code, fileId }) => {
  const { id } = await publicBlogSchool(code);
  const used = await prisma.blogPost.count({ where: { schoolId: id, coverFileId: fileId, ...PUBLIC_POST } });
  const f = used ? await prisma.storedFile.findFirst({ where: { id: fileId, schoolId: id, purpose: 'BLOG' } }) : null;
  if (!f || !f.mimeType.startsWith('image/')) throw notFound('Image');
  const buf = await readStored(f.path);
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': f.mimeType, 'Content-Length': String(buf.length), 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cache-Control': 'public, max-age=3600' },
  });
});
