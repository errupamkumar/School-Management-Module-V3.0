import { notFound, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { enabledModules } from '@/server/permissions';
import { classLabel } from '@/server/common';

/** Public info for the online admission form. Exposes nothing beyond what a school brochure would. */
export const GET = publicRoute({ name: 'school-info', limit: 120, windowSec: 3600 }, async (_req, { code }) => {
  const school = await prisma.school.findUnique({
    where: { code: code.toUpperCase() },
    select: { id: true, name: true, logoUrl: true, tagline: true, city: true, state: true, board: true, themeColor: true, status: true, phone: true, email: true },
  });
  if (!school || school.status === 'SUSPENDED' || school.status === 'CANCELLED') throw notFound('School');
  if (!(await enabledModules(school.id)).has('admissions')) throw notFound('Online admissions');
  const classes = await prisma.class.findMany({ where: { schoolId: school.id, isActive: true }, orderBy: { numericOrder: 'asc' }, select: { id: true, name: true } });
  const { id: _id, status: _s, ...pub } = school;
  return { ...pub, classes: classes.map((c) => ({ id: c.id, label: classLabel(c) })) };
});
