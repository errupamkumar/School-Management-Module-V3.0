import { z } from 'zod';
import { body, forbidden, query, route } from '@/server/api';
import { assertStudentAccess } from '@/server/scope';

const DAY = 86_400_000;
const ist = (d: Date) => new Date(d.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10); // calendar day in India

/** Focus-timer log and stats. Students see their own; parents/teachers pass ?studentId. */
export const GET = route({ module: 'study_tools' }, async (ctx, req) => {
  const q = query(req, z.object({ studentId: z.string().optional() }));
  let userId: string | null;
  if (ctx.user.role === 'STUDENT') userId = ctx.user.id;
  else {
    if (!q.studentId) throw forbidden('Choose a student.');
    await assertStudentAccess(ctx, q.studentId);
    userId = (await ctx.db.student.findUniqueOrThrow({ where: { id: q.studentId }, select: { userId: true } })).userId;
  }
  if (!userId) return { totalMinutes: 0, week: [], bySubject: [], streak: 0, recent: [] };
  const since = new Date(Date.now() - 30 * DAY);
  const rows = await ctx.db.studySession.findMany({ where: { userId, completedAt: { gte: since } }, orderBy: { completedAt: 'desc' } });
  const perDay = new Map<string, number>();
  for (const r of rows) perDay.set(ist(r.completedAt), (perDay.get(ist(r.completedAt)) ?? 0) + r.minutes);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = ist(new Date(Date.now() - (6 - i) * DAY));
    return { day: d, minutes: perDay.get(d) ?? 0 };
  });
  let streak = 0;
  // Today counts if studied; otherwise the streak may still be alive from yesterday.
  for (let i = perDay.has(ist(new Date())) ? 0 : 1; perDay.has(ist(new Date(Date.now() - i * DAY))); i++) streak++;
  const subjects = new Map<string, number>();
  for (const r of rows) subjects.set(r.subject || 'General', (subjects.get(r.subject || 'General') ?? 0) + r.minutes);
  return {
    totalMinutes: rows.reduce((a, r) => a + r.minutes, 0),
    week,
    streak,
    bySubject: [...subjects.entries()].map(([subject, minutes]) => ({ subject, minutes })).sort((a, b) => b.minutes - a.minutes),
    recent: rows.slice(0, 10).map((r) => ({ id: r.id, subject: r.subject, minutes: r.minutes, completedAt: r.completedAt })),
  };
});

export const POST = route({ module: 'study_tools', action: 'create' }, async (ctx, req) => {
  if (ctx.user.role !== 'STUDENT') throw forbidden('Only students log study sessions.');
  const input = await body(req, z.object({ subject: z.string().trim().max(60).optional().nullable(), minutes: z.number().int().min(1).max(180) }));
  // A session cannot end before it started: at most one 180-minute session per 3 hours of wall-clock time.
  const recent = await ctx.db.studySession.aggregate({ where: { userId: ctx.user.id, completedAt: { gte: new Date(Date.now() - 3 * 3_600_000) } }, _sum: { minutes: true } });
  if ((recent._sum.minutes ?? 0) + input.minutes > 180) throw forbidden('That is more study time than has passed. Take a break!');
  return ctx.db.studySession.create({ data: { schoolId: ctx.user.schoolId, userId: ctx.user.id, subject: input.subject || null, minutes: input.minutes } });
});
