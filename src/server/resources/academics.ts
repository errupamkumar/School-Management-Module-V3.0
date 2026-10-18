import { z } from 'zod';
import { conflict } from '../api';
import { toDate, zDate, type CrudConfig } from '../crud';

const academicYearSchema = z.object({
  name: z.string().trim().regex(/^\d{4}-\d{2}$/, 'Use the format 2026-27'),
  startDate: zDate,
  endDate: zDate,
});

export const academicYearConfig = {
  module: 'academics',
  model: 'academicYear',
  entity: 'AcademicYear',
  schema: academicYearSchema,
  orderBy: { startDate: 'desc' },
  map: (i) => ({ ...i, startDate: toDate(i.startDate), endDate: toDate(i.endDate) }),
  beforeDelete: async (ctx, id) => {
    const y = await ctx.db.academicYear.findUnique({ where: { id } });
    if (y?.isCurrent) throw conflict('The current academic year cannot be deleted. Make another year current first.');
  },
} satisfies CrudConfig<typeof academicYearSchema.shape>;

export const subjectConfig = {
  module: 'academics',
  model: 'subject',
  entity: 'Subject',
  schema: z.object({
    name: z.string().trim().min(1, 'Name is required').max(80),
    code: z.string().trim().toUpperCase().min(1, 'Code is required').max(12).regex(/^[A-Z0-9-]+$/, 'Letters, numbers and dashes only'),
    type: z.enum(['THEORY', 'PRACTICAL', 'BOTH']).default('THEORY'),
    isOptional: z.boolean().default(false),
  }),
  orderBy: { name: 'asc' },
  search: ['name', 'code'],
  listAccess: [{ module: 'exams' }, { module: 'timetable' }, { module: 'homework' }],
  include: { _count: { select: { classes: true } } },
  beforeDelete: async (ctx, id) => {
    const used = await ctx.db.examMark.count({ where: { subjectId: id } });
    if (used) throw conflict('This subject has exam marks recorded and cannot be deleted.');
  },
} satisfies CrudConfig<z.ZodRawShape>;

export const chapterConfig = {
  module: 'academics',
  model: 'chapter',
  entity: 'Chapter',
  schema: z.object({
    classId: z.string().min(1, 'Class is required'),
    subjectId: z.string().min(1, 'Subject is required'),
    name: z.string().trim().min(1, 'Name is required').max(160),
    sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  }),
  refs: { classId: 'class', subjectId: 'subject' },
  filters: ['classId', 'subjectId'],
  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  listAccess: [{ module: 'question_bank' }],
} satisfies CrudConfig<z.ZodRawShape>;
