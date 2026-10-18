import { z } from 'zod';
import { badRequest, body, forbidden, notFound, route, type Ctx } from '@/server/api';
import { zDate } from '@/server/crud';
import { notifyRoles } from '@/server/services/notify';

const FAMILY = ['PARENT', 'STUDENT'];

async function album(ctx: Ctx, id: string) {
  const a = await ctx.db.galleryAlbum.findUnique({ where: { id } });
  if (!a || (a.visibility === 'STAFF' && FAMILY.includes(ctx.user.role))) throw notFound('Album');
  return { a, canEdit: ctx.can('gallery', 'edit') || a.createdById === ctx.user.id };
}

export const GET = route({ module: 'gallery' }, async (ctx, _req, { id }) => {
  const { a, canEdit } = await album(ctx, id);
  const photos = await ctx.db.galleryPhoto.findMany({ where: { albumId: id }, orderBy: { createdAt: 'asc' } });
  return { ...a, photos, canEdit };
});

export const PUT = route({ module: 'gallery' }, async (ctx, req, { id }) => {
  const { canEdit } = await album(ctx, id);
  if (!canEdit) throw forbidden();
  const input = await body(
    req,
    z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(2000).nullable(), eventDate: zDate.nullable(), visibility: z.enum(['ALL', 'STAFF']), coverFileId: z.string().nullable() }).partial()
  );
  if (input.coverFileId) {
    const n = await ctx.db.galleryPhoto.count({ where: { albumId: id, fileId: input.coverFileId } });
    if (!n) throw badRequest('The cover must be one of the album photos.');
  }
  const row = await ctx.db.galleryAlbum.update({
    where: { id },
    data: { ...input, ...(input.eventDate !== undefined ? { eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null } : {}) },
  });
  await ctx.audit('UPDATE', 'GalleryAlbum', id, Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'gallery' }, async (ctx, _req, { id }) => {
  const { a } = await album(ctx, id);
  if (!(ctx.can('gallery', 'delete') || a.createdById === ctx.user.id)) throw forbidden();
  await ctx.db.galleryAlbum.delete({ where: { id } });
  await ctx.audit('DELETE', 'GalleryAlbum', id, a.title);
  return { deleted: true };
});

/** Add uploaded photos (purpose GALLERY) to the album; optionally tell families. */
export const POST = route({ module: 'gallery', action: 'create' }, async (ctx, req, { id }) => {
  const { a, canEdit } = await album(ctx, id);
  if (!canEdit) throw forbidden();
  const input = await body(req, z.object({ photos: z.array(z.object({ fileId: z.string().min(1), caption: z.string().trim().max(200).optional().nullable() })).min(1).max(100), notify: z.boolean().default(false) }));
  const files = await ctx.db.storedFile.findMany({ where: { id: { in: input.photos.map((p) => p.fileId) }, purpose: 'GALLERY' }, select: { id: true, mimeType: true } });
  if (files.length !== new Set(input.photos.map((p) => p.fileId)).size || files.some((f) => !f.mimeType.startsWith('image/'))) throw badRequest('Upload the photos first (JPG, PNG or WebP).');
  const total = await ctx.db.galleryPhoto.count({ where: { albumId: id } });
  if (total + input.photos.length > 500) throw badRequest('An album holds up to 500 photos.');
  await ctx.db.galleryPhoto.createMany({ data: input.photos.map((p) => ({ schoolId: ctx.user.schoolId, albumId: id, fileId: p.fileId, caption: p.caption ?? null })) });
  if (input.notify && a.visibility === 'ALL') {
    await notifyRoles(ctx.db, ctx.user.schoolId, ['PARENT', 'STUDENT'], { title: `New photos: ${a.title}`, body: `${input.photos.length} photos added to the school gallery.`, link: `/gallery?album=${id}` });
  }
  await ctx.audit('CREATE', 'GalleryPhoto', id, `${input.photos.length} photos → ${a.title}`);
  return { added: input.photos.length };
});

/** Remove one photo: ?photoId= */
export const PATCH = route({ module: 'gallery' }, async (ctx, req, { id }) => {
  const { canEdit } = await album(ctx, id);
  if (!canEdit) throw forbidden();
  const input = await body(req, z.object({ removePhotoId: z.string().min(1) }));
  const p = await ctx.db.galleryPhoto.findFirst({ where: { id: input.removePhotoId, albumId: id } });
  if (!p) throw notFound('Photo');
  await ctx.db.galleryPhoto.delete({ where: { id: p.id } });
  await ctx.db.galleryAlbum.updateMany({ where: { id, coverFileId: p.fileId }, data: { coverFileId: null } });
  await ctx.audit('DELETE', 'GalleryPhoto', p.id);
  return { removed: true };
});
