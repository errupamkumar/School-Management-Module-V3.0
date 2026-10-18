import { z } from 'zod';
import { badRequest, body, owned, route } from '@/server/api';

/**
 * Generates a section's weekly timetable from its subject-teacher allocation.
 * Subjects are spread evenly across the week; a teacher already busy in a slot
 * (in another section) is never double-booked. Optional weights let core
 * subjects get more periods.
 */
export const POST = route({ module: 'timetable', action: 'edit' }, async (ctx, req) => {
  const input = await body(req, z.object({ sectionId: z.string().min(1), weights: z.record(z.string(), z.number().int().min(0).max(12)).optional(), replace: z.boolean().default(true) }));
  await owned(ctx.db.section, input.sectionId, 'Section');
  const [assignments, periods] = await Promise.all([
    ctx.db.teacherAssignment.findMany({ where: { sectionId: input.sectionId } }),
    ctx.db.period.findMany({ where: { isBreak: false }, orderBy: { sortOrder: 'asc' } }),
  ]);
  if (!assignments.length) throw badRequest('Allocate subject teachers for this section first (Classes & Subjects → Teacher allocation).');
  if (!periods.length) throw badRequest('Define the school periods first.');
  const days = ctx.school.settings.workingDays;
  const slots = days.flatMap((d) => periods.map((p) => ({ day: d, periodId: p.id })));

  // Build a demand list: each subject repeated by weight (default: an even share of the week).
  const even = Math.floor(slots.length / assignments.length);
  const demand: typeof assignments = [];
  for (const a of assignments) for (let i = 0; i < (input.weights?.[a.subjectId] ?? even); i++) demand.push(a);

  const busy = await ctx.db.timetableEntry.findMany({ where: { employeeId: { in: assignments.map((a) => a.employeeId) }, sectionId: { not: input.sectionId } }, select: { employeeId: true, day: true, periodId: true } });
  const taken = new Set(busy.map((b) => `${b.employeeId}|${b.day}|${b.periodId}`));
  const placed: Array<{ day: number; periodId: string; subjectId: string; employeeId: string }> = [];
  const perDay = new Map<string, number>();
  let unplaced = 0;

  // Round-robin over slots, preferring a subject not yet used that day.
  let cursor = 0;
  for (const slot of slots) {
    let chosen = -1;
    for (let k = 0; k < demand.length; k++) {
      const idx = (cursor + k) % demand.length;
      const a = demand[idx];
      if (taken.has(`${a.employeeId}|${slot.day}|${slot.periodId}`)) continue;
      if ((perDay.get(`${a.subjectId}|${slot.day}`) ?? 0) >= 2) continue;
      chosen = idx;
      break;
    }
    if (chosen === -1) continue;
    const a = demand.splice(chosen, 1)[0];
    cursor = demand.length ? chosen % demand.length : 0;
    placed.push({ day: slot.day, periodId: slot.periodId, subjectId: a.subjectId, employeeId: a.employeeId });
    taken.add(`${a.employeeId}|${slot.day}|${slot.periodId}`);
    perDay.set(`${a.subjectId}|${slot.day}`, (perDay.get(`${a.subjectId}|${slot.day}`) ?? 0) + 1);
    if (!demand.length) break;
  }
  unplaced = demand.length;

  await ctx.db.$transaction(async (tx) => {
    if (input.replace) await tx.timetableEntry.deleteMany({ where: { sectionId: input.sectionId } });
    await tx.timetableEntry.createMany({ data: placed.map((p) => ({ schoolId: ctx.user.schoolId, sectionId: input.sectionId, ...p })), skipDuplicates: true });
  });
  await ctx.audit('UPDATE', 'Timetable', input.sectionId, `Auto-generated ${placed.length} periods (${unplaced} unplaced)`);
  return { placed: placed.length, slots: slots.length, unplaced };
});
