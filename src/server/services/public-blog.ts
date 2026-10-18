import { notFound } from '../api';
import { prisma } from '../db';
import { enabledModules } from '../permissions';
import { readSettings } from '../settings';

/** The school behind a public news page, if it has turned the page on. */
export async function publicBlogSchool(code: string) {
  const school = await prisma.school.findUnique({
    where: { code: code.toUpperCase().slice(0, 32) },
    select: { id: true, code: true, name: true, logoUrl: true, tagline: true, city: true, state: true, themeColor: true, status: true, website: true, settings: true },
  });
  if (!school || school.status === 'SUSPENDED' || school.status === 'CANCELLED') throw notFound('School');
  if (!readSettings(school.settings).blog.publicPage || !(await enabledModules(school.id)).has('blog')) throw notFound('News page');
  const { settings: _s, status: _st, ...pub } = school;
  return pub;
}

/** Published posts the school chose to show publicly. */
export const PUBLIC_POST = { status: 'PUBLISHED', isPublic: true } as const;
