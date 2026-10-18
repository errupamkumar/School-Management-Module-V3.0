import { z } from 'zod';
import { body, route } from '@/server/api';
import { zDate } from '@/server/crud';

const FAMILY = ['PARENT', 'STUDENT'];

/** Albums, newest event first. Staff-only albums are hidden from families. */
export const GET = route({ module: 'gallery' }, async (ctx) => {
  const family = FAMILY.includes(ctx.user.role);
  const rows = await ctx.db.galleryAlbum.findMany({
    where: family ? { visibility: 'ALL' } : {},
    orderBy: [{ eventDate: 'desc' }, { createdAt: 'desc' }],
    take: 300,
    include: { _count: { select: { photos: true } }, photos: { take: 4, orderBy: { createdAt: 'asc' }, select: { fileId: true } } },
  });
  return rows.map((a) => ({ ...a, cover: a.coverFileId ?? a.photos[0]?.fileId ?? null, preview: a.photos.map((p) => p.fileId), canEdit: ctx.can('gallery', 'edit') || a.createdById === ctx.user.id }));
});

export const POST = route({ module: 'gallery', action: 'create' }, async (ctx, req) => {
  const input = await body(req, z.object({ title: z.string().trim().min(2).max(120), description: z.string().trim().max(2000).optional().nullable(), eventDate: zDate.optional().nullable(), visibility: z.enum(['ALL', 'STAFF']).default('ALL') }));
  const row = await ctx.db.galleryAlbum.create({
    data: { schoolId: ctx.user.schoolId, title: input.title, description: input.description ?? null, eventDate: input.eventDate ? new Date(`${input.eventDate}T00:00:00.000Z`) : null, visibility: input.visibility, createdById: ctx.user.id },
  });
  await ctx.audit('CREATE', 'GalleryAlbum', row.id, input.title);
  return row;
});

