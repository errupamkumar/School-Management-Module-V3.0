import { z } from 'zod';
import { conflict } from '../api';
import type { CrudConfig } from '../crud';

const feeHeadSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  kind: z.enum(['RECURRING', 'ONE_TIME']).default('RECURRING'),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: z.boolean().default(true),
});

export const feeHeadConfig = {
  module: 'fees',
  model: 'feeHead',
  entity: 'FeeHead',
  schema: feeHeadSchema,
  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  search: ['name'],
  include: { _count: { select: { structures: true } } },
  beforeDelete: async (ctx, id) => {
    const used = await ctx.db.feeInvoiceItem.count({ where: { feeHeadId: id } });
    if (used) throw conflict('This fee head is used on invoices. Deactivate it instead of deleting.');
  },
} satisfies CrudConfig<typeof feeHeadSchema.shape>;
