import { z } from 'zod';
import { badRequest } from '../api';
import type { CrudConfig } from '../crud';

const questionSchema = z.object({
  classId: z.string().min(1, 'Class is required'),
  subjectId: z.string().min(1, 'Subject is required'),
  chapterId: z.string().optional().nullable().or(z.literal('').transform(() => null)),
  type: z.enum(['MCQ', 'SHORT', 'LONG', 'TRUE_FALSE', 'FILL_BLANK']),
  text: z.string().trim().min(3, 'Question text is required').max(4000),
  options: z.array(z.string().trim().max(300)).max(6).optional().nullable(),
  answer: z.string().trim().max(4000).optional().nullable(),
  marks: z.coerce.number().min(0.5).max(100),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
});

export const questionConfig = {
  module: 'question_bank',
  model: 'question',
  entity: 'Question',
  schema: questionSchema,
  refs: { classId: 'class', subjectId: 'subject', chapterId: 'chapter' },
  filters: ['classId', 'subjectId', 'chapterId', 'type', 'difficulty'],
  search: ['text'],
  orderBy: [{ createdAt: 'desc' }],
  map: (i, ctx) => {
    if (i.type === 'MCQ' && (!i.options || i.options.filter(Boolean).length < 2)) throw badRequest('MCQs need at least two options.');
    return { ...i, options: i.type === 'MCQ' ? i.options?.filter(Boolean) : undefined, createdById: ctx.user.id };
  },
} satisfies CrudConfig<typeof questionSchema.shape>;
