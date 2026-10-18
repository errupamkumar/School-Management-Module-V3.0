import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { badRequest, body, forbidden, owned, query, route } from '@/server/api';
import { classLabel } from '@/server/common';
import { ownClassSectionPairs } from '@/server/scope';

export const GET = route({ module: 'lms' }, async (ctx, req) => {
  const q = query(req, z.object({ classId: z.string().optional(), subjectId: z.string().optional(), search: z.string().max(100).optional(), studentId: z.string().optional() }));
  const and: Prisma.StudyMaterialWhereInput[] = [];
  if (ctx.user.role === 'PARENT' || ctx.user.role === 'STUDENT') {
    const pairs = await ownClassSectionPairs(ctx);
    const p = q.studentId ? pairs.find((x) => x.studentId === q.studentId) : pairs[0];
    if (!p) throw forbidden();
    and.push({ classId: p.classId });
  } else if (q.classId) and.push({ classId: q.classId });
  if (q.subjectId) and.push({ subjectId: q.subjectId });
  if (q.search) and.push({ OR: [{ title: { contains: q.search } }, { description: { contains: q.search } }] });
  const rows = await ctx.db.studyMaterial.findMany({ where: { AND: and }, orderBy: { createdAt: 'desc' }, take: 300 });
  const [subjects, classes, files] = await Promise.all([
    ctx.db.subject.findMany({ select: { id: true, name: true } }),
    ctx.db.class.findMany({ select: { id: true, name: true } }),
    ctx.db.storedFile.findMany({ where: { id: { in: rows.map((r) => r.fileId).filter(Boolean) as string[] } }, select: { id: true, fileName: true, mimeType: true, size: true } }),
  ]);
  return rows.map((r) => ({ ...r, subject: subjects.find((s) => s.id === r.subjectId)?.name ?? '', classLabel: classLabel(classes.find((c) => c.id === r.classId) ?? { name: '' }), file: files.find((f) => f.id === r.fileId) ?? null }));
});

export const POST = route({ module: 'lms', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      classId: z.string().min(1),
      subjectId: z.string().min(1),
      title: z.string().trim().min(2).max(150),
      description: z.string().trim().max(2000).optional().nullable(),
      kind: z.enum(['DOCUMENT', 'VIDEO', 'LINK']),
      fileId: z.string().optional().nullable(),
      url: z.url('Enter a valid link').optional().nullable().or(z.literal('').transform(() => null)),
    })
  );
  if (input.kind === 'DOCUMENT' && !input.fileId) throw badRequest('Attach a file.');
  if (input.kind !== 'DOCUMENT' && !input.url) throw badRequest('Add a link (e.g. YouTube or Google Drive).');
  if (input.url && !/^https:\/\//i.test(input.url)) throw badRequest('Links must start with https://');
  await owned(ctx.db.class, input.classId, 'Class');
  await owned(ctx.db.subject, input.subjectId, 'Subject');
  await owned(ctx.db.storedFile, input.fileId, 'File');
  const row = await ctx.db.studyMaterial.create({ data: { schoolId: ctx.user.schoolId, ...input, description: input.description ?? null, fileId: input.fileId ?? null, url: input.url ?? null, createdById: ctx.user.id } });
  await ctx.audit('CREATE', 'StudyMaterial', row.id, input.title);
  return row;
});
