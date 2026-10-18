import { z } from 'zod';
import { conflict, forbidden } from '../api';
import type { CrudConfig } from '../crud';

const campusSchema = z.object({
  name: z.string().trim().min(2).max(80),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,12}$/, '2–12 letters, digits or dashes'),
  address: z.string().trim().max(300).optional().nullable(),
  city: z.string().trim().max(60).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email().max(120).optional().nullable().or(z.literal('').transform(() => null)),
  isMain: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const campusConfig = {
  module: 'settings',
  model: 'campus',
  entity: 'Campus',
  schema: campusSchema,
  orderBy: [{ isMain: 'desc' }, { name: 'asc' }],
  include: { _count: { select: { students: true, employees: true, classes: true } } },
  staffOnly: true,
  map: async (i, ctx) => {
    const s = await ctx.db.school.findUniqueOrThrow({ where: { id: ctx.user.schoolId }, select: { plan: { select: { name: true, maxCampuses: true } } } });
    const max = s.plan?.maxCampuses;
    if (max != null && (await ctx.db.campus.count()) >= max) throw forbidden(`Your ${s.plan!.name} plan allows ${max} campus${max === 1 ? '' : 'es'}. Upgrade to add more.`);
    return i;
  },
  mapUpdate: async (i, ctx, id) => {
    if (i.isMain === false || i.isActive === false) {
      const c = await ctx.db.campus.findUniqueOrThrow({ where: { id }, select: { isMain: true } });
      if (c.isMain) throw conflict('Make another campus the main campus first.');
    }
    return i;
  },
  afterWrite: async (ctx, id) => {
    const c = await ctx.db.campus.findUniqueOrThrow({ where: { id }, select: { isMain: true } });
    if (c.isMain) await ctx.db.campus.updateMany({ where: { id: { not: id }, isMain: true }, data: { isMain: false } });
  },
  beforeDelete: async (ctx, id) => {
    const c = await ctx.db.campus.findUniqueOrThrow({ where: { id }, select: { isMain: true, _count: { select: { students: true, employees: true, classes: true, users: true } } } });
    if (c.isMain) throw conflict('The main campus cannot be deleted.');
    const n = c._count;
    if (n.students || n.employees || n.classes || n.users) throw conflict(`In use by ${n.classes} classes, ${n.students} students and ${n.employees} staff. Deactivate it instead.`);
  },
} satisfies CrudConfig<typeof campusSchema.shape>;
