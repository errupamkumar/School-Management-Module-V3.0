import { badRequest, notFound, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { enabledModules } from '@/server/permissions';
import { readSettings } from '@/server/settings';
import { alumnusSchema } from '@/server/resources/alumni';

async function school(code: string) {
  const s = await prisma.school.findUnique({ where: { code: code.toUpperCase().slice(0, 32) }, select: { id: true, name: true, logoUrl: true, tagline: true, city: true, state: true, status: true, settings: true } });
  if (!s || s.status === 'SUSPENDED' || s.status === 'CANCELLED') throw notFound('School');
  if (!readSettings(s.settings).alumni.selfRegistration || !(await enabledModules(s.id)).has('alumni')) throw notFound('Alumni registration');
  return s;
}

export const GET = publicRoute({ name: 'alumni-info', limit: 120, windowSec: 3600 }, async (_req, { code }) => {
  const { name, logoUrl, tagline, city, state } = await school(code);
  return { name, logoUrl, tagline, city, state };
});

/** Former students register themselves; the school approves before they appear in the directory. */
export const POST = publicRoute({ name: 'alumni-register', limit: 10, windowSec: 3600 }, async (req, { code }) => {
  const s = await school(code);
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const input = alumnusSchema.omit({ status: true, isMentor: true }).extend({ isMentor: alumnusSchema.shape.isMentor }).parse(raw);
  if (!input.email && !input.phone) throw badRequest('Give an email or a mobile number so the school can reach you.');
  const dup = await prisma.alumnus.count({ where: { schoolId: s.id, name: input.name, passingYear: input.passingYear, OR: [{ email: input.email ?? '__none__' }, { phone: input.phone ?? '__none__' }] } });
  if (dup) return { received: true };
  await prisma.alumnus.create({ data: { ...input, schoolId: s.id, status: 'PENDING' } });
  return { received: true };
});
