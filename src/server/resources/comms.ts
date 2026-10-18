import { z } from 'zod';
import { badRequest } from '../api';
import { toDate, zDate, type CrudConfig } from '../crud';

const templateSchema = z.object({
  name: z.string().trim().min(2).max(60),
  channel: z.enum(['SMS', 'WHATSAPP', 'EMAIL']),
  body: z.string().trim().min(3).max(1000),
  dltTemplateId: z.string().trim().regex(/^\d{10,25}$/, 'DLT template ID is a 10–25 digit number').optional().nullable().or(z.literal('').transform(() => null)),
});

export const templateConfig = {
  module: 'sms',
  model: 'messageTemplate',
  entity: 'MessageTemplate',
  schema: templateSchema,
  orderBy: [{ channel: 'asc' }, { name: 'asc' }],
  filters: ['channel'],
  search: ['name', 'body'],
} satisfies CrudConfig<typeof templateSchema.shape>;

const eventSchema = z.object({
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().nullable(),
  kind: z.enum(['EVENT', 'HOLIDAY', 'PTM', 'EXAM', 'ACTIVITY']),
  startDate: zDate,
  endDate: zDate.optional().nullable().or(z.literal('').transform(() => null)),
  location: z.string().trim().max(120).optional().nullable(),
});

export const eventConfig = {
  module: 'events',
  model: 'event',
  entity: 'Event',
  schema: eventSchema,
  orderBy: { startDate: 'asc' },
  filters: ['kind'],
  map: (i, ctx) => {
    if (i.endDate && i.startDate && i.endDate < i.startDate) throw badRequest('End date is before start date.');
    return { ...i, startDate: toDate(i.startDate), endDate: i.endDate === undefined ? undefined : toDate(i.endDate) ?? null, createdById: ctx.user.id };
  },
} satisfies CrudConfig<typeof eventSchema.shape>;
