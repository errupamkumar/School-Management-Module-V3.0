import { badRequest, publicRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { leadSchema } from '@/website/lead-schema';
import { FEATURE_MAP } from '@/website/content/features';

/** "Start free trial / Book a demo" from the public website. Stored for the platform operator. */
export const POST = publicRoute({ name: 'website-lead', limit: 8, windowSec: 3600 }, async (req, _params, ip) => {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON.');
  }
  const { website, consent: _consent, features, ...input } = leadSchema.parse(raw);
  // Bots fill the hidden field; answer as if accepted so they learn nothing.
  if (website) return { received: true };

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const dup = await prisma.websiteLead.count({ where: { email: input.email, schoolName: input.schoolName, createdAt: { gte: since } } });
  if (dup) return { received: true };

  await prisma.websiteLead.create({
    data: { ...input, features: features.filter((f) => f in FEATURE_MAP), ip },
  });
  return { received: true };
});
