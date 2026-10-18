import { z } from 'zod';
import { badRequest } from '../api';
import type { CrudConfig } from '../crud';

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

const periodSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(30),
  startTime: time,
  endTime: time,
  sortOrder: z.coerce.number().int().min(0).max(50),
  isBreak: z.boolean().default(false),
});

export const periodConfig = {
  module: 'timetable',
  model: 'period',
  entity: 'Period',
  schema: periodSchema,
  orderBy: { sortOrder: 'asc' },
  map: (i) => {
    if (i.startTime && i.endTime && i.endTime <= i.startTime) throw badRequest('End time must be after start time.');
    return i;
  },
} satisfies CrudConfig<typeof periodSchema.shape>;

const roomSchema = z.object({ name: z.string().trim().min(1).max(40), capacity: z.coerce.number().int().min(1).max(1000).optional().nullable() });

export const roomConfig = {
  module: 'timetable',
  model: 'room',
  entity: 'Room',
  schema: roomSchema,
  orderBy: { name: 'asc' },
  search: ['name'],
} satisfies CrudConfig<typeof roomSchema.shape>;
