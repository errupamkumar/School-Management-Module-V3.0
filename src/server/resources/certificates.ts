import { z } from 'zod';
import { conflict } from '../api';
import type { CrudConfig } from '../crud';
import { sanitizeHtml } from '../services/html';

const templateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['TRANSFER', 'CHARACTER', 'BONAFIDE', 'MERIT', 'EXPERIENCE', 'CUSTOM']),
  recipientType: z.enum(['STUDENT', 'EMPLOYEE']),
  body: z.string().trim().min(10).max(20_000),
});

export const certificateTemplateConfig = {
  module: 'certificates',
  model: 'certificateTemplate',
  entity: 'CertificateTemplate',
  schema: templateSchema,
  orderBy: { name: 'asc' },
  filters: ['recipientType', 'kind'],
  staffOnly: true,
  map: (i) => ({ ...i, body: sanitizeHtml(i.body) }),
  mapUpdate: (i) => ({ ...i, ...(i.body !== undefined ? { body: sanitizeHtml(i.body) } : {}) }),
  beforeDelete: async (ctx, id) => {
    const n = await ctx.db.issuedCertificate.count({ where: { templateId: id } });
    if (n) throw conflict(`${n} certificates were issued from this template. Keep it for the record, or edit it instead.`);
  },
} satisfies CrudConfig<typeof templateSchema.shape>;
