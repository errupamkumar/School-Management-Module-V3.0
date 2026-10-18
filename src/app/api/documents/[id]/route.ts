import { z } from 'zod';
import { badRequest, body, forbidden, notFound, owned, route } from '@/server/api';
import { zDate } from '@/server/crud';
import { AUDIENCE_ROLES } from '@/server/services/audience';

/** Edit details or upload a new version (the old file is kept on disk for the record). */
export const PUT = route({ module: 'documents' }, async (ctx, req, { id }) => {
  const d = await ctx.db.document.findUnique({ where: { id } });
  if (!d) throw notFound('Document');
  if (!ctx.can('documents', 'edit') && d.uploadedById !== ctx.user.id) throw forbidden();
  const input = await body(
    req,
    z
      .object({
        title: z.string().trim().min(2).max(150),
        description: z.string().trim().max(2000).nullable(),
        folderId: z.string().nullable(),
        fileId: z.string().min(1),
        roles: z.array(z.enum(AUDIENCE_ROLES)).min(1),
        tags: z.string().trim().max(200).nullable(),
        expiresOn: zDate.nullable(),
      })
      .partial()
  );
  await owned(ctx.db.docFolder, input.folderId, 'Folder');
  const data: Record<string, unknown> = { ...input };
  if (input.expiresOn !== undefined) data.expiresOn = input.expiresOn ? new Date(`${input.expiresOn}T00:00:00.000Z`) : null;
  if (input.roles) data.roles = [...new Set(input.roles)];
  if (input.fileId && input.fileId !== d.fileId) {
    const file = await ctx.db.storedFile.findFirst({ where: { id: input.fileId, purpose: 'DOCS' }, select: { fileName: true } });
    if (!file) throw badRequest('Upload the new file first.');
    data.fileName = file.fileName;
    data.version = d.version + 1;
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update.');
  const row = await ctx.db.document.update({ where: { id }, data });
  await ctx.audit('UPDATE', 'Document', id, data.version ? `${d.title}: new version ${data.version}` : Object.keys(input).join(', '));
  return row;
});

export const DELETE = route({ module: 'documents', action: 'delete' }, async (ctx, _req, { id }) => {
  const d = await ctx.db.document.findUnique({ where: { id } });
  if (!d) throw notFound('Document');
  await ctx.db.document.delete({ where: { id } });
  await ctx.audit('DELETE', 'Document', id, d.title);
  return { deleted: true };
});
