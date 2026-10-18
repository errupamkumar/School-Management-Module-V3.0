import { z } from 'zod';
import { body, route } from '@/server/api';
import { catalog, runReport } from '@/server/services/report-builder';

const filters = z.object({
  classId: z.string().max(40).optional(),
  sectionId: z.string().max(40).optional(),
  status: z.string().max(20).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().trim().max(60).optional(),
});

/** Data sources and columns this user may build reports from. */
export const GET = route({ module: 'reports' }, async (ctx) => catalog(ctx));

/** Run a custom report (up to 5000 rows; export from the screen). */
export const POST = route({ module: 'reports' }, async (ctx, req) => {
  const input = await body(req, z.object({ entity: z.string().max(30), columns: z.array(z.string().max(40)).max(40).default([]), filters: filters.default({}) }));
  const clean = Object.fromEntries(Object.entries(input.filters).filter(([, v]) => v !== undefined && v !== ''));
  return runReport(ctx, input.entity, input.columns, clean);
});
