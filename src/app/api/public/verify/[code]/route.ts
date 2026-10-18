import { notFound, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';

/** Public certificate verification (target of the QR code on every certificate). */
export const GET = publicRoute({ name: 'verify', limit: 60, windowSec: 600 }, async (_req, { code }) => {
  if (!/^[\w-]{8,24}$/.test(code)) throw notFound('Certificate');
  const c = await prisma.issuedCertificate.findUnique({
    where: { verifyCode: code },
    select: { serialNo: true, recipientName: true, issuedOn: true, revokedAt: true, schoolId: true, template: { select: { name: true } } },
  });
  if (!c) throw notFound('Certificate');
  const school = await prisma.school.findUnique({ where: { id: c.schoolId }, select: { name: true, city: true, state: true, logoUrl: true } });
  return { valid: !c.revokedAt, revoked: !!c.revokedAt, serialNo: c.serialNo, certificate: c.template.name, recipientName: c.recipientName, issuedOn: c.issuedOn, school };
});
