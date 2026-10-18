import { z } from 'zod';
import { MODULE_KEYS } from '@/lib/modules';

export const planSchema = z.object({
  name: z.string().trim().min(2).max(60),
  description: z.string().trim().max(300).optional().nullable(),
  priceMonthly: z.coerce.number().min(0).max(10_000_000),
  pricePerStudent: z.coerce.number().min(0).max(100_000),
  maxStudents: z.coerce.number().int().min(1).max(1_000_000).optional().nullable(),
  maxCampuses: z.coerce.number().int().min(1).max(1000).optional().nullable(),
  // Core modules are always on; storing them is harmless.
  modules: z.array(z.enum(MODULE_KEYS as [string, ...string[]])).min(1),
  isActive: z.boolean().optional(),
  sortOrder: z.coerce.number().int().min(0).max(100).optional(),
});
