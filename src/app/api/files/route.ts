import { badRequest, HttpError, route } from '@/server/api';
import { env } from '@/server/env';
import { rateLimit } from '@/server/rate-limit';
import { safeName, sniff, storeBuffer } from '@/server/services/files';

const PURPOSES = new Set(['HOMEWORK', 'SUBMISSION', 'LMS', 'DOCUMENT', 'NOTICE', 'LOGO', 'GALLERY', 'BLOG', 'DOCS']);
/** Module right needed to upload for these purposes. */
const NEEDS: Record<string, Parameters<import('@/server/api').Ctx['can']>> = { GALLERY: ['gallery', 'create'], BLOG: ['blog', 'create'], DOCS: ['documents', 'create'] };

/** Multipart upload: fields `file` and `purpose`. Returns the stored file id. */
export const POST = route({ authenticated: true }, async (ctx, req) => {
  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest('Send the file as multipart/form-data.');
  const file = form.get('file');
  const purpose = String(form.get('purpose') ?? '');
  // Event albums are uploaded in bulk, so gallery photos have their own, larger allowance.
  const rl = purpose === 'GALLERY' ? await rateLimit(`upload-gallery:${ctx.user.id}`, 600, 60 * 60) : await rateLimit(`upload:${ctx.user.id}`, 60, 60 * 60);
  if (!rl.ok) throw new HttpError(429, 'Upload limit reached. Try again later.', 'RATE_LIMITED');
  if (!(file instanceof File)) throw badRequest('No file received.');
  if (!PURPOSES.has(purpose)) throw badRequest('Unknown upload purpose.');
  if (file.size === 0) throw badRequest('The file is empty.');
  if (file.size > env.maxUploadBytes()) throw badRequest(`File is larger than ${Math.round(env.maxUploadBytes() / 1024 / 1024)} MB.`);
  // Only staff upload teaching material and notices; students may upload homework submissions.
  if (['HOMEWORK', 'LMS', 'NOTICE', 'LOGO', 'DOCUMENT', 'GALLERY', 'DOCS'].includes(purpose) && (ctx.user.role === 'STUDENT' || ctx.user.role === 'PARENT')) throw badRequest('Not allowed.');
  if (NEEDS[purpose] && !ctx.can(...NEEDS[purpose])) throw badRequest('Not allowed.');

  const buf = Buffer.from(await file.arrayBuffer());
  const { mime, ext } = sniff(buf, file.name);
  if ((purpose === 'GALLERY' || purpose === 'BLOG') && !mime.startsWith('image/')) throw badRequest('Choose a JPG, PNG or WebP image.');
  const rel = await storeBuffer(ctx.user.schoolId, buf, ext);
  const row = await ctx.db.storedFile.create({
    data: { schoolId: ctx.user.schoolId, uploadedBy: ctx.user.id, purpose, fileName: safeName(file.name), mimeType: mime, size: buf.length, path: rel },
  });
  await ctx.audit('UPLOAD', 'StoredFile', row.id, `${purpose}: ${row.fileName} (${Math.round(buf.length / 1024)} KB)`);
  return { id: row.id, fileName: row.fileName, mimeType: mime, size: row.size };
});
