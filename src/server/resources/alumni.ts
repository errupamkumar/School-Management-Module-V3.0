import { z } from 'zod';
import type { CrudConfig } from '../crud';

const opt = (max: number) => z.string().trim().max(max).optional().nullable().or(z.literal('').transform(() => null));

export const alumnusSchema = z.object({
  name: z.string().trim().min(2).max(100),
  passingYear: z.coerce.number().int().min(1950).max(new Date().getFullYear() + 1),
  lastClass: opt(40),
  email: z.string().trim().toLowerCase().email().max(120).optional().nullable().or(z.literal('').transform(() => null)),
  phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a 10-digit mobile number').optional().nullable().or(z.literal('').transform(() => null)),
  currentStatus: z.enum(['STUDYING', 'EMPLOYED', 'SELF_EMPLOYED', 'OTHER']).optional().nullable().or(z.literal('').transform(() => null)),
  organisation: opt(120),
  designation: opt(80),
  higherEducation: opt(160),
  city: opt(60),
  linkedinUrl: z.string().trim().url().max(200).refine((u) => u.startsWith('https://'), 'Use an https:// link').optional().nullable().or(z.literal('').transform(() => null)),
  achievements: opt(2000),
  consentToContact: z.boolean().default(true),
  isMentor: z.boolean().default(false),
  status: z.enum(['PENDING', 'APPROVED']).default('APPROVED'),
});

export const alumniConfig = {
  module: 'alumni',
  model: 'alumnus',
  entity: 'Alumnus',
  schema: alumnusSchema,
  staffOnly: true,
  search: ['name', 'organisation', 'city', 'higherEducation', 'email', 'phone'],
  filters: ['status', 'currentStatus', 'isMentor'],
  orderBy: [{ passingYear: 'desc' }, { name: 'asc' }],
} satisfies CrudConfig<typeof alumnusSchema.shape>;
