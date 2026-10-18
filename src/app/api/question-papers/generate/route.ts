import crypto from 'node:crypto';
import { z } from 'zod';
import { body, route } from '@/server/api';

/**
 * Picks random questions matching a blueprint (type × count, optional chapters
 * and difficulty) and returns proposed sections. Nothing is saved until the
 * teacher reviews and saves the paper.
 */
export const POST = route({ module: 'question_bank', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      classId: z.string().min(1),
      subjectId: z.string().min(1),
      chapterIds: z.array(z.string()).max(50).optional(),
      difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'MIXED']).default('MIXED'),
      blueprint: z.array(z.object({ type: z.enum(['MCQ', 'SHORT', 'LONG', 'TRUE_FALSE', 'FILL_BLANK']), count: z.coerce.number().int().min(1).max(50), title: z.string().max(80).optional() })).min(1).max(8),
    })
  );
  const pool = await ctx.db.question.findMany({
    where: {
      classId: input.classId,
      subjectId: input.subjectId,
      ...(input.chapterIds?.length ? { chapterId: { in: input.chapterIds } } : {}),
      ...(input.difficulty !== 'MIXED' ? { difficulty: input.difficulty } : {}),
    },
  });
  const labels: Record<string, string> = { MCQ: 'Multiple choice questions', SHORT: 'Short answer questions', LONG: 'Long answer questions', TRUE_FALSE: 'True or false', FILL_BLANK: 'Fill in the blanks' };
  const shortfalls: string[] = [];
  const sections = input.blueprint.map((b, i) => {
    const candidates = pool.filter((q) => q.type === b.type);
    // Fisher–Yates with a CSPRNG so papers can't be predicted from the seed.
    for (let j = candidates.length - 1; j > 0; j--) {
      const k = crypto.randomInt(j + 1);
      [candidates[j], candidates[k]] = [candidates[k], candidates[j]];
    }
    const picked = candidates.slice(0, b.count);
    if (picked.length < b.count) shortfalls.push(`${labels[b.type]}: only ${picked.length} of ${b.count} available`);
    return { title: b.title || `Section ${String.fromCharCode(65 + i)} — ${labels[b.type]}`, questionIds: picked.map((q) => q.id), marks: picked.reduce((a, q) => a + Number(q.marks), 0) };
  });
  return { sections: sections.filter((s) => s.questionIds.length), totalMarks: sections.reduce((a, s) => a + s.marks, 0), shortfalls };
});
