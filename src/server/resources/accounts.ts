import { z } from 'zod';
import { conflict, forbidden } from '../api';
import type { CrudConfig } from '../crud';

const headSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  type: z.enum(['INCOME', 'EXPENSE']),
});

export const accountHeadConfig = {
  module: 'accounts',
  model: 'accountHead',
  entity: 'AccountHead',
  schema: headSchema,
  orderBy: [{ type: 'asc' }, { name: 'asc' }],
  search: ['name'],
  filters: ['type'],
  include: { _count: { select: { entries: true } } },
  beforeDelete: async (ctx, id) => {
    const head = await ctx.db.accountHead.findUniqueOrThrow({ where: { id }, include: { _count: { select: { entries: true } } } });
    if (head.isSystem) throw forbidden('System heads (fees, salaries, store) cannot be deleted.');
    if (head._count.entries) throw conflict('This head has entries. Move or delete them first.');
  },
} satisfies CrudConfig<typeof headSchema.shape>;
