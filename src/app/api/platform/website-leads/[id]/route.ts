import { body, notFound, platformRoute } from '@/server/api';
import { prisma } from '@/server/db';
import { leadUpdateSchema } from '@/website/lead-schema';

export const PATCH = platformRoute(async (ctx, req, { id }) => {
  const input = await body(req, leadUpdateSchema);
  const lead = await prisma.websiteLead.findUnique({ where: { id }, select: { id: true, schoolName: true } });
  if (!lead) throw notFound('Lead');
  const updated = await prisma.websiteLead.update({ where: { id }, data: input });
  await ctx.audit('UPDATE', 'WebsiteLead', id, `${lead.schoolName}${input.status ? ` → ${input.status}` : ''}`);
  return updated;
});
