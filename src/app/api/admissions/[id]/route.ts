import { z } from 'zod';
import { badRequest, body, conflict, route } from '@/server/api';

export const PATCH = route({ module: 'admissions', action: 'edit' }, async (ctx, req, { id }) => {
  const input = await body(
    req,
    z.object({
      stage: z.enum(['ENQUIRY', 'APPLIED', 'DOCS_VERIFIED', 'TEST_SCHEDULED', 'SEAT_OFFERED', 'REJECTED', 'WITHDRAWN']).optional(),
      notes: z.string().trim().max(2000).optional().nullable(),
      followUpAt: z.string().optional().nullable(),
    })
  );
  const app = await ctx.db.admissionApplication.findUniqueOrThrow({ where: { id } });
  if (app.stage === 'ADMITTED') throw conflict('This applicant has already been admitted.');
  if (input.stage === undefined && input.notes === undefined && input.followUpAt === undefined) throw badRequest('Nothing to update.');
  const updated = await ctx.db.admissionApplication.update({
    where: { id },
    data: {
      ...(input.stage ? { stage: input.stage } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.followUpAt !== undefined ? { followUpAt: input.followUpAt ? new Date(input.followUpAt) : null } : {}),
    },
  });
  await ctx.audit('UPDATE', 'AdmissionApplication', id, `${app.applicationNo}: ${JSON.stringify(input)}`);
  return updated;
});
