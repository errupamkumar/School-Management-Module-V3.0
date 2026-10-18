import { z } from 'zod';
import { badRequest, body, query, route } from '@/server/api';
import { displayName } from '@/server/common';
import { assertSectionAccess } from '@/server/scope';

/** Ratings grid for a section: students × traits (1–5) for a term and category. */
export const GET = route({ module: 'behaviour' }, async (ctx, req) => {
  const q = query(req, z.object({ sectionId: z.string().min(1), term: z.string().max(20).default('TERM_1'), category: z.enum(['BEHAVIOUR', 'SKILL']).default('BEHAVIOUR') }));
  await assertSectionAccess(ctx, q.sectionId);
  const traits = q.category === 'BEHAVIOUR' ? ctx.school.settings.behaviourTraits : ctx.school.settings.skillTraits;
  const students = await ctx.db.student.findMany({ where: { sectionId: q.sectionId, status: 'ACTIVE' }, select: { id: true, firstName: true, lastName: true, rollNo: true } });
  const ratings = await ctx.db.behaviourRating.findMany({ where: { studentId: { in: students.map((s) => s.id) }, term: q.term, category: q.category } });
  students.sort((a, b) => (Number(a.rollNo) || 9999) - (Number(b.rollNo) || 9999) || a.firstName.localeCompare(b.firstName));
  return {
    traits,
    rows: students.map((s) => ({ studentId: s.id, name: displayName(s), rollNo: s.rollNo, ratings: Object.fromEntries(ratings.filter((r) => r.studentId === s.id).map((r) => [r.trait, r.rating])) })),
  };
});

export const PUT = route({ module: 'behaviour', action: 'create' }, async (ctx, req) => {
  const input = await body(
    req,
    z.object({
      sectionId: z.string().min(1),
      term: z.string().max(20),
      category: z.enum(['BEHAVIOUR', 'SKILL']),
      ratings: z.array(z.object({ studentId: z.string(), trait: z.string().max(40), rating: z.number().int().min(1).max(5) })).max(2000),
    })
  );
  await assertSectionAccess(ctx, input.sectionId);
  const traits = input.category === 'BEHAVIOUR' ? ctx.school.settings.behaviourTraits : ctx.school.settings.skillTraits;
  if (input.ratings.some((r) => !traits.includes(r.trait))) throw badRequest('Unknown trait.');
  const valid = await ctx.db.student.count({ where: { id: { in: [...new Set(input.ratings.map((r) => r.studentId))] }, sectionId: input.sectionId } });
  if (valid !== new Set(input.ratings.map((r) => r.studentId)).size) throw badRequest('Student not in section.');
  await ctx.db.$transaction(
    input.ratings.map((r) =>
      ctx.db.behaviourRating.upsert({
        where: { studentId_term_category_trait: { studentId: r.studentId, term: input.term, category: input.category, trait: r.trait } },
        update: { rating: r.rating, ratedById: ctx.user.id },
        create: { schoolId: ctx.user.schoolId, studentId: r.studentId, term: input.term, category: input.category, trait: r.trait, rating: r.rating, ratedById: ctx.user.id },
      })
    )
  );
  await ctx.audit('UPDATE', 'BehaviourRating', input.sectionId, `${input.ratings.length} ratings (${input.category}, ${input.term})`);
  return { saved: input.ratings.length };
});
