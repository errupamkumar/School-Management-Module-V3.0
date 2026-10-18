import { z } from 'zod';
import { conflict } from '@/server/api';
import { crudItem } from '@/server/crud';

export const { GET, PUT, DELETE } = crudItem({
  module: 'documents',
  model: 'docFolder',
  entity: 'DocFolder',
  schema: z.object({ name: z.string().trim().min(2).max(60) }),
  beforeDelete: async (ctx, id) => {
    const n = await ctx.db.document.count({ where: { folderId: id } });
    if (n) throw conflict(`Move or delete the ${n} documents in this folder first.`);
  },
});
