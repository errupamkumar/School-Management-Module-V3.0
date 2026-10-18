import { z } from 'zod';
import { badRequest, body, owned, query, route } from '@/server/api';
import { zDate } from '@/server/crud';
import { AUDIENCE_ROLES } from '@/server/services/audience';
import { notifyRoles } from '@/server/services/notify';

const docInput = z.object({
  title: z.string().trim().min(2).max(150),
  description: z.string().trim().max(2000).optional().nullable(),
  folderId: z.string().optional().nullable(),
  fileId: z.string().min(1, 'Upload the file'),
  roles: z.array(z.enum(AUDIENCE_ROLES)).min(1, 'Choose who can open it'),
  tags: z.string().trim().max(200).optional().nullable(),
  expiresOn: zDate.optional().nullable(),
  notify: z.boolean().default(false),
});

/** Documents in a folder (or all), filtered to the roles each is shared with. Managers also get expiry alerts. */
export const GET = route({ module: 'documents' }, async (ctx, req) => {
  const q = query(req, z.object({ folderId: z.string().optional(), search: z.string().trim().max(100).optional() }));
  const manager = ctx.can('documents', 'edit');
  const [folders, docs] = await Promise.all([
    ctx.db.docFolder.findMany({ orderBy: { name: 'asc' }, include: { documents: { select: { roles: true } } } }),
    ctx.db.document.findMany({
      where: {
        ...(q.folderId === 'none' ? { folderId: null } : q.folderId ? { folderId: q.folderId } : {}),
        ...(q.search ? { OR: [{ title: { contains: q.search } }, { tags: { contains: q.search } }, { description: { contains: q.search } }] } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: 500,
      include: { folder: { select: { name: true } } },
    }),
  ]);
  const sees = (roles: unknown) => manager || (Array.isArray(roles) && (roles as string[]).includes(ctx.user.role));
  const today = new Date(new Date().toISOString().slice(0, 10));
  const soon = new Date(today.getTime() + 30 * 86_400_000);
  return {
    folders: folders.map((f) => ({ id: f.id, name: f.name, count: f.documents.filter((d) => sees(d.roles)).length })),
    documents: docs.filter((d) => sees(d.roles) || d.uploadedById === ctx.user.id).map((d) => ({ ...d, expired: !!d.expiresOn && d.expiresOn < today, expiringSoon: !!d.expiresOn && d.expiresOn >= today && d.expiresOn <= soon })),
    canManage: manager,
  };
});

export const POST = route({ module: 'documents', action: 'create' }, async (ctx, req) => {
  const input = await body(req, docInput);
  await owned(ctx.db.docFolder, input.folderId, 'Folder');
  const file = await ctx.db.storedFile.findFirst({ where: { id: input.fileId, purpose: 'DOCS' }, select: { fileName: true } });
  if (!file) throw badRequest('Upload the file first.');
  const row = await ctx.db.document.create({
    data: {
      schoolId: ctx.user.schoolId,
      title: input.title,
      description: input.description ?? null,
      folderId: input.folderId || null,
      fileId: input.fileId,
      fileName: file.fileName,
      roles: [...new Set(input.roles)],
      tags: input.tags ?? null,
      expiresOn: input.expiresOn ? new Date(`${input.expiresOn}T00:00:00.000Z`) : null,
      uploadedById: ctx.user.id,
      uploadedByName: ctx.user.name,
    },
  });
  if (input.notify) await notifyRoles(ctx.db, ctx.user.schoolId, input.roles, { title: `New document: ${input.title}`, body: input.description?.slice(0, 140) || 'A document has been shared with you.', link: '/documents' });
  await ctx.audit('CREATE', 'Document', row.id, `${input.title} → ${input.roles.join(', ')}`);
  return row;
});
