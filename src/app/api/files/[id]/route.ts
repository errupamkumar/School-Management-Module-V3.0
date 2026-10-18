import { forbidden, route } from '@/server/api';
import { readStored } from '@/server/services/files';

/**
 * Serves a stored file to signed-in users of the same school (tenant-scoped
 * lookup). Student documents need the Students module; everything else is
 * teaching material shared within the school.
 */
export const GET = route({ authenticated: true }, async (ctx, req, { id }) => {
  const f = await ctx.db.storedFile.findUniqueOrThrow({ where: { id } });
  if (f.purpose === 'DOCUMENT' && !ctx.can('students')) throw forbidden();
  const family = ctx.user.role === 'STUDENT' || ctx.user.role === 'PARENT';
  if (f.purpose === 'GALLERY') {
    if (!ctx.can('gallery')) throw forbidden();
    if (family && !(await ctx.db.galleryPhoto.count({ where: { fileId: id, album: { visibility: 'ALL' } } }))) throw forbidden();
  }
  if (f.purpose === 'BLOG' && !ctx.can('blog')) throw forbidden();
  if (f.purpose === 'DOCS') {
    // Managed documents open only for the roles they are shared with (managers see all).
    if (!ctx.can('documents')) throw forbidden();
    if (!ctx.can('documents', 'edit') && f.uploadedBy !== ctx.user.id) {
      const docs = await ctx.db.document.findMany({ where: { fileId: id }, select: { roles: true } });
      if (!docs.some((d) => Array.isArray(d.roles) && (d.roles as string[]).includes(ctx.user.role))) throw forbidden();
    }
  }
  if (f.purpose === 'SUBMISSION' && (ctx.user.role === 'STUDENT' || ctx.user.role === 'PARENT') && f.uploadedBy !== ctx.user.id) {
    // Families may only open their own uploads.
    const own = await ctx.db.homeworkSubmission.count({ where: { attachmentId: id, studentId: { in: ctx.user.studentId ? [ctx.user.studentId] : (await ctx.db.student.findMany({ where: { guardianId: ctx.user.guardianId ?? '__none__' }, select: { id: true } })).map((s) => s.id) } } });
    if (!own) throw forbidden();
  }
  const buf = await readStored(f.path);
  const inline = req.nextUrl.searchParams.get('download') !== '1' && (f.mimeType === 'application/pdf' || f.mimeType.startsWith('image/'));
  return new Response(new Uint8Array(buf), {
    headers: {
      'Content-Type': f.mimeType,
      'Content-Length': String(buf.length),
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(f.fileName)}"`,
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      'Cache-Control': 'private, max-age=300',
    },
  });
});
