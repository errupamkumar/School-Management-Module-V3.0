import { z } from 'zod';
import { body, conflict, route } from '@/server/api';

export const GET = route({ module: 'certificates' }, async (ctx, _req, { id }) => {
  const c = await ctx.db.issuedCertificate.findUniqueOrThrow({ where: { id }, include: { template: { select: { name: true, kind: true } } } });
  const school = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { name: true, logoUrl: true, address: true, city: true, state: true, pincode: true, phone: true, email: true, affiliationNo: true, board: true } });
  const photo =
    c.recipientType === 'STUDENT'
      ? (await ctx.db.student.findUnique({ where: { id: c.recipientId }, select: { photoUrl: true } }))?.photoUrl
      : (await ctx.db.employee.findUnique({ where: { id: c.recipientId }, select: { photoUrl: true } }))?.photoUrl;
  return { ...c, school, photoUrl: photo ?? null };
});

/** Revoke (e.g. issued in error). The public verification page will show it as revoked. */
export const POST = route({ module: 'certificates', action: 'delete' }, async (ctx, req, { id }) => {
  const input = await body(req, z.object({ reason: z.string().trim().min(3).max(200) }));
  const c = await ctx.db.issuedCertificate.findUniqueOrThrow({ where: { id } });
  if (c.revokedAt) throw conflict('Already revoked.');
  await ctx.db.issuedCertificate.update({ where: { id }, data: { revokedAt: new Date() } });
  await ctx.audit('REVOKE', 'IssuedCertificate', id, `${c.serialNo}: ${input.reason}`);
  return { revoked: true };
});
