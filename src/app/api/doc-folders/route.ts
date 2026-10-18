import { z } from 'zod';
import { crudCollection } from '@/server/crud';

export const { GET, POST } = crudCollection({
  module: 'documents',
  model: 'docFolder',
  entity: 'DocFolder',
  schema: z.object({ name: z.string().trim().min(2).max(60) }),
  orderBy: { name: 'asc' },
});
