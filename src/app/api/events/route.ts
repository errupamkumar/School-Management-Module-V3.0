import { z } from 'zod';
import { query, route } from '@/server/api';
import { crudCollection } from '@/server/crud';
import { eventConfig } from '@/server/resources/comms';

const { POST: create } = crudCollection(eventConfig);
export const POST = create;

/** Events overlapping a date range (calendar month view). */
export const GET = route({ module: 'events' }, async (ctx, req) => {
  const q = query(req, z.object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }));
  const from = q.from ? new Date(`${q.from}T00:00:00Z`) : new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  const to = q.to ? new Date(`${q.to}T00:00:00Z`) : new Date(Date.UTC(new Date().getUTCFullYear() + 1, 11, 31));
  return ctx.db.event.findMany({
    where: { startDate: { lte: to }, OR: [{ endDate: { gte: from } }, { endDate: null, startDate: { gte: from } }] },
    orderBy: { startDate: 'asc' },
  });
});
